/*jshint node:true*/
module.exports = {
  name: 'ember-c-websockets',

  isDevelopingAddon: function() {
    return true;
  },

  contentFor: function(type) {
    if (type === 'head') {
      return '<script src="https://cdn.socket.io/4.0.1/socket.io.min.js" integrity="sha384-LzhRnpGmQP+lOvWruF/lgkcqD+WDVt9fU3H4BWmwP5u5LTmkUGafMcpZKNObVMLU" crossorigin="anonymous"></script>';
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
