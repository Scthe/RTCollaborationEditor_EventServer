global.PromiseSync = PromiseSync;

var _ = require('underscore');

var printDebug = false;

function debug(msg) {
  if (printDebug)
    console.log(msg);
}

function PromiseSync(val, err) {
  debug('PromiseSync#create');
  if (err) {
    this.err = err;
  } else {
    this.val = val;
  }
}

PromiseSync.prototype.then = function (f) {
  debug('promise#then');
  if (this.err) {
    debug('propagate error');
    return this;
  }

  try {
    var r = f(this.val);
    if (r instanceof PromiseSync && r.val) {
      r = r.val();
    }
  } catch (e) {
    debug('[CATCH]' + this.e);
    return new PromiseSync({}, e);
  }
  return new PromiseSync(r);
};

PromiseSync.prototype.catch = function (f) {
  debug('promise#catch');
  if (this.err) {
    debug(this.err);
    if (f) {
      f(this.err);
    }
  }
  return this;
};
PromiseSync.prototype.done = function () {
  debug('promise#done');
  if (PromiseSync.doneCallback)
    PromiseSync.doneCallback();
};

PromiseSync.nbind = function (f, f_this) {
  debug('Promise.nbind');
  var ff = _.bind(f, f_this);
  return function () {
    return new PromiseSync(ff);
  };
};

PromiseSync.doneCallback = function () {
};