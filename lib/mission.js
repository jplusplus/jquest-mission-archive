

/************************************
 * Constructor
 ************************************/  

/**
 * "Abstract" class to implement jQuest's mission
 * @param {Object} app Express app.
 */
function Mission(app) {				
	// Public attributes
	this.points   = 100;   // Points due when the mission is complete
	this.duration = -1; // Durations in milliseconds of the mission, -1 to disabled
	this.app 		  = app; // Every mission should receive the express Application
}


/************************************
 * Public methods
 ************************************/  
Mission.prototype = {

	/**
	 * Mission state (completed or not)
	 *
	 * This function must be overridden by subclasses. 
	 * In abstract form, it always throws an exception.
	 *
	 * @api public
	 */
	isCompleted: function() {
  	throw new Error('You must override the Mission#isCompleted by subclass');
  },

	/**
	 * Return the points obtained by the given user
	 * @param  {Object} user Given user
	 * @api public
	 * @return {Number}
	 */
	getUserPoints: function(user) {
		// 0 point if not completed
		return ! this.isCompleted() ? 0 : this.points;
	}

};


/**
	* @api public
	*/
module.exports = Mission;