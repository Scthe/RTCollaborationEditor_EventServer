'use strict';

global.PromiseSync = PromiseSync;

// TODO rename to something cool f.e. APromiseOfSync ? ( like in 'A Dream of Spring' kind of thing)

var _ = require('underscore');

var printDebug = false;

function debug(msg) {
  if (printDebug) {
    console.log(msg);
  }
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

  var promise;
  try {
    // execute
    var r = f(this.val);

    // execute as long as returned value is a promise
    while (r instanceof PromiseSync) {
      while (r instanceof PromiseSync && _.isFunction(r.val)) {
        r = r.val();
      }
      r = r.val;
    }
    promise = new PromiseSync(r);
  } catch (e) {
    debug('[CATCH]' + this.e);
    promise = new PromiseSync(undefined, e);
  }

  return promise;
};

PromiseSync.prototype.catch = function (f) {
  debug('promise#catch');
  if (this.err) {
    debug(this.err.stack);
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
  debug('PromiseSync.nbind');
  return function () {
    // problem we are trying to solve here is to call provided function
    // with the same arguments as were originally provided
    var args = _.values(arguments);

    try {
      var r = f.apply(f_this, args);
      return new PromiseSync(r);
    } catch (e) {
      return new PromiseSync(undefined, e);
    }
  };
};

PromiseSync.denodeify = function (f) {
  debug('PromiseSync.denodeify');
  if (!f) {
    throw new Error('Called PromiseSync.denodeify with undefined function as argument');
  }
  return function () {
    var args = _.values(arguments);
    args.push(callback);
    try {
      var r = f.apply(undefined, args); // TODO binds 'this' as undefined !
      return new PromiseSync(r);
    } catch (e) {
      return new PromiseSync(undefined, e);
    }
  };
  function callback(err, data) {
    return err ? new PromiseSync(undefined, err) : new PromiseSync(data);
  }
};

PromiseSync.doneCallback = function () {
};

PromiseSync.reset = function () {
  PromiseSync.doneCallback = function () {
  };
};