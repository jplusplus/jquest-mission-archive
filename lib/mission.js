

/************************************
 * Constructor
 ************************************/  

/**
 * "Abstract" class to implement jQuest's mission
 * @param {object} 		models		 	All database models' instances
 * @param {number} 		userId 			Id of the user that plays the mission 
 * @param {number} 		chapterId 	Id of the chapter related to the mission 
 * @param {function}	next			 	Callback function after synchronization
 */
function Mission(models, userId, chapterId, next) {   	   
	
	// Records local parameters
	this.models 		= models;
	this.userId 		= userId;
	this.chapterId 	= chapterId;

	// User progression (default values)
	this.points     = 0;
	this.succeed    = false;

  // We have to record the start time of the mission
  this.createdAt = new Date();

  // That attributes can be customized by the subclass
  this.pointsAwarded    = 100;  // Points due when the mission is complete
  this.duration  				= -1;   // Durations in milliseconds of the mission, -1 to disabled

  // Synchronize the instance with the databse
  this.sync(next);
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
  },

  /**
   * Synchronize the current mission with the database
   * @param {Function} next Callback function
   */
  sync: function(next) {

  	var self = this;

  	// Disabled synchronization if the models aren't available
  	if( typeof self.models === "object" ) {

  		// Looks for the UserProgression if exist 
  		self.models.UserProgression.find({
  			where: {
  				userId		: self.userId,
  				chapterId : self.chapterId
  			}
  		// We succeed
  		}).success(function(up) {
  		
  			// UserProgression exists
  			if(up) {
	  			// Completes the current instance with the UserProgression
	  			for(var key in self) {

	  				// If the key exists in the record from the db
	  				if(typeof up[key] !== "undefined") {
	  					// Updates the current instance with it
	  					self[key] = up[key];
	  				}

	  			}

	  			// Callback function
	  			if(typeof next === "function") next.call(self);

	  		// UserProgression not exists
	  		} else {

	  			// We add it according the current
	  			self.update(next);

	  		}

  		});
  	}

  },

  /**
   * Save the current mission in the database
   * @param  {Function} next Callback function
   */
  update: function(next) {

		var self = this;		

		// Find the existing UserProgression
  	self.models.UserProgression.find({ 
  		where : {  			
				userId		: self.userId,
				chapterId : self.chapterId,
  		}
  	}).complete(function(err, userProgression) {

  		// Builds a new object
  		if( ! userProgression ) {

		  	// Builds an userProgression object
		  	userProgression = self.models.UserProgression.build({
					userId		: self.userId,
					chapterId : self.chapterId,
					points    : self.points,
					succeed   : self.succeed
				});

		  // Update the existing one
		  } else {		  			  	
	  		userProgression.userId		= self.userId;
				userProgression.chapterId = self.chapterId;
				userProgression.points    = self.points;
				userProgression.succeed   = self.succeed;
		  }

	  	// Save this object
	  	userProgression.save();

  	});

  }

};


/**
  * @api public
  */
module.exports = Mission;