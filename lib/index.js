const {exposeLevelDOWN} = require('easier-abstract-leveldown'); 
class ZipDOWN {

  consturctor(){
    /**
     * @type Object
     */
    this._store = {}
  }
 
  async open() {
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
module.exports = exposeLevelDOWN(ZipDOWN);