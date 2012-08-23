// Dependancies
var TwitterMission = require("./twitter-mission")
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
	  		return new TwitterMission(null)
	  	},
		  "Abstract methods implemented": function(topic) {
		  	tm = topic;
		  	tm.isCompleted();
		  }
		}
	})
	.addBatch({	
	  "Required attributs states": {
	  	"points" : function() {
	  		assert.isNumber( tm.points );
	  	}, 
	  	"duration" : function () { 
	  		assert.isNumber( tm.duration )
	  	}
	  },
	  "Returned values" : {
	  	"getUserPoints" : function () {
	  		assert.isNumber( tm.getUserPoints() );
	  	}
	  }
	}).export(module);	