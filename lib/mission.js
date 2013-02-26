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
 * @param {object}      api            API Object (from Fermata module) to extract data
 * @param {object}      entityManager  EntityManager Object to manage entities
 * @param {number}      user           Id of the user that plays the mission 
 * @param {number}      mission        Id of the mission in the database
 * @param {function}    next           Callback function after synchronization
 */
function Mission(api, entityManager, user, mission, next) {        
  
  self = this;
  /**
   * Default values and class attributs
   * @type {Object}
   */
  var defaultValues = {
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
    templateOptions    : { debug: false },
    /**
     * Locals to append to each template parsing 
     * @type {Object}
     */
    locals             : {}
  };


  // Class attributs
  // ***************
  self.api = api;  
  self.entityManager = entityManager;  

  // Merge the current object attribut  
  // with the default values
  for(var attr in defaultValues) {     
    // Take the default value if not exists yet 
    // (defined in the subclass constructor)
    self[attr] = self[attr] || defaultValues[attr];
  }

  // Model attributs
  // ***************

  // Public attributs 
  // the "points" attribut is defined by Getter/Setter
  self.state      = "game"; // User progression (default values)
  self.user       = user;
  self.mission    = mission;  
  self.createdAt  = new Date(); // We have to record the start time of the mission   
    
  // Instanciation methods
  // *********************
  // Loaded in parallel mode
  async.parallel([

    // Synchronize the instance with the databse
    function(callback) { self.sync(callback) },
    // Load the package file
    function(callback) { self.loadPackage(callback) },

  // Final callback
  ], next);
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

    // Disabled synchronization if the models aren't available
    if( typeof self.api === "object" ) {


      // Looks for the UserProgression if exist 
      self.api.user_progression({
        user    : self.user,
        mission : self.mission             
      }).get(function(err, userProgression) {
      
        // UserProgression exists
        if(!err && userProgression.objects.length > 0) {

          var up = userProgression.objects[0];
          var exclude = ["user", "mission"]; 
          // Completes the current instance with the UserProgression
          for(var key in self) {            
            // If the key exists in the record from the db
            // and exclude some attribute
            if(typeof up[key] !== "undefined" && exclude.indexOf(key) == -1) {              
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

    // Find the existing UserProgression
    self.api.user_progression({
      user    : self.user,
      mission : self.mission      
    }).get(function(err, userProgression) {

      // Builds a new object
      if( err || userProgression.objects.length == 0 ) {

        // Builds an userProgression object
        var up = self.api.user_progression.post({
          user      : self.user,
          mission   : self.mission,
          points    : self.points,
          state     : self.state
        }, next);

      // Update the existing one
      } else {         

        var up = userProgression.objects[0];
        
        self.api.user_progression(up.id).put({          
          points : self.points,
          state  : self.state
        }, next);
      }

    });

  },

  /**
   * Change the state of this mission to "succeed" or "failed"
   * @param {Function} next Callback function
   */
  close: function(next) {
    self.state = self.isCompleted() ? "succeed" : "failed";
    self.update(next);
  },

  /**
   * Change the state of this mission to "game"
   * @param {Function} next Callback function
   */
  open: function(next) {
    self.state = "game";
    self.points = 0;
    self.update(next);
  },

  /**
   * Load and parse the package.json file
   * @param {Function} next Callback function
   */
  loadPackage: function(next) {

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
    return fs.existsSync( self.getPackagePath() );
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
    templatePath = path.join(dirname, "package.json");

    return from ? path.relative(from, templatePath) : templatePath; 
  },

  /**
   * Load the template file as a text file.
   * @param {String} name Template file name
   */
  loadTemplate: function(name) {

    // The file must exist
    if( ! self.templateExists(name) ) {          
      throw new Error("The mission's template file doesn't exist.");
    }

    // We read the file
    self.templateTxt = fs.readFileSync( path.join(self.getTemplatePath(), name), "utf8");    

    return !! self.templateTxt;
  },

  /**
   * Compile the Mission template
   * @param   {String}   name     Template file name
   * @param   {Object}   locals   Data to use during the template parsing   
   */
  render: function(name, locals) { 

    // (Re) loads the template file
    if( ! self.loadTemplate(name) ) throw new Error("Failed to read the mission's template file.");

    if(typeof locals !== "object") locals = {};
    // Add the mission to the locals 
    locals.mission  = self;

    // Merge the current locals object with the class's one
    for(var attr in self.locals) { locals[attr] = self.locals[attr]; }

    // Compiles the template function
    self.templateFn = jade.compile(self.templateTxt, self.templateOptions); 
    // Return the result for the given locals
    return self.templateFn(locals);
  },
  
  /**
   * Checks if the template file exists
   * @param {String} name Template file name
   * @return {Boolean} True if the template file exist
   */
  templateExists: function(name) {
    return fs.existsSync( path.join(self.getTemplatePath(), name) );
  },

  /**
   * Determines and return the template
   * @param {String} from Optional, to obtain a relative path
   * @return {String} Path to the template
   */
  getTemplatePath: function(from) {  
    // Constructs the path to template
    var templatePath = self.templateDirname;  
    return from ? path.relative(from, templatePath) : templatePath; 
  },

  /**
   * Gets the default HTML content of the mission (when play)
   * @param  {Object} locals Locals to use within the template
   * @return {String} Current mission display code (HTML)
   */
  getContent: function(locals) {    
    return self.render(self.templateFilename, locals) || "";
  },

  /**
   * Called always before using the mission
   * @param {Function} next Function call when the mission is ready
   */
  play: function(next) {      
    // Callback function
    if(typeof next === "function") next.call(self, null, {});
  },

  /**
   * Evaluates receive POST data 
   * @param {Object}   data
   * @param {Function} next
   */
  data: function(data, next) {
    // Callback function
    if(typeof next === "function") next.call(self, null, {});
  },  
  /**
   * Return JSON according the receiving data 
   * @param {Object}   data
   * @param {Function} next
   */
  get: function(data, next) {
    // Callback function
    if(typeof next === "function") next.call(self, null, {});
  }

};


/**
 * @api public
 */
exports = module.exports = Mission;