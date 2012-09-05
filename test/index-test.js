// Dependancies
var TwitterMission = require("./fr-twitter-talk-1")
            , vows = require('vows')
          , assert = require('assert');

// Globals
var tm;

// Describe test section for the twitter-mission module
vows.describe('twitter-mission')
  // Firstly, instances tm
  .addBatch({
    "An instance of TwitterMission": {
      topic: function() {
        return new TwitterMission() // Without arguments : disabled the db sync
      },
      "Abstract methods implemented": function(topic) {
        tm = topic;
        tm.isCompleted();
      }
    }
  })
  .addBatch({  
    "Required attributs": {
      "points required" : function() {
        assert.isNumber( tm.pointsRequired );
      }, 
      "duration" : function () { 
        assert.isNumber( tm.duration )
      },
      "creation date": function() {
      	assert.ok( tm.createdAt instanceof Date )
      }
    },
    "Package settings" : {
      "packageExists" : function() {
        assert.isBoolean( tm.packageExists() );
      },
      "getPackagePath" : function() {
        assert.isString( tm.getPackagePath() );
      },
      "loadPackage" : function() {
        tm.loadPackage(function() {
          assert.isObject( tm.config );
        });
      }
    },
    "Template settings" : {
      "templateExists" : function() {
        assert.isBoolean( tm.templateExists() );
      },
      "getTemplatePath" : function () {
        assert.isString( tm.getTemplatePath() );
      },
      "getContent" : function () {
        var locals = { question: { label:"WTF?", duration: 20 } };
        assert.isString( tm.getContent(locals) );
      }
    }
  }).export(module);