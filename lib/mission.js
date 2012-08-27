// Modules dependencies
var  fs = require("fs")
 , path = require("path")
, async = require("async")
 , jade = require("jade");

/************************************
 * Constructor
 ************************************/  

/**
 * "Abstract" class to implement jQuest's mission
 * @param {object}      models       All database models' instances
 * @param {number}      userId       Id of the user that plays the mission 
 * @param {number}      chapterId    Id of the chapter related to the mission 
 * @param {function}    next         Callback function after synchronization
 */
function Mission(models, userId, chapterId, next) {        
  
  var self = this;

  // Class attributs
  // ***************
  self.models     = models;

  // That attributes can be customized by the subclass  
  self.pointsAwarded    = 100;              // Points due when the mission is complete
  self.duration         = -1;               // Durations in milliseconds of the mission, -1 to disabled  
  self.templateFilename = "index.jade";     // Path to the template file to load from the Mission directory
  self.templateOptions  = { debug: false}   // Options to use when compiling with Jade

  // Model attributs
  // ***************

  // Public attributs 
  self.userId     = userId;
  self.chapterId  = chapterId;
  self.succeed    = false; // User progression (default values)
  // We have to record the start time of the mission
  self.createdAt = new Date();  
  self.succeedAt = false;

  // Private attributs (user Getter or Setter)
  self._points    = 0;     // User points 


  // Instanciation methods
  // *********************
  // Loaded in parallel mode
  async.parallel([

    // Synchronize the instance with the databse
    function(callback) { self.sync(callback) },
    // Load the template file
    function(callback) { self.loadTemplate(callback) },

  // Final callback
  ], function() {
    // Call the next function and restore the context
    if(typeof next === "function") next.call(self);
  });
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
   * Return the points obtained
   * @api public
   * @return {Number}
   */
  get points() {
    // 0 point if not completed
    return ! this.isCompleted() ? 0 : this._points;
  },

  /**
   * Set the points
   * @param  {Number} points
   */
  set points(points) {
    // Updates points
    this._points = points;
    // Change the state to succee
    if(points >= this.pointsAwarded) {
      this.close();
    // Update the database
    } else {
      this.update();
    }
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
          userId    : self.userId,
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
        userId    : self.userId,
        chapterId : self.chapterId,
      }
    }).complete(function(err, userProgression) {

      // Builds a new object
      if( ! userProgression ) {

        // Builds an userProgression object
        userProgression = self.models.UserProgression.build({
          userId    : self.userId,
          chapterId : self.chapterId,
          points    : self.points,
          succeed   : self.succeed
        });

      // Update the existing one
      } else {                
        userProgression.userId    = self.userId;
        userProgression.chapterId = self.chapterId;
        userProgression.points    = self.points;
        userProgression.succeed   = self.succeed;
      }

      // Save this object
      userProgression.save();

    });

  },

  /**
   * Change the state of this mission to "succeed"
   * @param {Function} next Callback function
   */
  close: function(next) {
    this.succeed = true;
    this.succeedAt = new Date();
    this.update(next);
  },

  /**
   * Load the template file as a text file.
   * @param {Function} next Callback function
   */
  loadTemplate: function(next) {

    // Extracts the dirname from the parent module that must be a Mission subclass 
    var dirname = path.dirname( module.parent.id )
    // Deduces the filename
     , filename = dirname + "/" + this.templateFilename
    // Backups context
         , self = this;

    // The file must exist
    if( ! fs.existsSync(filename) ) {
      throw new Error("The mission's template file must exist.");
    }

    // We read the file
    fs.readFile(filename, "utf8", function(err, data) {

      if(err) throw new Error("Failed to read the mission's template file.");
      this.templateFn = jade.compile(data, this.templateOptions);
      
      // Callback function
      if(typeof next === "function") next.call(self);
    });

  },

  /**
   * Compile the Mission template
   * @param  {Object}   locals   Data to use during the template parsing   
   */
  compileTemplate: function(locals) {

    // Do not parse the template if it's not loaded yet
    if(typeof this.templateFn != "function") {
      // And stops here
      return false; 
    }

    return this.templateFn(locals);
  }

};


/**
 * @api public
 */
module.exports = Mission;