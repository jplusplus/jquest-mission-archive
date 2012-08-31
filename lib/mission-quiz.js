// Dependencies
var util    = require("util")
  , Mission = require("./mission.js");

function MissionQuiz(models, userId, chapterId, callback) {
  // Call the parent constructor
  MissionQuiz.super_.call(this, models, userId, chapterId, callback);  
}

/**
 * Inheritance from "Mission"
 */
util.inherits(MissionQuiz, Mission);

/*
 * @api public
 */
exports = module.exports = MissionQuiz;