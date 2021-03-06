var o  = require('atom').o(module)
var oo  = require('atom').oo(module)
var _o = require('bond')._o(module)
var __ = require('@carbon-io/fibers').__(module)
var tt = require('test-tube')
var assert = require('assert')
var ObjectId = require('ejson').types.ObjectId
var carbond = require('../')

/**************************************************************************
 * StartStopTests
 */
module.exports = o.main({

  /**********************************************************************
   * _type
   */
  _type: tt.Test,

  /**********************************************************************
   * name
   */
  name: "StartStopTests",

  /**********************************************************************
   * doTest
   */
  doTest: function(done) {
    syncTest()
    asyncTest1(function(err1) {
      if (err1) { console.log(err1) }
      asyncTest2(function(err2) {
        if (err2) { console.log(err2) }
        asyncTest3(function(err3) {
          if (err3) { console.log(err3) }
          done()
        })
      })
    })
  }
})

/*******************************************************************************
 * syncTest
 */
function syncTest() {
  var service = o({
    _type: carbond.Service,
    
    verbosity: 'warn',

    doStart: function() {
      this._started = true
    },

    doStop: function() {
      this._started = false
    }

  })

  try {
    // Start the server
    service.start()
    assert(service._started)

    // Stop the server
    service.stop()
    assert(!service._started)
  } catch (e) {
    console.log(e.message)
    console.log(e.stack)
    service.stop()
  }
  
}

/*******************************************************************************
 * asyncTest1
 */
function asyncTest1(done) {
  var service = o({
    _type: carbond.Service,
    
    verbosity: 'warn',

    doStart: function() {
      this._started = true
    },
    
    doStop: function() {
      this._started = false
    }
  })

  service.start({}, function(err) {
    if (err) console.log(err)
    assert(service._started)
    service.stop()
    assert(!service._started)
    done(err)
  })
}

/*******************************************************************************
 * asyncTest2
 */
function asyncTest2(done) {
  var service = o({
    _type: carbond.Service,

    verbosity: 'warn',
    
    doStart: function(options, cb) {
      this._started = true
      cb()
    },
    
    doStop: function(cb) {
      this._started = false
      cb()
    }
  })

  service.start({}, function(err) {
    if (err) { console.log(err) }
    assert(service._started)
    service.stop(function(err) {
      if (err) { console.log(err) }
      assert(!service._started)
      done(err)
    })
  })
}

/*******************************************************************************
 * asyncTest3
 */
function asyncTest3(cb) {
  var service = o({
    _type: carbond.Service,

    verbosity: 'warn',
    
    doStart: function() {
      this._started = true
    },
    
    doStop: function() {
      this._started = false
    }
  })

  service.start()
  assert(service._started)
  service.stop(function(err) {
    assert(!service._started)
    cb(err)
  })
}

