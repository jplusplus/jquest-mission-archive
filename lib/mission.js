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
  
  var self      = this,
  /**
   * Default values and class attributs
   * @type {Object}
   */
  defaultValues = {
    /**
     * Mission type
     * @type {String}
     */
    type               : "classic",
    /**
     * Points required to complete the mission
     * @type {Number}
     */
    pointsRequired     : 125,
    /**
     * User points when the mission starts
     * @type {Number}
     */
    points             : 0,
    /**
     * Durations in milliseconds of the mission, -1 to disabled  
     * @type {Number}
     */
    duration           : -1,
    /**
     * Path to the template directory
     * @type {[type]}
     */
    templateDirname    : __dirname,
    /**
     * Name of the template file to load
     * @type {String}
     */
    templateFilename   : "mission.jade",
    /**
     * Options to use when compiling with Jade
     * @type {Object}
     */
    templateOptions    : { debug: false},
    /**
     * Locals to append to each template parsing 
     * @type {Object}
     */
    locals             : {}
  };


  // Class attributs
  // ***************
  self.models     = models;  

  // Merge the current object attribut  
  // with the default values
  for(var attr in defaultValues) {     
    // Take the default value if not exists yet 
    // (defined in the subclass constructor)
    this[attr] = this[attr] || defaultValues[attr];
  }

  // Model attributs
  // ***************

  // Public attributs 
  // the "points" attribut is defined by Getter/Setter
  self.state      = "game"; // User progression (default values)
  self.userId     = userId;
  self.chapterId  = chapterId;  
  self.createdAt  = new Date(); // We have to record the start time of the mission   
    
  // Instanciation methods
  // *********************
  // Loaded in parallel mode
  async.parallel([

    // Synchronize the instance with the databse
    function(callback) { self.sync(callback) },
    // Load the package file
    function(callback) { self.loadPackage(callback) },
    // Load the template file
    function(callback) { self.loadTemplate(callback) },

  // Final callback
  ], function() {  
    // Finaly call the prepare function with no data
    self.prepare.call(self, null, null, next);
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
      where: {             
        userId    : self.userId,
        chapterId : self.chapterId      
      }
    }).complete(function(err, userProgression) {

      // Builds a new object
      if( ! userProgression ) {

        // Builds an userProgression object
        userProgression = self.models.UserProgression.build({
          userId    : self.userId,
          chapterId : self.chapterId,
          points    : self.points,
          state     : self.state
        });

      // Update the existing one
      } else {                
        userProgression.userId    = self.userId;
        userProgression.chapterId = self.chapterId;
        userProgression.points    = self.points;
        userProgression.state     = self.state;
      }

      // Save this object
      userProgression.save().complete(function() {
        if(typeof next === "function") next.call(this);
      });

    });

  },

  /**
   * Change the state of this mission to "succeed" or "failed"
   * @param {Function} next Callback function
   */
  close: function(next) {
    this.state = this.isCompleted() ? "succeed" : "failed";
    this.update(next);
  },

  /**
   * Change the state of this mission to "game"
   * @param {Function} next Callback function
   */
  open: function(next) {
    this.state = "game";
    this.update(next);
  },

  /**
   * Load and parse the package.json file
   * @param {Function} next Callback function
   */
  loadPackage: function(next) {

    var self = this;

    // The file must exist
    if( ! self.packageExists() ) {
      throw new Error("The mission's package.json must exist.");
    } 

    // We read the file
    fs.readFile(self.getPackagePath(), "utf8", function(err, data) {

      if(err) throw new Error("Failed to read the mission's package.json.");
      self.config = JSON.parse(data);
      
      // Callback function
      if(typeof next === "function") next.call(self);
    });

  },

  /**
   * Checks if the package.json file exists
   * @return {Boolean} True if the package.json file exist
   */
  packageExists: function() {
    return fs.existsSync( this.getPackagePath() );
  },


  /**
   * Returns the package.json path 
   * @param {String} from Optional, to obtain a relative path
   * @return {String} Path to the file
   */
  getPackagePath: function(from) {

    // Extracts the dirname from the parent module that must be a Mission subclass 
    var dirname  = path.dirname( module.parent.id ),
    // Deduces the filename
    templatePath = dirname + "/package.json";

    return from ? path.relative(from, templatePath) : templatePath; 
  },

  /**
   * Load the template file as a text file.
   * @param {Function} next Callback function
   */
  loadTemplate: function(next) {

    var self = this;    
    // The file must exist
    if( ! self.templateExists() ) {      
      throw new Error("The mission's template file doesn't exist.");
    }

    // We read the file
    fs.readFile(self.getTemplatePath(), "utf8", function(err, data) {

      if(err) throw new Error("Failed to read the mission's template file.");
      self.templateTxt = data;
      

      // Callback function
      if(typeof next === "function") next.call(self);
    });

  },

  /**
   * Compile the Mission template
   * @param  {Object}   locals   Data to use during the template parsing   
   */
  compileTemplate: function(locals) { 

    if(typeof locals !== "object") locals = {};
    // Add the mission to the locals 
    locals.mission  = this;

    // Merge the current locals object with the class's one
    for(var attr in this.locals) { locals[attr] = this.locals[attr]; }

    // Compiles the template function
    this.templateFn = jade.compile(this.templateTxt, this.templateOptions); 
    // Return the result for the given locals
    return this.templateFn(locals);
  },
  
  /**
   * Checks if the template file exists
   * @return {Boolean} True if the template file exist
   */
  templateExists: function() {
    return fs.existsSync( this.getTemplatePath() );
  },

  /**
   * Determines and return the template
   * @param {String} from Optional, to obtain a relative path
   * @return {String} Path to the template
   */
  getTemplatePath: function(from) {  

    // Constructs the path to template
    var templatePath = this.templateDirname + "/" + this.templateFilename;  
    return from ? path.relative(from, templatePath) : templatePath; 
  },

  /**
   * Gets the final HTML content
   * @param  {Object} locals Locals to use within the template
   * @return {String} Current mission display code (HTML)
   */
  getContent: function(locals) {
    return this.compileTemplate(locals) || "";
  },

  /**
   * Called always before using the mission
   * @param {Object} req HTTP request from the client
   * @param {Object} res HTTP result to send to the client
   * @param {Function} next Function call when the mission is ready
   */
  prepare: function(req, res, next) {  
    // Nothing yet to do
    if(typeof next === 'function') next.call(this);
  }

};


/**
 * @api public
 */
exports = module.exports = Mission;