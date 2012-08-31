// Dependencies
var util    = require("util")
  , Mission = require("./mission.js");

/**
 * MissionQuiz constructor
 * @param {object}      models       All database models' instances
 * @param {number}      userId       Id of the user that plays the mission 
 * @param {number}      chapterId    Id of the chapter related to the mission 
 * @param {function}    next         Callback function after synchronization
 */
function MissionQuiz(models, userId, chapterId, callback) {

  // Default value and class attributs
  var defaultValues = {
    /**
     * Array of functions to call to generate a question.
     * Every function must have a callback function 
     * passed as first argument.
     * @type {Array}
     */
    questions : [],
    /**
     * Number of question.
     * @type {Number}
     */
    questionsNumber : 0,
    /**
     * Number of question left 
     * before closing the mission.
     * @type {Number}
     */
    questionsLeft : 0
  };


  // Merge the current object attribut  
  // with the default values
  for(var attr in defaultValues) {     
    // Take the default value if not exists yet 
    // (defined in the subclass constructor)
    this[attr] = this[attr] || defaultValues[attr];
  }

  // Change the mission type to "quiz"
  this.type = "quiz";

  // Call the parent constructor
  MissionQuiz.super_.call(this, models, userId, chapterId, callback);  
}

/**
 * Inheritance from "Mission"
 */
util.inherits(MissionQuiz, Mission);

/**
 * Add a question as a function
 * @param {Function}  func  
 */
MissionQuiz.prototype.addQuestion = function(func) {  

  var self = this;

  if(typeof self.questions == "undefined") self.questions = [func];
  else self.questions.push(func)

  self.questionsNumber = self.questions.length;
  self.questionsLeft   = self.questionsNumber;
    
};

/**
 * Overide the prepare function
 * @param  {Function} callback
 */
MissionQuiz.prototype.prepare = function(callback) {

  var self = this;    

  // Closes the mission if there is no question left
  if(self.questionsLeft == 0) {

    self.close(callback);

  } else {      

    // Find a random question
    var question = self.getRandomQuestion();

    if(question) {

      // "Compiles" the question
      question(function(locals) {
        // Adds the given locals to the template
        self.locals = locals;

        // Calls the parent prepare function
        if(typeof callback === "function") callback.call(self);
      });

    } else {
      // Calls the parent prepare function
      if(typeof callback === "function") callback.call(self);
    }
  
  }
};

/**
 * Gets a random question
 * @return {Function}
 */
MissionQuiz.prototype.getRandomQuestion = function() {
  return this.questions[ Math.floor( Math.random() * this.questions.length ) ];
};

/*
 * @api public
 */
exports = module.exports = MissionQuiz;