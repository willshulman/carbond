var o = require('atom').o(module).main
var _o = require('bond')._o(module)
var __ = require('@carbon-io/fibers').__(module)
var assert = require('assert')
var BSON = require('leafnode').BSON
var carbond = require('../../')

/*******************************************************************************
 * ServiceForMongoDBCollectionTests
 */
module.exports = o({
  _type: carbond.Service,
  
  port: 8888,
  verbosity: 'warn',

  dbUri: "mongodb://localhost:27017/mongodb-collection-tests",
    
  endpoints: {
    // Simple endpoint with Collection operations defined as functions
    zipcodes: o({
      _type: carbond.mongodb.MongoDBCollection,
      collection: 'zipcodes',

      idRequiredOnInsert: true,

      schema: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          state: { type: 'string' }
        },
        additionalProperties: false,
        required: ['_id', 'state']
      },

      querySchema: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          state: { type: 'string' }
        },
        additionalProperties: false
      },

      updateSchema: {
        type: 'object',
        properties: {
          state: { type: 'string' }
        },
        required: ['state'],
        additionalProperties: false
      }
    })
  }
})
