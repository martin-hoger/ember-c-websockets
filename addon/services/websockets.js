import Service from '@ember/service';
import { inject } from '@ember/service';
import { camelize } from '@ember/string';
import { capitalize } from '@ember/string'
import { later, schedule } from '@ember/runloop';

export default Service.extend({

  cookies   : inject(),
  store     : inject(),

  socket        : null,
  socketKey     : null,
  isInitialized : false,
  
  // Start the websockets client.
  start(keys) {
    // Is websockets already initialized.
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;

    if (this.socket) {
      return;
    }
    // Connect to the websockets server.
    keys = keys ? keys : [];
    this.socket = io.connect({
        path       : '/websockets',
        transports : ['websocket'],
        query      : { 'keys': keys.join(',') }
    });
    // Once connected, setup the socket key.
    this.socket.on('connect', () => {
      console.log('Webockets connected');
      this.socketKey = 'socket-' + this.socket.id;
      this.cookies.write('websocket-key', this.socketKey, { path: '/' });
    });
    // Handle events.
    this.socket.onAny((eventName, eventParams) => {
      console.log('Webockets notification recieved');
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
          // console.log(handlerFunction);
          // console.log(eventParams, eventConfig);
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

  //Check the current URLs.
  isUrlMatching(eventConfig, eventParams) {
    var eventUrls  = eventConfig.urls;
    var isMatching = false;

    //URL params are defined.
    if (eventUrls && eventUrls.length) {
      eventUrls.forEach((eventUrl) => {
        if (eventParams.parentModelId) {
          eventUrl = eventUrl.replace(/{{parent-model-id}}/, eventParams.parentModelId);
        }
        if (eventParams.modelId) {
          eventUrl = eventUrl.replace(/{{model-id}}/, eventParams.modelId);
        }
        var actualUrl = window.location.pathname;
        if (actualUrl.match(eventUrl)) {
          //URL is matching.
          isMatching = true;
        }
      });
    } else {
      //URL params are not defined => allowed it.
      isMatching = true;
    }

    return isMatching;
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
  eventModelUpdate(params, eventConfig, callback) {
    var existingObject = this.store.peekRecord(params.modelName, params.modelId)
    this.store.findRecord(params.modelName, params.modelId).then((object) => {
      if (callback) {
        callback(object);
      }
      if (eventConfig.updateParents && !existingObject) {
        eventConfig.updateParents.forEach((parentPath) => {
          var parentObject = object.get(parentPath); 
          if (parentObject) {
            parentObject.pushObject(object);
          }
        });
      }
    }).catch(() => {
      console.log(`Error: Webockets function eventModelUpdate() experienced an error from the backend.`)
    });
  },

  // Handle event: model delete (default)
  eventModelDelete(params, eventConfig, callback) {
    var object = this.store.peekRecord(params.modelName, params.modelId)
    if (object && !object.isDeleted) {
      if (eventConfig.updateParents) {
        eventConfig.updateParents.forEach((parentPath) => {
          object.get(parentPath).removeObject(object);
        });
      }
      object.unloadRecord();
      if (callback) {
        callback(object);
      }

    }
  },

});
