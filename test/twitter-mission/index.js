// Dependencies
var util    = require("util")
  , Mission = require("../../lib/mission");

function TwitterMission(models, userId, chapterId, callback) {

  // Call the parent constructor
  TwitterMission.super_.call(this, models, userId, chapterId, function() {

    // Here some configuration attributs
      
    // Inherited variables can be changed (from Mission)
    this.pointsAwarded   = 70; // The number of points users get at the end of the mission (default = 100)
    this.duration        = 20000; // Users have 20 seconds to complete the mission (default = no minimal duration)  

    // New (private) variables can be added
    this.accountToFind = "@jquest" // In this example, the mission's aim is to follow this Twitter account

    // Callback function
    if(typeof callback === "function") callback.call(this);

  });  

}

/**
 * Inheritance from "Mission"
 */
util.inherits(TwitterMission, Mission);

// To code a mission, developers can use an abstract class. 
// They will implement an open source module (via npm or github) 
// and implement methods from this class.

/**
* Implements the class that'll check on the advancement of the user
* @param  {Object}   user   The object containing the user
* @return {Boolean}         Retourns true if the mission is completed
*/
TwitterMission.prototype.isCompleted = function(user) {
  // Things to check upon...
  // For instance, does the user follow the aforementioned account ?
  //     we can write a function to check up on that
  //     TwitterMission.areFriends(user.nickname, exports.accound_to_find)

  return true; // Or false if the condition isn't satisfied
};


module.exports = TwitterMission;