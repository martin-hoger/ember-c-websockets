import DS from 'ember-data';
import { inject } from '@ember/service';

let alreadyRun = false;

export default {
  name: 'websockets-modify-store',

  initialize() {
    if (alreadyRun) {
      return;
    }
    alreadyRun = true;

    // Here are modify all the models to set socket-key cookie
    // when saving (works for insert, update, delete).
    // The backend will exclude this tab from websockets notifications.
    DS.Model.reopen({

      websockets : inject(),
      cookies    : inject(),

      save() {
        this._super();
        if (this.get('websockets.socketKey')) {
          this.cookies.write('websocket-key', this.get('websockets.socketKey'), { path: '/' });
        }
      }

    });
  }

};
