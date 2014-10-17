global.PromiseSync = PromiseSync;

// TODO rename to something cool f.e. APromiseOfSync ? ( like in 'A Dream of Spring' kind of thing)

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

  // do not execute if some error happened - propagate the error instead
  if (this.err) {
    debug('propagate error');
    return this;
  }

  try {
    // dirty hack, used f.e. in nbind
    if (this.preExecute && _.isFunction(this.val)) {
      this.val = this.val();
    }

    // execute
    var r = f(this.val);

    // execute as long as returned value is a promise
    while (r instanceof PromiseSync && r.val) {
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
  if (PromiseSync.doneCallback) {
    process.nextTick(PromiseSync.doneCallback);
  }
};

// TODO I'm not sure but shouldn't f.e. PromiseSync.nbind use process#nextTick ?
// ( That should make writing tests less order dependent,
// so we could call the function that uses promises
// and in the next line of test we could set the PromiseSync.doneCallback
// knowing that the promises will start being executed
// AFTER the function describing the test have finished)
PromiseSync.nbind = function (f, f_this) {
  debug('Promise.nbind');
  return function () {
    // problem we are trying to solve here is to call provided function
    // with the same arguments as were originally provided
    var args = _.values(arguments);
    var promise = new PromiseSync(function () {
      return f.apply(f_this, args);
    });
    promise.preExecute = true;
    return promise;
  };
};

PromiseSync.doneCallback = function () {
};