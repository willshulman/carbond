var o  = require('atom').o(module).main
var oo  = require('atom').oo(module)
var _o = require('bond')._o(module)
var __ = require('@carbon-io/fibers').__(module)
var testtube = require('test-tube')

/**************************************************************************
 * All tests
 */
module.exports = o({

  /**********************************************************************
   * _type
   */
  _type: testtube.Test,

  /**********************************************************************
   * name
   */
  name: "Carbond tests",

  /**********************************************************************
   * tests
   */
  tests: [
    _o('./AclTests'),
    _o('./IdGeneratorTests'),
    _o('./StartStopTests'),
    _o('./ParameterParsingTests'),
    _o('./BasicEndpointTests'),
    _o('./BasicCollectionTests'),
    _o('./MongoDBCollectionTests'),
  ],
})
