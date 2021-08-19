'use strict';

//
// Class that should contain everything necessary to interact
// with localStorage as a generic key-value store.
// The idea is that authors who want to create an AbstractKeyValueDOWN
// module (e.g. on lawnchair, S3, whatever) will only have to
// reimplement this file.
//

// see http://stackoverflow.com/a/15349865/680742
var nextTick = global.setImmediate || process.nextTick;

// We use admin as storage
var fs = require('fs');
var AdmZip = require('adm-zip');

function callbackify(callback, fun) {
  var val;
  var err;
  try {
    val = fun();
  } catch (e) {
    err = e;
  }
  nextTick(function () {
    callback(err, val);
  });
}

function createPrefix(dbname) {
  return dbname// TODO: escape special chars dbname;
}

function ZipStorageCore(dbname) {
  this._prefix = createPrefix(dbname);
  if(fs.existsSync(this._prefix)){
    this._store = new AdmZip(this._prefix);
  } else {
    this._store = new AdmZip();
    this._store.addZipComment(`Create the : ${new Date()}`)
    this._store.writeZip(this._prefix);
  }
}

ZipStorageCore.prototype.getKeys = function (callback) {
  var self = this;
  callbackify(callback, function () {
    var keys = this._store.getEntries().map(file=>file.entryName);
    keys.sort();
    return keys;
  });
};

ZipStorageCore.prototype.put = function (key, value, callback) {
  var self = this;
  callbackify(callback, function () {
    key = self._prefix+ "/" + key;
    this._store.getEntry(key) != null ? this._store.updateFile(key,value) : this._store.addFile(key,value) ;
  });
};

ZipStorageCore.prototype.get = function (key, callback) {
  var self = this;
  callbackify(callback, function () {
    return this._store.getEntry(key) != null ? this._store.readAsText(key) : undefined;
  });
};

ZipStorageCore.prototype.remove = function (key, callback) {
  var self = this;
  callbackify(callback, function () {
    return this._store.deleteFile(key);
  });
};

ZipStorageCore.destroy = function (dbname, callback) {
  var prefix = createPrefix(dbname);
  callbackify(callback, function () {
    var i = -1;
    var len = this._store.length;
    while (++i < len) {
      var key = this._store.key(i);
      if (key.substring(0, prefix.length) === prefix) {
        this._store.deleteFile(key);
      }
    }
  });
};

module.exports = ZipStorageCore;