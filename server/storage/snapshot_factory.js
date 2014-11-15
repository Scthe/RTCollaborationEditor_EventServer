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
    Q = require('q');

function SnapshotFactory(clientData) {
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

  var lastestSnapshot = getLastestSnapshot(),
      events = getChangesSinceSnapshot(50, lastestChangeIdToConsider);
  phantomAdapter.replayEvents(lastestSnapshot.data, events, function (html) {
    console.log('--->' + html);
  });
}


function getLastestSnapshot() {
  var value = 'aaaa\nbbbb\ncccc\ndddd';

  return {
    changeId: 51,
    data    : value
  };
}

function getChangesSinceSnapshot(changeIdFrom, changeIdTo) {
  var ch1 = {
    changeId  : changeIdFrom + 1,
    'data'    : {
      'canceled': true,
      'from'    : {'line': 2, 'ch': 1, 'xRel': 1},
      'to'      : {'line': 2, 'ch': 1, 'xRel': 1},
      'text'    : ['a'],
      'origin'  : '+input',
      'removed' : ['']
    },
    'username': 780
  };

  return [ch1];
}

function applyChanges(snapshot, changes) {

}
