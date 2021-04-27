/*jshint node:true*/
module.exports = {
  name: 'ember-c-websockets',

  isDevelopingAddon: function() {
    return true;
  },

  contentFor: function(type) {
    if (type === 'head') {
      return '<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.0.1/socket.io.min.js" crossorigin="anonymous"></script>';
    }
  },

  included: function(app, parentAddon) {
    // app.import('./lib/ember-c-websockets/socket.io.min.js');
    var target = (parentAddon || app);
    target.options = target.options || {};
    target.options.babel = target.options.babel || { includePolyfill: true };
    return this._super.included.apply(this, arguments);
  }
};
