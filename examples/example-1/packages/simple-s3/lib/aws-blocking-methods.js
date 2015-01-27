AWS = Npm.require('aws-sdk');

/*
  Code from:
  https://github.com/peerlibrary/meteor-blocking/
  But with correct syntax of .wrapAsync()
*/

// Inside blocking context functions should not be throwing exceptions but
// call callback with first argument an error. Exceptions will not propagate
// and will only be printed to the console.
blocking = function (obj, fun) {
  if (!fun) {
    fun = obj;
    obj = undefined;
  }
  var wrapped = Meteor.wrapAsync(fun);
  var f = function () {
    if (typeof obj === 'undefined') {
      obj = this;
    }
    return wrapped.apply(obj, arguments);
  };
  f._blocking = true;
  return f;
};

var originalDefineMethods = AWS.Service.defineMethods;

AWS.Service.defineMethods = function defineMethods(svc) {
  originalDefineMethods(svc);
  AWS.util.each(svc.prototype.api.operations, function iterator(method) {
    var syncMethod = method + 'Sync';
    if (!svc.prototype[method]) return;
    if (svc.prototype[syncMethod]) return;
    svc.prototype[syncMethod] = blocking(svc.prototype[method]);
  });
};