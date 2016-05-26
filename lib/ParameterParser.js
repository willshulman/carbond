var o = require('atom').o(module);
var oo = require('atom').oo(module);
var _o = require('bond')._o(module);
var _ = require('lodash')
var EJSON = require('mongodb-extended-json')
var ObjectId = require('leafnode').mongodb.ObjectId
var JsonSchemaValidator = require('./JsonSchemaValidator')
var HttpErrors = require('http-errors')

/******************************************************************************
 * @class ParameterParser
 */
module.exports = oo({

  /**********************************************************************
   * _C
   */
  _C: function() {
    this.schemaValidator = new JsonSchemaValidator()
  },

  /**********************************************************************
   * processParameters
   */       
  processParameters: function(req, definitions) {
    var self = this

    req.parameters = {}
    if (definitions) {
      _.forIn(definitions, function(definition) {
        self.processParameter(req, definition)
      })
    }
  },

  /**********************************************************************
   * processParameter
   */
  processParameter: function(req, definition) {
    var result = undefined

     if (!definition.name) {
      throw new Error("Incomplete parameter definition. No name specified for parameter definition " + definition)
    }    

    var datum = undefined
    var name = definition.name
    var location = definition.location
    if (location === "query") {
      datum = req.query[name]
    } else if (location === "path") {
      datum = req.params[name]
    } else if (location === "header") {
      datum = req.header[name]
    } else if (location === "body") {
      datum = req.body
    } else { // XXX formData?
      throw new Error("Unrecognized location value specified for parameter '" + name + "': " + location)
    }

    // Parameters that come in as an empty string should look like undefined
    if (datum === '') {
      datum = undefined
    }

    result = this.processParameterValue(datum, definition)
    req.parameters[name] = result
  },

  /**********************************************************************
   * processParameterValue
   */
  processParameterValue: function(datum, definition) {
    var result = this.parseParameterValue(datum, definition)
    var name = definition.name

    if (definition.required && _.isNil(result)) {
      throw new HttpErrors.BadRequest("Parameter named " + name + " is required")
    }
    
    // Validate against schema with the EJSON Schema validator
    var schema = definition.schema
    if (!_.isNil(result) && schema) {
      // Validate the schema with the EJSON Schema validator
      var schemaValidator = this.schemaValidator
      // This call to EJSON.serialize may be expensive but it is much cleaner. Revisit if 
      // it becomes an issue. Or perhaps we can optimize by only serializing if schema 
      // has EJSON although that might be equally expensive to compute. 
      var validationResult = schemaValidator.validate(EJSON.serialize(result), schema)
      if (!validationResult.valid) {
        throw new HttpErrors.BadRequest("Validation failed for parameter '" + name + "'. Reason: " +
                                         validationResult.error + ". Schema: " +
                                         EJSON.stringify(schema) + ". Value: " +
                                         EJSON.stringify(datum))
      }
    }

    return result
  },

  /**********************************************************************
   * parseParameterValue
   */       
  parseParameterValue: function(datum, definition) {
    var result = undefined

    if (_.isNil(datum) || datum === '') { // empty or undefined or null
      result = definition.default
    } else if (_.isString(datum)) {       // string
      // We explicityly do not take a manifest typing approach as it would be less efficient
      // given the types of exceptions we would like (e.g. ObjectIds as strings and allowing
      // unquoted strings). 

      // If it is a string then use the definition to guide the parsing
      var schema = definition.schema
      if (!schema) { 
        // No schema means we just pass through and assume no processing is desired.
        // Tempting to EJSON.parse here so that ?a=3 results in a number, butu HTTP query strings
        // have no notion of type. All values are strings. I think it is cleaner to not presume
        // anything unless a schema is specified.
       result = datum 
      } else { // There is a schema, which we take to mean you want EJSON support. 
        // ObjectId case. Somewhat of a special case. We want to make these easy
        if (schema.type === 'ObjectId') {
          if (datum[0] === '{') { // parse as EJSON
            result = EJSON.parse(datum)
          } else if (ObjectId.isValid(datum)) { // parse as ObjectId
            result = new ObjectId(datum)
          } else {
            result = datum // This will later fail schema validation but that is not the job of this function
          }
        } else if (schema.type === 'string') { // string case, also special - we want to forgive quoteless strings
          if (! (datum[0] === '"' && datum[datum.length - 1] === '"')) {
            // Will parse "hello" as a string as well as "true" and "99". This is fine since the declared
            // schema type is string. If the declared type is boolean or number it will be parsed as such.
            // One could argue we should still return a boolean or number in these cases but that would 
            // be more expensive to compute and just fail validation later. 
            result = EJSON.parse('"' + datum + '"') 
          } else {
            // We have a quoted string value
            result = EJSON.parse(datum)
          }
        } else { // Just parse as EJSON.
          try {
            result = EJSON.parse(datum)
          } catch (e) {
            throw new Error("Problem parsing parameter value: " + datum + " as EJSON. Reason: " + e.message)
          }
        }
      }
    } else if (_.isObjectLike(datum)) {
      // If it is already an object it must be that the body parser or some other middleware
      // parsed this. In this case just deserialize the EJSON.  **NOTE** Attempts to not use 
      // the body parser did not work out. Everything comes back as {}
      result = EJSON.deserialize(datum)
    } else {
      throw new Error("Unexpected type for parameter value: " + EJSON.stringify(datum)) + " " + (typeof datum)
    }

    // Finally if the definition requires a value and it does not exist raise an Error
    if (definition.required) {
      if (_.isNil(result) || result === '') {
        throw new HttpErrors.BadRequest("Missing required parameter '" + definition.name + "'")
      }
    }

    return result
  },
  
})
                    