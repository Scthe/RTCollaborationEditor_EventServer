'use strict';

/*
 Storage plan:
 * on last-client-left-document
 * - CREATE SNAPSHOT
 * --> read last snapshot
 * --> replay events ( from db) in phantom on top of snapshot
 *
 * on user-join
 * - start recording current events client-side
 * - CREATE SNAPSHOT
 * - send snapshot HTML to client
 * - fill event timeline gaps
 * - play events that happened from snapshot creation to now
 */

var phantomAdapter = require('./phantom_adapter'),
    databaseAdapter = require('./database_adapter'),
    Q = require('q');

function SnapshotFactory(clientData) {
  this.clientData = clientData;
}

SnapshotFactory.prototype = {
  buildSnapshot: buildSnapshot
};

module.exports = SnapshotFactory;


/**
 * Get last created snapshot and replay events since on top of it.
 * Execute events inside phantom.js instance.
 *
 * Used in following scenarios:
 * - create document snapshot when last user leaves the document
 * to speed up the document opening
 * - create current version of the document when the new user joins
 * and the last snapshot is obsolete by the changes done during
 * current edit session
 *
 * returns object with following properties:
 * - changeId - last replayed change id
 * - data - HTML code
 */
function buildSnapshot(lastestChangeIdToConsider, callback) {
  /* jshint -W040 */ // binded to SnapshotFactory object

  console.log('buildSnapshot');

  this.lastestChangeIdToConsider = lastestChangeIdToConsider;
  this.docId = 'docA';

  var firstStep = databaseAdapter.getLastestSnapshot.bind(this, this.docId),
      getLastestSnapshot = Q.denodeify(firstStep),
      _getChangesSinceSnapshot = getChangesSinceSnapshot.bind(this),
      _applyChanges = applyChanges.bind(this);

  getLastestSnapshot()
    .then(_getChangesSinceSnapshot)
    .then(_applyChanges)
    .then(function (data) {
      console.log('--->' + data);
    })
    .catch(console.printStackTrace)
    .done(function () {
      console.info('done');
    });
}

function getChangesSinceSnapshot(data) {
  /* jshint -W040 */
  if (data.length !== 1) {
    throw new Error('There should be 1 snapshot');
  }

  // read snapshot
  this.snapshot = data[0].data.replace(/\\n/g, '\n'); // TODO codemirror specific code;
//  console.log(this.snapshot);

  // prepare for reading of changes from db
  var baseChangeId = data[0].changeId,
      nextStep = databaseAdapter.getEvents.bind(undefined, this.docId, baseChangeId, this.lastestChangeIdToConsider),
      getEvents = Q.denodeify(nextStep);
  return getEvents();
}

function applyChanges(data) {
  /* jshint -W040 */

  // read events
  this.events = data.map(function (e) {
    var json = e.data.replace(/'/g, '"');
    return {
      changeId: e.changeId,
      username: e.clientId,
      data    : JSON.parse(json)
    };
  });

//  phantomAdapter.replayEvents(this.snapshot, this.events, function (html) {
//    console.log('--->' + html);
//    console.info('done2');
//  });


//  var nextStep = phantomAdapter.replayEvents.bind(undefined, this.snapshot, this.events),
//      f = Q.denodeify(nextStep);
//  return f();
  return phantomAdapter.replayEvents(this.snapshot, this.events);
}