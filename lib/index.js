const {EasierAbstractLevelDOWN} = require('easier-abstract-leveldown'); 
const Zip = require("adm-zip");
class ZipDOWN {

  consturctor(location){
    /**
     * @type Object
     */
    this.location = location;
    this._store = {}
  }
 
  async open() {
    console.log(this);
    this._store = {}
  }
 
  async get(k) {
    const v = this._store[k]
    if (v === undefined)
      throw new Error('NotFound')
    return v
  }
 
  async put(k, v) {
    this._store[k] = v
  }
 
  async del(k) {
    delete this._store[k]
  }
 
  async *iterator(opts) {
    const keys = Object.keys(this._store).sort()
    if (opts.reverse) keys.reverse()
 
    for (const k of keys) {
      yield {
        key: k,
        value: this._store[k]
      }
    }
  }
}
module.exports = (location)=>
  new EasierAbstractLevelDOWN(
    new ZipDOWN(location),
    location
  );