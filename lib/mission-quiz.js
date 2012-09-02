// Dependencies
var util    = require("util")
  , enc     = require("enc")
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
    questionsLeft : 0,
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
  else self.questions.push(func);

  self.questionsNumber = self.questions.length;
  self.questionsLeft   = self.questionsNumber;
    
};

/**
 * Overide the prepare function
 * @param {Object} req HTTP request from the client
 * @param {Function} callback
 */
MissionQuiz.prototype.prepare = function(req, res, callback) {

  var self = this;

  // Do you receive any data ?
  if( req !== null && Object.keys(req.body).length > 0 ) {

    // Encrypt the client's answer to make compare with the encrypted solution
    var answerEnc = this.getEncode(req.body["quiz-answer"]),
    // Is the answer correct ?
        isCorrect = answerEnc === req.body["quiz-solution"];
    // Decode the solution to send it to the user
         solution = this.getDecode( req.body["quiz-solution"] );

    // Calculates the points
    self.points += ! isCorrect ? 0 : -1 * Math.pow(req.body.duration, 3) * 10/125 + 10;

    // Reduce the number of questions left
    self.questionsLeft--;

    // We reach the end of the quiz
    if(self.questionsLeft <= 0) {
      
      // Close the mission
      self.close(function() {        
        // In any case, send the answer as a JSON document
        res.json({ solution: solution, isCorrect: isCorrect, isComplete: true});    
      });

    } else {      

      // In any case, send the answer as a JSON document
      res.json({ solution: solution, isCorrect: isCorrect, isComplete: false}); 
    }    

   // Get another question if there is still questions left
  } else if(self.questionsLeft > 0) {      

    // Find a random question
    var question = self.getRandomQuestion();

    // "Compiles" the question
    question(function(locals) {

      // Encryptes the solution for the client side
      locals.solution = self.getEncode(locals.solution);
      
      // Adds the given locals to the template
      self.locals.question = locals;

      // Call the parent prepare mission
      MissionQuiz.super_.prototype.prepare.call(self, req, res, callback);
    });
  
  // In last case (no questions left, no data give),
  // the mission is probablu complete, nothing to do
  } else {    
    // Call the parent prepare mission
    MissionQuiz.super_.prototype.prepare.call(self, req, res, callback);
  } 

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
  return this.questions[ Math.floor( Math.random() * this.questions.length ) ];
};

/**
 * Gets the encoded string
 * @param {String} str The string to encoded
 * @return {String}
 */
MissionQuiz.prototype.getEncode = function(str) {  
  return enc.aes192.encode(str, "mSmjHKMBiqqHIxWNWbHPmHAVYEhxUUEpXfV3S0eR");
};
/**
 * Gets the desencrypted string
 * @param {String} str The string to decode
 * @return {String}
 */
MissionQuiz.prototype.getDecode = function(str) {  
  return enc.aes192.decode(str, "mSmjHKMBiqqHIxWNWbHPmHAVYEhxUUEpXfV3S0eR");
};


MissionQuiz.prototype.getStep = function() {
  return this.questionsNumber - this.questionsLeft + 1;
};



/*
 * @api public
 */
exports = module.exports = MissionQuiz;