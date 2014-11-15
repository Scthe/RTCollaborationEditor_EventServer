'use strict';
/*global console, require*/

var util = require('util'),
    sqlite3 = require('sqlite3').verbose(),
    dbFile = 'db_test.db', // TODO change path
    db = new sqlite3.Database(dbFile, function (err) {
      if (err) {
        console.log('database \'' + dbFile + '\' could not be opened');
        console.log(err);
      } else {
        console.log('database \'' + dbFile + '\' was succesfully opened');

        getLastestSnapshot('docA', function (err, rows) {
          if (err) {
            console.log('get#snapshot error');
          } else {
            console.log('get#snapshot ok');
            console.log(rows);
            var row = rows[0];
            // console.log(row.data);
            var snapshot = row.data,
                changeId = row.changeId;

            getEvents('docA', changeId, 2, function (err, rows) {
              if (err) {
                console.log('get#events error');
              } else {
                console.log(rows);
                console.log('-----');
                var json = rows[0].data;
                json = json.replace(/'/g, '"');
                var ch = JSON.parse(json);
                console.log(ch.text);
              }
            });

          }
        });

      }
    });

module.exports = {};

// TODO register handler onNodeExit -> db.close()

function getLastestSnapshot(documentId, callback) {
  // SELECT * FROM `snapshots.docA` ORDER BY `changeId` DESC LIMIT 1;
  var query = 'SELECT * FROM `snapshots.%s` ORDER BY `changeId` DESC LIMIT 1';
  // exec
  query = util.format(query, documentId);
  db.all(query, callback);
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
  db.all(query, params, callback);
}
