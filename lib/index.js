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
const Zip = require("jszip");
const fs = require("fs");
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
  _setName(k) {
    return k.replace(/\xFF/, "/").replace(/\xFF/, "/");
  }
  _writeZipFile(){
    setImmediate(async () => {
      let buffer = await this._store.generateAsync({type:"nodebuffer"});
      (
        ZipDOWN.writeFile[this.ext] || 
        ZipDOWN.writeFile[ALL_EXT] || 
        /**
         * @type {ZipDownFileWriter}
         */
        ((location, buffer)=>{
          fs.writeFile(location,buffer, function(err){
            err && console.error(err);
          })
        }))(this.location, buffer);
    });
  }
  async open() {
    let file = this.location.match(new RegExp(`(.+\.)(${ZipDOWN.ext})(#(.+))?$`, 'i'));
    console.log("OPEN", file,this.location, new RegExp(`(.+\.)(${ZipDOWN.ext})(#(.+))?$`, 'i'))
    if (file && file[4] && file[1] && file[2]) {
      this.location = file[1] + file[2];
      this.ext = file[2];
      file = file[4];
    } else if (file && file[1] && file[2]) {
      this.location = file[1] + file[2];
      this.ext = file[2];
      file = "default";
    } else throw new Error('Unable to open file');
    this._rootPath = file;
    console.log("OPEN END",fs.existsSync(this.location), this._rootPath, this.location,this.ext, ZipDOWN.openFile, ZipDOWN.writeFile);
    if (CACHE[this.location]) {
      this._store = CACHE[this.location];
    } else {
      this._store = new Zip();
      if (fs.existsSync(this.location)) {
        let bufferFn =  (ZipDOWN.openFile[this.ext] || ZipDOWN.openFile[ALL_EXT] || ((location) => fs.readFileSync(location)));
        console.log("READER", bufferFn);
        await this._store.loadAsync(await bufferFn(this.location));
      }
      CACHE[this.location] = this._store;
    }
    this._keysCache = Object.keys(this._store.files)
    this._keysCache.sort();
  }

  async get(k) {
    const v = this._store.file(this._rootPath + this._setName(k))
    if (v === null)
      throw new Error('NotFound')
    return v.async("nodebuffer")
  }

  async put(k, v) {
    k = this._rootPath + this._setName(k);
    const entry = this._store.file(k)
    if (entry === null) {
      let index = this._keysCache.findIndex(name => k.substr(0, name.length) == name);
      if (index > -1) throw new Error('Conflict');
      this._store.file(k, v);
      this._keysCache.push(k);
      this._keysCache.sort();
    } else
      this._store.file(k,v);
    this._writeZipFile();
  }

  async del(k) {
    k = this._rootPath + this._setName(k);
    this._store.remove(k);
    setImmediate(() => this._store.writeZip(this.location));
    let index = this._keysCache.findIndex(name => k == name);
    if (index > -1) {
      delete this._keysCache[index];
    }
    this._writeZipFile();
  }

  async *iterator(opts) {
    const keys = Object.keys(this._store.files)
    if (opts.reverse) keys.reverse()

    for (const k of keys) {
      let value = this._store.file(k);
      if (value && k.substr(0, this._rootPath.length) == this._rootPath) yield {
        key: k
          .replace(this._rootPath, "")
          .replace("/", "\xFF")
          .replace("/", "\xFF"),
        value: await value.async("nodebuffer")
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
   let _extName = ext=>ext.replace(/[^a-z0-9_\-]/g, "");
  ZipDOWN.ext = (replace ? "" : (ZipDOWN.ext+"|") ) + ext.filter(ext => (ext.ext && _extName(ext.ext)) || (typeof ext == 'string' && _extName(ext)) ).map(ext => {
    _addExt(typeof ext=='string' ? {ext} : ext);
    return _extName(typeof ext=='string' ? ext : ext.ext);
  }).join("|");
  return ret;
}
  /**
 * @param {...(ExtDef|String)} ext - options.
 */
ret.setExtensions = (...ext) => _setExtensions(ext, true);
/**
 * @param {...(ExtDef|String)} ext - options.
 */
ret.addExtension = (...ext) => _setExtensions(ext);


/**
 * @param {ExtProcessorOptions} options - options.
 */
ret.extProcessor = function (options) {
  _addExt(options, true);
  return ret;
}
module.exports = ret;