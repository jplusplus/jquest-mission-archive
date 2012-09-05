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

## Running tests

From the ```jquest-mission``` directory, run asynchronous tests with ```vows```.

    $ npm install
    $ npm test
    
## MIT License

Copyright (c) 2012 Journalism++ SAS - Paris, France 

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

