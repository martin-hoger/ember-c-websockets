import Service from '@ember/service';
import { inject } from '@ember/service';

// Npm module socket.io-client didn't work with an older version of Ember. Therefore the library is locally included here.
// Unfortunately with Ember Ocatane, import { io } from './socket.io' didn't work.
import * as ioScript from './socket.io'
// import { io } from "./socket.io";
import { camelize } from '@ember/string';
import { capitalize } from '@ember/string'
import { later, schedule } from '@ember/runloop';

export default Service.extend({

  cookies   : inject(),
  store     : inject(),

  socket    : null,
  socketKey : null,
  
  // Start the websockets client.
  start(keys) {
    if (this.socket) {
      return;
    }
    // Connect to the websockets server.
    keys = keys ? keys : [];
    this.socket = io.connect({
        path       : "/websockets",
        transports : ["websocket"],
        query      : { "keys": keys.join(",") }
    });
    // Once connected, setup the socket key.
    this.socket.on("connect", () => {
      this.socketKey = "socket-" + this.socket.id;
      this.cookies.write('websocket-key', this.socketKey, { path: '/' });
    });
    // Handle events.
    this.socket.onAny((eventName, eventParams) => {
      console.log("Webockets notification recieved");
      var eventConfig = this.getEventConfig(eventName, eventParams);
      if (!eventConfig) {
        console.log(`Error: Webockets event config not found for model name "${eventParams.modelName}".`);
        return;
      }
      if (!this.isUrlMatching(eventConfig, eventParams)) {
        return;
      }
      var handlerFunction = eventConfig.handlerFunction ? eventConfig.handlerFunction : this.getHandlerFunction(eventName, eventParams);
      if (handlerFunction) {
        schedule('afterRender', () => {
          console.log(handlerFunction);
          console.log(eventParams, eventConfig);
          this[handlerFunction](eventParams, eventConfig);
        });
      } else {
        console.log(`Error: Webockets handler for event name "${eventName}" was not found.`);
      }
    });

  },

  // Find the model config.
  getEventConfig(eventName, eventParams) {
    //TODO search by "event name", after "model name" if defiend.
    var eventConfig = this.eventConfigs.findBy('modelName', eventParams.modelName);

    return eventConfig;
  },

  // Check the current URL.
  isUrlMatching(eventConfig, eventParams) {
    // TODO check the URL here eventConfig.url if defined
    console.log(window.location.pathname);
    return true;
  },

  // Get function that would handle this event (or model).
  //
  // For inst:
  //  * eventModelUpdateStudyImage()
  //  * eventModelUpdate()
  //
  getHandlerFunction(eventName, eventParams) {
    var functionName;
    var handlerFunctions = [];
    if (eventParams.modelName) {
      handlerFunctions.push('event' + capitalize(camelize(eventName)) + capitalize(camelize(eventParams.modelName)));
    }
    handlerFunctions.push('event' + capitalize(camelize(eventName)));
    handlerFunctions.every((item) => {
      if (this[item]) {
        functionName = item;
        return false;
      }
      return true;
    });

    return functionName;
  },
  
  // Handle event: model update (default)
  eventModelUpdate(params, eventConfig) {
    var existingObject = this.store.peekRecord(params.modelName, params.modelId)
    this.store.findRecord(params.modelName, params.modelId).then((object) => {
      if (eventConfig.updateParents && !existingObject) {
        eventConfig.updateParents.forEach((parentPath) => {
            object.get(parentPath).pushObject(object);
        });
      }
    }).catch(() => {
      console.log(`Error: Webockets function eventModelUpdate() experienced an error from the backend.`)
    });
  },

  // Handle event: model delete (default)
  eventModelDelete(params, eventConfig) {
    console.log("unload");
    var object = this.store.peekRecord(params.modelName, params.modelId)
    if (object && !object.isDeleted) {
      if (eventConfig.updateParents) {
        eventConfig.updateParents.forEach((parentPath) => {
          object.get(parentPath).removeObject(object);
        });
      }
      object.unloadRecord();
    }
  },

});
