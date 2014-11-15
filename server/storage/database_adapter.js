'use strict';
/*global console, require*/

var util = require('util'),
    Q = require('q'),
    sqlite3 = require('sqlite3').verbose(),
    dbFile = 'test/db_test.db',
    _db = new sqlite3.Database(dbFile, onDbOpen);

// temporary database object used till the normal database is not operational
var db = {
  jobQueue: [],
  all     : tmpDbAll
};

module.exports = {
  getLastestSnapshot: getLastestSnapshot,
  getEvents         : getEvents
};

// TODO register handler onNodeExit -> db.close()

function onDbOpen(err) {
  if (err) {
    console.log('database \'' + dbFile + '\' could not be opened');
    console.log(err);
  } else {
    console.log('database \'' + dbFile + '\' was succesfully opened');
    // now, as we took hold off regular database execute all
    // previously scheduled calls
    var callsToMake = db.jobQueue;
    db = _db;
    for (var i = 0; i < callsToMake.length; i++) {
      callsToMake[i](db);
    }
  }
}

function getLastestSnapshot(documentId, callback) {
  // SELECT * FROM `snapshots.docA` ORDER BY `changeId` DESC LIMIT 1;
  var query = 'SELECT * FROM `snapshots.%s` ORDER BY `changeId` DESC LIMIT 1';
  // exec
  query = util.format(query, documentId);
//  console.debug(query);
  db.all(query, {}, callback);
}

function getEvents(documentId, changeIdFrom, changeIdTo, callback) {
  // SELECT * FROM `events.docA` where `changeId` > 0 ORDER BY `rowid` ASC;
  var query = 'SELECT * FROM `events.%s` WHERE `changeId` > $changeIdFrom AND `changeId` < $changeIdTo ORDER BY `changeId` ASC;';
  var params = {
    $changeIdFrom: changeIdFrom,
    $changeIdTo  : changeIdTo
  };
  // exec
  query = util.format(query, documentId);
//  console.debug(query);
  db.all(query, params, callback);
}

/**
 * Executed before db connection is stabilised
 * @returns {Promise.promise|*}
 */
function tmpDbAll() {
  /* jshint -W040 */
  var deferred = Q.defer(),
      args = arguments;

  this.jobQueue.push(function (db) {
//    console.log('call from job queue');
//    console.log(args);
//    console.log(args[1]);
    db.all.apply(db, args);
  });
  return deferred.promise; // TODO this does not seem to be ok
}