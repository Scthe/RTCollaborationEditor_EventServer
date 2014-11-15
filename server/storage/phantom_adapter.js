'use strict';
/*global config*/

/*
 Execution contexts:
 If we are spawning browser process it seems reasonable that we
 can execute some js inside of the page. But as this code will
 run outside of node we would not have access to node variables
 through closure mechanism. Node server has it's own variables
 and spawned browser can't get nor change them. It gets even
 better since PhantomJS introduces it's own 3rd context into play.
 */

var phridge = require('phridge'),
    util = require('util'),
    baseUrl = util.format('http://localhost:%d/new', config.app_port), // url to new document
    phantomCmdArgs = {},
    phantom,
    jobQueue = [],
    Q = require('q');

phridge.spawn(phantomCmdArgs)
  .then(function (_phantom) {
    console.debug('PhantomJS instance created');
    phantom = _phantom;
    tryExecute();
  });

module.exports = {
  replayEvents: replayEvents
};

/**
 * Sometimes it may try to execute function when PhantomJS
 * has not yet started. By using job queue we can fix that
 */
function tryExecute(f) {
  if (f) {
    jobQueue.push(f);
  }

  // execute first task
  // TODO check if You can execute multiple phantomJS jobs in parallel
  if (phantom) {
    var job = jobQueue.shift();
    if (job) {
      job();
    }
  }
}

//region replayEvents
function replayEvents(lastSnapshot, events, callback) {
  var deferred = Q.defer(),
      f = __replayEvents.bind(undefined, deferred, lastSnapshot, events, callback);
  tryExecute(f);
  return deferred.promise;
}

/**
 *
 * @param deferred
 * @param lastSnapshot text to set text editor's value to
 * @param events list of events since last snapshot
 */
function __replayEvents(deferred, lastSnapshot, events) {
  console.debug('executing PHANTOM job');
  // exec. context: node
//  var deferred = Q.defer();
  phantom.run(baseUrl, lastSnapshot, events, function (url, lastSnapshot, events, resolve) {
    // exec. context: PhantomJS
    /*global webpage*/

    var page = webpage.create();
    page.open(url, function () {
//      page.render('google_home.jpeg', {format: 'jpeg', quality: '100'});

      addPageHandlers(page);

      var html = page.evaluate(function (startDoc, events) {
        // exec. context: browser
        /*global editor, remoteInterface*/
        // TODO contains codemirror specific code

        // set start value
        editor.setValue(startDoc);

        // execute events
        for (var i = 0; i < events.length; i++) {
          remoteInterface.on_operation(events[i]);
        }

        return editor.getValue();

        // END exec. context: browser
      }, lastSnapshot, events);

      // resolve the promise and pass 'html' back to node
      resolve(html);

      function addPageHandlers(page) {
        page.onError = function (msg, trace) {
          var msgStack = ['ERROR: ' + msg];
          if (trace && trace.length) {
            msgStack.push('TRACE:');
            trace.forEach(function (t) {
              msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
            });
          }
          console.error(msgStack.join('\n'));
        };
        page.onConsoleMessage = function (msg, lineNum, sourceId) {
          msg = JSON.stringify(msg);
          console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
        };
      }

    });
    // END exec. context: PhantomJS
    // exec. context: node
  }).then(function (text) {
//    console.log(text);
//    console.log('phantom End: ' + (error ? 'NOT OK' : 'OK'));
//    if (error) {
//      deferred.reject(new Error(error));
//    } else {
    deferred.resolve(text);
//    }
  })
    .catch(console.printStackTrace)
    .done(tryExecute);// execute next call

  /*
   .then(callback) // TODO refactor to call callback in case of error too
   .catch(console.printStackTrace)
   .done(tryExecute);// execute next call
   */
//  return promise;
//  return deferred.promise;
}
//endregion

// TODO register handler onNodeExit -> destroy phantoms
