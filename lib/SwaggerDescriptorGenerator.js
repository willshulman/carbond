var os = require("os");
var o = require('atom').o(module);
var oo = require('atom').oo(module);
var _o = require('bond')._o(module);

/******************************************************************************
 * @class SwaggerDescriptorGenerator
 */
module.exports = oo({

  /**********************************************************************
   * generateSwaggerDescriptor
   */
  generateSwaggerDescriptor: function(service, req) {
    // XXX _hostname? Should we just use default here?
    var host = (service.hostname || os.hostname()) + ":" + service.port

    // if req is present, update host to reflect the client's perspective
    // (e.g., 127.0.0.1 instead of 0.0.0.0)
    if (typeof req !== 'undefined') {
      // XXX: req as passed to a handler by express does not contain a "port"
      //      property... the host header should contain the port
      host = req.get('host')
    }

    var descriptor = {
      "swagger": 2.0,
      "info": {
        "version": "1.0.0", // XXX ?
        "title": service.serviceName || "Service",
        "description": service.description
      },
      "host":  host,
      "basePath": service.apiRoot || '',
      "schemes": ["http"],
      "consumes": ["application/json"],
      "produces": ["application/json"],
      "paths" : this._generateEndpointPaths(service.endpoints, service.path),
      "securityDefinitions": this._generateSecurityDefinitions(service)
    }

    return descriptor
  },

  /**********************************************************************
   * _generateEndpointPaths
   */
  _generateEndpointPaths: function(endpoints, path, result) {
    result = result || {}

    path = path || ""
    if (endpoints) {
      for (var endpointPath in endpoints) {
        this._generateEndpointPath(endpoints[endpointPath], path + "/" + endpointPath, result)
      }
    }

    return result
  },

  /**********************************************************************
   * _generateEndpointPath
   */
  _generateEndpointPath: function(endpoint, path, result) {
    var descriptorPath = this._pathToSwaggerPath(path)
    result[descriptorPath] = this._generatePathDescriptor(endpoint, descriptorPath)
    this._generateEndpointPaths(endpoint.endpoints, path, result)
  },

  /**********************************************************************
   * _generatePathDescriptor
   */
  _generatePathDescriptor: function(endpoint, descriptorPath) {
    var result = {}
    var self = this
    endpoint.supportedMethods().forEach(function(method) {
      if (method === 'options') {
        if (endpoint.service.generateOptionsMethodsInDocs) {
          result[method] = self._generateMethodDescriptor(endpoint, method)
        }
      } else {
        result[method] = self._generateMethodDescriptor(endpoint, method)
      }
    })

    return result
  },

  /**********************************************************************
   * _generateMethodDescriptor
   */
  _generateMethodDescriptor: function(endpoint, method) {
    var result = {
      produces: ["application/json"],
      parameters: this._generateOperationParameters(endpoint, method),
      tags: this._generateEndpointTags(endpoint.path),
      responses: this._generateOperationResponses(endpoint, method)
    }

    return result
  },

  /**********************************************************************
   * _generateOperationParameters
   */
  _generateOperationParameters: function(endpoint, method) {
    var result = []

    // params defined on operation
    var operation = endpoint[method]
    var operationParameters = {}
    if (operation) {
      operationParameters = operation.getAllParameters() || {}
      for (parameterName in operationParameters) {
        var parameter = operationParameters[parameterName]
        var swaggerParameterObject = this._makeSwaggerParamaterObject(parameter)
        result.push(swaggerParameterObject)
      }
    }

    // path params can be auto-generated even if not explicitly defined
    var pathParameters = this._getPathParameters(endpoint.path)
    if (pathParameters) {
      pathParameters.forEach(function(param) {
        var paramName = param.substring(1) // XXX hack
        if (!operationParameters[paramName]) { // only if not defined explicitly
          result.push({
            'name': paramName,
            'description': paramName,
            'in': "path",
            // We can't really do type well here since we allow for non-scalar schemas here
            'required': true, // XXX Check on :id? vs :id support in swagger. Seems they don't support
            'schema': {}
          })
        }
      })
    }
    return result
  },

  /**********************************************************************
   * _makeSwaggerParamaterObject
   */
  _makeSwaggerParamaterObject: function(parameterDefinition) {
    var result = {}

    result.name = parameterDefinition.name
    result.description = parameterDefinition.description
    result.in = parameterDefinition.location
    // XXX: setting schema to {} to make swagger-ui 2.4.1 happy, should probably be removed in the future
    result.schema = {}
    if (parameterDefinition.location === "body") {
      result.schema = parameterDefinition.schema || {}
    } else if (parameterDefinition.schema) {
      var supportedFields = [
        'type',
        'items',
        'format',
        'description',
        'maximum',
        'exclusiveMaximum',
        'minimum',
        'exclusiveMinimum',
        'maxLength',
        'minLength',
        'pattern',
        'maxItems',
        'minItems',
        'uniqueItems',
        'enum'
      ]

      supportedFields.forEach(function (field) {
        result[field] = parameterDefinition.schema[field]
      })
    }

    return result
  },

  /**********************************************************************
   * _generateEndpointTags
   */
  _generateEndpointTags: function(path) {
    var result = []
    var pathArr = path.split('/')
    var tag
    for (var i = 0; i <= pathArr.length; i++) {
      if (i === pathArr.length || pathArr[i][0] === ':') {
        if (pathArr[0] === '') {
          tag = pathArr.slice(0, i).join('/')
        } else {
          tag = [''].concat(pathArr.slice(0, i)).join('/')
        }
        result.push(tag)
        break
      }
    }

    return result
  },

  /**********************************************************************
   * _generateOperationResponses
   */
  _generateOperationResponses: function(endpoint, method) {
    var result = {}

    // params defined on operation
    var operation = endpoint[method]
    if (operation) {
      operation.responses.forEach(function(response) {
        result[response.statusCode.toString()] = {
          description: response.description,
          schema: response.schema || {}
        }
      })
    }

    return result
  },

  /**********************************************************************
   * _pathToSwaggerPath
   */
  _pathToSwaggerPath: function(path) {
    var re = /:(\w+)/g
    return path.replace(re, "{$1}")
  },

  /**********************************************************************
   * _getPathParameters
   */
  _getPathParameters: function(path) {
    var re = /:(\w+)/g
    return path.match(re, "{$1}")
  },

  /**********************************************************************
   * _generateSecurityDefinitions
   */
  _generateSecurityDefinitions: function(service) {
    var definition = null

    if (!service.authenticator) {
      // noop
    } else if (service.authenticator instanceof _o('./security/ApiKeyAuthenticator')) {
      definition = {
        api_key: {
          type: 'apiKey',
          name: service.authenticator.apiKeyParameterName,
          in: service.authenticator.apiKeyLocation
        }
      }
    } else if (service.authenticator instanceof _o('./security/HttpBasicAuthenticator')) {
      definition = {
        basic: {
          type: 'basic'
        }
      }
    }

    return definition
  }

})
