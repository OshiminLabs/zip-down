/**
 * Callback for adding two numbers.
 *
 * @callback ZipDownFileReader
 * @param {String} location - File location.
 * 
 * @returns {Buffer} - File content readed
 */

/**
 * Callback for adding two numbers.
 *
 * @callback ZipDownFileWriter
 * @param {String} location - File location.
 * @param {Buffer} buffer - File content to write.
 * 
 * @returns {void}
 */

/**
 * @typedef ExtDef
 * @type {Object}
 * @property {String} ext - extension.
 * @property {ZipDownFileReader?} read - A callback to run.
 * @property {ZipDownFileWriter?} write - A callback to run.
 */
/**
 * @typedef ExtProcessorOptions
 * @type {Object}
 * @property {String?} ext - extension.
 * @property {ZipDownFileReader?} read - A callback to run.
 * @property {ZipDownFileWriter?} write - A callback to run.
 */
/**
 * @constant 
 * @type {String}
 * @default
 */
const ALL_EXT = "*";
const {
  EasierAbstractLevelDOWN
} = require('easier-abstract-leveldown');
const Zip = require("adm-zip");
const fs = require("fs");
if (typeof (String.prototype.localeCompare) === 'undefined') {
  String.prototype.localeCompare = function (str, locale, options) {
    return ((this == str) ? 0 : ((this > str) ? 1 : -1));
  };
}
var strcmp = Intl && Intl.Collator ? new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base'
}).compare : (str, str1) => str.localeCompare(str1);
var CACHE = {};
class ZipDOWN {
  /**
   * 
   * @param {String} location 
   */
  constructor(location) {
    /**
     * @type String
     */
    this.location = location;

  }
  /**
   * 
   * @param {String} k
   *  
   * @returns String
   */
  setName(k) {
    return k.replace(/\xFF/, "/").replace(/\xFF/, "/");
  }
  async open() {
    let file = this.location.match(new RegExp(`(.+\.)(${ZipDOWN.ext})(#(.+))?$`, 'i'));
    console.log("OPEN", file)
    if (file && file[4] && file[1] && file[2]) {
      this.location = file[1] + file[2];
      this.ext = file[3];
      file = file[4];
    } else if (file && file[1] && file[2]) {
      this.location = file[1] + file[2];
      this.ext = file[3];
      file = "default";
    } else throw new Error('Unable to open file');
    console.log("OPEN", file, this.location);
    this._rootPath = file;
    if (CACHE[this.location]) {
      this._store = CACHE[this.location];
    } else {
      if (fs.existsSync(this.location)) {
        let buffer = (ZipDOWN.openFile[this.ext] || ZipDOWN.openFile[ALL_EXT] || (() => {}))(this.location);
        this._store = new Zip(Buffer.isBuffer(buffer) ? buffer : this.location);
      } else {
        this._store = new Zip();
      }
      CACHE[this.location] = this._store;
    }
    this._keysCache = this._store.getEntries().map(a => a.entryName)
    this._keysCache.sort();
  }

  async get(k) {
    const v = this._store.getEntry(this._rootPath + this.setName(k))
    if (v === null)
      throw new Error('NotFound')
    return v.getData()
  }

  async put(k, v) {
    k = this._rootPath + this.setName(k);
    const entry = this._store.getEntry(k)
    if (entry === null) {
      let index = this._keysCache.findIndex(name => k.substr(0, name.length) == name);
      if (index > -1) throw new Error('Conflict');
      this._store.addFile(k, v);
      this._keysCache.push(k);
      this._keysCache.sort();
    } else
      entry.setData(v);
    setImmediate(() => {
      let writeFn = (ZipDOWN.writeFile[this.ext] || ZipDOWN.writeFile[ALL_EXT] || false);
      if (writeFn)
        writeFn(this.location, this._store.toBuffer());
      else
        this._store.writeZip(this.location);
    });
  }

  async del(k) {
    k = this._rootPath + this.setName(k);
    this._store.deleteFile(k);
    setImmediate(() => this._store.writeZip(this.location));
    let index = this._keysCache.findIndex(name => k == name);
    if (index > -1) {
      delete this._keysCache[index];
    }
  }

  async *iterator(opts) {
    const keys = this._store.getEntries().sort((a, b) => strcmp(a.entryName, b.entryName))
    if (opts.reverse) keys.reverse()

    for (const k of keys) {
      if (k.entryName.substr(0, this._rootPath.length) == this._rootPath) yield {
        key: k.entryName
          .replace(this._rootPath, "")
          .replace("/", "\xFF")
          .replace("/", "\xFF"),
        value: k.getData()
      }
    }
  }
}
ZipDOWN.ext = "zip";

/**
 * @type {Object.<string, ZipDownFileReader>}
 */
ZipDOWN.openFile = {};

/**
 * @type {Object.<string, ZipDownFileWriter>}
 */
ZipDOWN.writeFile = {};

/**
 * @param {(ExtProcessorOptions|ExtDef)} options - options.
 * @param {boolean} checkExt - check if ext exist.
 */
let _addExt = ({
  ext,
  read,
  write
}, checkExt = false) => {
  if (ext && (!checkExt || (checkExt && ext.match(new RegExp(`^(${ZipDOWN.ext})$`, 'i'))))) {
    if (read) ZipDOWN.openFile[ext] = read;
    if (write) ZipDOWN.writeFile[ext] = write;
  } else if (!ext) {
    if (read) ZipDOWN.openFile[ALL_EXT] = read;
    if (write) ZipDOWN.writeFile[ALL_EXT] = write;
  }
}

var ret = (location) =>
  new EasierAbstractLevelDOWN(
    new ZipDOWN(location),
    location
  );
/**
 * @param {(ExtDef[]|String[])} ext - options.
 * @param {boolean} replace - replace with ext.
 */
 let _setExtensions = (ext,replace=false) => {
   let _extName = ext=>ext.ext.replace(/[^a-z0-9_\-]/g, "");
  ZipDOWN.ext = (replace ? "" : ZipDOWN.ext ) + ext.filter(ext => (ext.ext && _extName(ext.ext)) || (typeof ext == 'string' && _extName(ext)) ).map(ext => {
    _addExt(typeof ext=='string' ? {ext} : ext);
    return _extName(typeof ext=='string' ? ext : ext.ext)
  }).join("|");
  return ret;
}
  /**
 * @param {...(ExtDef|String)} ext - options.
 */
ret.setExtensions = (...ext) => _setExtensions(ext);
/**
 * @param {...(ExtDef|String)} ext - options.
 */
ret.addExtension = (...ext) => _setExtensions(ext, true);


/**
 * @param {ExtProcessorOptions} options - options.
 */
ret.extProcessor = function (options) {
  _addExt(options, true);
  return ret;
}
module.exports = ret;