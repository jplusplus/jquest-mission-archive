[![Build Status](https://secure.travis-ci.org/jplusplus/jquest-mission.png?branch=master)](http://travis-ci.org/jplusplus/jquest-mission)

jQuest Mission
==============
Node.js module to implement jQuest's missions quickly and easily.

```js
var Mission = require('jquest-mission').Mission;

/**
 * Constructor of a new Mission child.
 * @param {object}      models       All database models' instances
 * @param {number}      userId       Id of the user that plays the mission 
 * @param {number}      chapterId    Id of the chapter related to the mission 
 * @param {function}    next         Callback function after synchronization
 */
module.exports = function(models, userId, chapterId, callback) {  
  // Custom your Mission here..
  // Example : change the required points to complete the mission
  this.pointsRequired = 100;

  // Call the parent constructor
  module.exports.super_.call(this, models, userId, chapterId, callback);
};

/**
 * Inheritance from "Mission"
 */
util.inherits(module.exports, Mission);

/**
 * Implements the method that will check on the advancement of the user.
 * @return {Boolean}         Returns true if the mission is completed
 */
module.exports.prototype.isCompleted = function() {
  return this.points >= this.pointsRequired;
};


exports = module.exports;


```

## Installation

    $ npm install jquest-mission

