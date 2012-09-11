// Dependencies
var util    = require("util")
  , enc     = require("enc")
  , Mission = require("./mission.js")
  , _       = require("underscore");

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
 * Overload the "open" function to reset the "questionsLeft" 
 * @param {Function} callback
 */
MissionQuiz.prototype.open = function(callback) {  
  this.questionsLeft     = this.questionsNumber;
  this.previousQuestions = [];
  MissionQuiz.super_.prototype.open.call(this, callback);
};

/**
 * Overide the prepare function
 * @param {Object} req HTTP request from the client
 * @param {Function} callback
 */
MissionQuiz.prototype.prepare = function(req, res, callback) {

  var self = this;

  // Did we evaluate a request (is there post data) ?
  if( ! self.evalRequest(req, res) ) {

    // Get another question if there is still questions left
    if( self.questionsLeft > 0 ) {

      // Find a random question
      var questionKey = self.getRandomQuestion(),
          questionFn  = self.questions[questionKey];

      // "Compiles" the question
      questionFn(function(locals) {

        // Encryptes the solution for the client side
        // The solution can be an array of solutions.
        if(typeof locals.solution != "string") {
          
          // We must encrypte each solution separetly
          var solutions = [];
          for(var i in locals.solution) {
            // Keeps only the strings
            if(typeof locals.solution[i] == "string") {
              solutions.push( self.getEncode(locals.solution[i]) );
            }
          }

          // Concatenates every solutions
          locals.solution = solutions.join(",");   

        } else {
          // Encrypte the string directly
          locals.solution = self.getEncode(locals.solution);
        }

        // Add the question key
        locals.id       = questionKey; 
        
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

  }

};

/**
 * Evaluates receive POST data 
 * @param  {Object} req HTTP Request
 * @param  {Object} res HTTP result
 * @return {Boolean}    True if we receive any data 
 */
MissionQuiz.prototype.evalRequest = function(req, res) {

  var self = this;

  // Do you receive any data ?
  if( req !== null && Object.keys(req.body).length > 0 ) {

    // Encrypt the client's answer to make compare with the encrypted solution
    var answerEnc = self.getEncode(req.body["quiz-answer"]),
    // Set to true later if the answer is correct
        isCorrect = false;
    // Every solutions decoded to send them to the user
        solutions = [];
  
    // Is there a received solution
    if( req.body["quiz-solution"] ) {      
      // Is the answer correct ?
      // Several solution is possible, we have to evalute each of them. 
      req.body["quiz-solution"].split(",").forEach(function(solution) {
        // Change the value of isCorrect only if the answer is correct
        isCorrect = answerEnc === solution ? true : isCorrect;
        // Keeps only the strings
        if(typeof solution == "string") {
          // Decode the solution
          solutions.push( self.getDecode( solution ) );
        }
      });
      
    }

    // Calculates the points
    self.points +=~~ ( isCorrect ? -1 * Math.pow(req.body.duration, 3) * 10/125 + 10  : 0 );

    // Reduce the number of questions left
    self.questionsLeft--;

    // Save the question as a "previous question"
    self.previousQuestions.push({ 
      id        : req.body.question,
      duration  : req.body.duration,
      isCorrect : isCorrect
    });

    // We reach the end of the quiz
    if(self.questionsLeft <= 0) {
      
      // Close the mission
      self.close(function() {        
        // In any case, send the answer as a JSON document
        res.json({ solution: solutions, isCorrect: isCorrect, isComplete: true});    
      });

    } else {      

      // In any case, send the answer as a JSON document
      res.json({ solution: solutions, isCorrect: isCorrect, isComplete: false}); 
    }    

    // Everything was fine 
    return true;

  // Doesn't eval any data
  } else return false;

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
  } while( _.find(self.previousQuestions, function(pq) {
    // Compares each previous question to the id
    return pq.id == id; 
  }) !== undefined);

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