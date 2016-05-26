var o = require('atom').o(module)
var _o = require('bond')._o(module)
var __ = require('fiber').__.main(module)
var assert = require('assert')
var ObjectId = require('leafnode').mongodb.ObjectId
var BSON = require('leafnode').BSON
var EJSON = require('mongodb-extended-json')
var carbond = require('../')
var assertRequests = require('./test-helper').assertRequests

/*******************************************************************************
 * parameter parsing tests
 */
var parser = o({
  _type: '../lib/ParameterParser',
})

var tests = [
  {
    datum: undefined, 
    definition: {
      name: 'x',
      schema: { type: 'Undefined' }
    },
    result: undefined
  },

  {
    datum: '{ "$undefined": true }', 
    definition: {
      name: 'x',
      schema: { type: 'Undefined' }
    },
    result: undefined
  },

  {
    datum: undefined,
    definition: {
      name: 'x',
      schema: { type: 'number' },
      default: 2
    },
    result: 2
  },

  {
    datum: '',
    definition: {
      name: 'x',
      schema: { type: 'number' },
      default: 2
    },
    result: 2
  },

  {
    datum: null, // XXX I think this is right but might interact strangely with qs parser so revisit this
    definition: {
      name: 'x',
      schema: { type: 'number' },
      default: 2
    },
    result: 2
  },

  {
    datum: "null",
    definition: {
      name: 'x',
      schema: { type: 'null' },
    },
    result: null
  },

  {
    datum: 3,
    definition: {
      name: 'x',
      schema: { type: 'number' }
    },
    error: true // should error since 3 is not a string
  },

  {
    datum: '3',
    definition: {
      name: 'x',
      schema: { type: 'number' }
    },
    result: 3
  },

  {
    datum: '3',
    definition: {
      name: 'x',
      schema: undefined
    },
    result: '3' // if no schema we do not do any conversions
  },

  {
    datum: '"3"',
    definition: {
      name: 'x',
      schema: { type: 'string' }
    },
    result: "3"
  },

  {
    datum: 'true',
    definition: {
      name: 'x',
      schema: { type: 'boolean' } 
    },
    result: true
  },

  {
    datum: 'hello',
    definition: {
      name: 'x',
      schema: { type: 'string'} 
    },
    result: "hello"
  },

  {
    datum: '"hello"',
    definition: {
      name: 'x',
      schema: { type: 'string'} 
    },
    result: "hello"
  },

  {
    datum: '{ "a": 1 }',
    definition: {
      name: 'x',
      schema: { type: 'object'} 
    },
    result: { a:1 }
  },

  {
    datum: '[{ "a": 1 }]',
    definition: {
      name: 'x',
      schema: { type: 'array'} 
    },
    result: [{ a:1 }]
  },

  {
    datum: '{ "$date": "1970-01-01T00:00:00.000Z" }',
    definition: {
      name: 'x',
      schema: { type: 'Date'} 
    },
    result: new Date(0)
  },

  {
    datum: '{ "$oid": "57394f46d1236fa5367749e9" }',
    definition: {
      name: 'x',
      schema: { type: 'ObjectId'} 
    },
    result: new ObjectId("57394f46d1236fa5367749e9")
  },

  {
    datum: '57394f46d1236fa5367749e9',
    definition: {
      name: 'x',
      schema: { type: 'ObjectId'} 
    },
    result: new ObjectId("57394f46d1236fa5367749e9")
  },

]

function runTests() {
  var value
  var definition
  tests.forEach(function(test) {
    value = undefined
    definition = undefined
    definition = o(test.definition, '../lib/OperationParameter')
    if (test.error) {
      assert.throws(function() {
        value = parser.parse(test.datum, definition)
      })
    } else {
      try {
        value = parser.processParameterValue(test.datum, definition)
      } catch (e) {
        throw new Error("Error during test " + EJSON.stringify(test) + ". " + e)
      }
      assert.deepEqual(test.result, value, EJSON.stringify(test))
      assert.deepEqual(typeof(test.result), typeof(value), EJSON.stringify(test))
    }
  })
}

runTests()

