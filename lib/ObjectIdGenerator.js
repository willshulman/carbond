var ObjectId = require('leafnode').mongodb.ObjectId
var o = require('atom').o(module)
var oo = require('atom').oo(module)
var _o = require('bond')._o(module)

/******************************************************************************
 * @class ObjectIdGenerator
 */
module.exports = oo({
  
  /**********************************************************************
   * _type
   */
  _type: './IdGenerator',

  /**********************************************************************
   * _C
   */
  _C: function() {
    this.generateStrings = false
  },

  /**********************************************************************
   * generateId
   */     
  generateId: function() {
    var result = new ObjectId()
    if (this.generateStrings) {
      result = result.toString()
    }
   
    return result
  }
  
})

