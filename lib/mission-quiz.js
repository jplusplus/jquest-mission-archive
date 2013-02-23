// Dependencies
var util    = require("util")
  , Mission = require("./mission.js")
  , _       = require("underscore");

/**
 * MissionQuiz constructor
 * @param {object}      api            API Object (from Fermata module) to extract data
 * @param {object}      entityManager  EntityManager Object to manage entities
 * @param {number}      user           Id of the user that plays the mission 
 * @param {number}      mission        Id of the mission in the database
 * @param {function}    next           Callback function after synchronization
 */
function MissionQuiz(api, entityManager, user, mission, callback) {

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
    questionsLeft : 0,
    /**
     * Array of questions already user. Reset when the mission is open.
     * Each question is recorded in the following format :
     *   {
     *     id        : {Number}
     *     duration  : {Number}
     *     isCorrect : {Boolean}
     *   }
     * @type {Array}
     */
    previousQuestions : [],
    /**
     * Name of the template to load
     * @type {String}
     */
    templateFilename: "mission-quiz.jade"    
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
  MissionQuiz.super_.call(this, api, entityManager, user, mission, callback);  
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
  else self.questions.push(func);

  self.questionsNumber = self.questions.length;
  self.questionsLeft   = self.questionsNumber;
    
};

/**
 * Overload the "open" function to reset the "questionsLeft" 
 * @param {Function} callback
 */
MissionQuiz.prototype.open = function(callback) {  
  this.questionsLeft     = this.questionsNumber;
  this.previousQuestions = [];
  MissionQuiz.super_.prototype.open.call(this, callback);
};

/**
 * Overide the play function
 * @param {Function} callback
 */
MissionQuiz.prototype.play = function(callback) {

  var self = this;

  // Get another question if there is still questions left
  if( self.questionsLeft > 0 ) {

    // Find a random question
    var questionKey = self.getRandomQuestion(),
        questionFn  = self.questions[questionKey];

    // "Compiles" the question
    questionFn(function(err, locals) {

      if(err) return callback(err, null);
      // Add the question key
      locals.id = questionKey;       
      // Record the generated question
      self.previousQuestions[questionKey] = locals;            
      // Call the parent play mission
      callback(null, locals);

    });
  
  // In last case (no questions left, no data give),
  // the mission is probablu complete, nothing to do
  } else {    
      callback(null, {});
  }

};

/**
 * Evaluates receive POST data 
 * @param {Object}   data
 * @param {Function} callback
 */
MissionQuiz.prototype.data = function(data, callback) {

  var self = this;
  callback = callback || function() {};

  // Do you receive any data ?
  if( data !== null
  &&  "quiz-answer" in data
  &&  "id" in data ) {

    // Set to true later if the answer is correct
    var  isCorrect = true,
    // Gets the question data
      questionData = _.findWhere(self.previousQuestions, {id: data.id})

    // Is there a received solution
    if( questionData["quiz-solution"] ) {        
      // Is the answer correct ?
      isCorrect = questionData["quiz-solution"].indexOf(data["quiz-answer"]) > -1;
    // No solution given, record the user one (as an evaluation)
    } else {
      
    }
    
    // Calculates the points
    var pointByQuestion = self.pointsRequired * 2 / self.questions.length;          
    self.points +=~~ isCorrect ? pointByQuestion : 0;

    // Reduce the number of questions left
    self.questionsLeft--;

    // We reach the end of the quiz
    if(self.questionsLeft <= 0) {
      
      // Close the mission
      self.close(function() {        
        // In any case, send the answer as a JSON document
        callback(null, { solution: questionData["quiz-solution"], isCorrect: isCorrect, isComplete: true});    
      });

    } else {      
      // In any case, send the answer as a JSON document
      callback(null, { solution: questionData["quiz-solution"], isCorrect: isCorrect, isComplete: false}); 
    }    

  // Doesn't eval any data
  } else return callback({error: "No received data."}, null);

};

/**
 * Implements the method that will check on the advancement of the user.
 * 
 * @return {Boolean}         Retourns true if the mission is completed
 */
MissionQuiz.prototype.isCompleted = function() {
  return this.points >= this.pointsRequired;
};

/**
 * Gets a random question
 * @return {Function}
 */
MissionQuiz.prototype.getRandomQuestion = function() {
  
  var self = this;

  do {
    // Take a random question id
    var id = Math.floor( Math.random() * self.questions.length );
    // Avoids infinite loop
    if(self.previousQuestions.length >= self.questions) break;

  // Until the id is never use before
  } while( _.findWhere(self.previousQuestions, {id: id}) !== undefined);

  return id;
};


/**
 * Gets the number of correct questions
 * @return {Number} Correct questions
 */ 
MissionQuiz.prototype.countQuestionSuccess = function() {
  return _.filter(this.previousQuestions, function(pv) {
    return !! pv.isCorrect;
  }).length;
};


/**
 * Gets the number of steps to finish the quiz
 * @return {number} Number of steps
 */
MissionQuiz.prototype.getStep = function() {
  return this.questionsNumber - this.questionsLeft + 1;
};


/*
 * @api public
 */
exports = module.exports = MissionQuiz;