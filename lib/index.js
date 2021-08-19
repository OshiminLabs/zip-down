  const {EasierAbstractLevelDOWN} = require('easier-abstract-leveldown'); 
  const Zip = require("adm-zip");
  const fs = require("fs");
  if (typeof(String.prototype.localeCompare) === 'undefined') {
    String.prototype.localeCompare = function(str, locale, options) {
      return ((this == str) ? 0 : ((this > str) ? 1 : -1));
    };
  }
  var strcmp = Intl && Intl.Collator ? new Intl.Collator(undefined, {numeric:true, sensitivity:'base'}).compare : (str,str1)=>str.localeCompare(str1);
  class ZipDOWN {
    /**
     * 
     * @param {String} location 
     */
    constructor(location){
      /**
       * @type String
       */
      this.location = location;

    }
  
    async open() {
      let file = this.location.match(new RegExp(`(.+\.)(${ZipDOWN.ext})(#(.+))?$`,'i'));
      if(file && file[4] && file[1] && file[2]){
        file = file[4];
        this.location = file[1]+file[2];
      }else if(file && file[1] && file[2]){
        this.location = file[1]+file[2];
        file = "default";
      } else throw new Error('Unable to open file');
      this._rootPath = file;
      if(fs.existsSync(this.location)){
        this._store = new Zip(this.location);
      }else{
        this._store = new Zip();
      }
    }
  
    async get(k) {
      const v = this._store.getEntry(this._rootPath+"/"+k)
      if (v === null)
        throw new Error('NotFound')
      return JSON.parse(v.getData())
    }
  
    async put(k, v) {
      k = this._rootPath+"/"+k;
      v = JSON.stringify(v);
      const entry = this._store.getEntry(k)
      if (entry === null)
        this._store.addFile(k,v);
      else
        entry.setData(v);
      setImmediate(()=>this._store.writeZip(this.location));
    }
  
    async del(k) {
      k = this._rootPath+"/"+k;
      this._store.deleteFile(k);
      setImmediate(()=>this._store.writeZip(this.location));
    }
  
    async *iterator(opts) {
      const keys = this._store.getEntries().sort((a, b) => strcmp(a.entryName,b.entryName))
      if (opts.reverse) keys.reverse()
  
      for (const k of keys) {
        if(k.entryName.substr(0,this._rootPath.length) == this._rootPath) yield {
            key: k.entryName.replace(this._rootPath+"/",""),
            value: k.getData()
          }
      }
    }
  }
  ZipDOWN.ext = "zip";
  var ret = (location)=>
    new EasierAbstractLevelDOWN(
      new ZipDOWN(location),
      location
    );
  ret.setExtension = ext => ZipDOWN.ext = ext.toString().replace(/[^a-z0-9_\-|]/g,"");
  module.exports = ret;