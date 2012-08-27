// Dependencies
var util    = require("util")
  , Mission = require("../../lib/mission");

function TwitterMission(models, userId, chapterId, callback) {

  // Call the parent constructor
  TwitterMission.super_.call(this, models, userId, chapterId, function() {

    // Here some configuration attributs
      
    // On peut changer une variables dont on a hérité (de Mission)
    this.pointsAwarded   = 70; // Nombre de points obtenu à la fin de la mission, 100 par defaut
    this.duration        = 20000; // Indique qu'on a 20 secondes pour réaliser la mission, false par defaut (pas de durée)  

    // On peut aussi en ajouter une nouvelle (privée)
    this.accountToFind = "@jquest" // Notre mission peut par exemple consister à suivre ce compte

    // Callback function
    if(typeof callback === "function") callback.call(this);

  });  

}

/**
 * Inheritance from "Mission"
 */
util.inherits(TwitterMission, Mission);

// Pour coder une mission, nous allons permettre aux développeurs d’utiliser une classe abstraite. 
// Ça signifie qu’ils devront intégrer un module (open source, via npm ou github) 
// et implémenter les méthodes de cette classe.

/**
* Implemente la classe qui va verifier l'état d'avancement de l'utiliseur
* @param  {Object}   user   L'object contenant l'utilisateur
* @return {Boolean}         Retourne true si la mission est complétée
*/
TwitterMission.prototype.isCompleted = function(user) {
  // Des choses à vérifier...
  // Par exemple, suivont nous le compte indiqué ?
  //     on peut écrire une fonction qui va vérifier ça
  //     TwitterMission.areFriends(user.nickname, exports.accound_to_find)

  return true; // Ou false si on est pas satisfait
};


module.exports = TwitterMission;