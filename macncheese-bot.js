/*
 * @macncheese bot.
 *
 * Initially based on Botkit sample bot.
 */

var botkit = require('botkit');
var dotenv = require('dotenv').load();
var weather = require('weather-js');
var os = require('os');
var util = require('./lib/util');
var extend = require('extend');

var BOTNAME = 'macncheese';

var controller = botkit.slackbot({
  json_file_store: './storage/' + BOTNAME,
  debug: false,
});

var bot = controller.spawn({
  token: process.env['SLACK_TOKEN_' + BOTNAME.toUpperCase()]
}).startRTM();

/***
 *** Start bot routes
 ***/

controller.hears(['hello','hi'],'direct_message,direct_mention,mention',function(bot,message) {
  bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: 'robot_face',
  },function(err,res) {
    if (err) {
      bot.botkit.log("Failed to add emoji reaction :(",err);
    }
  });

  controller.storage.users.get(message.user,function(err,user) {
    if (user && user.name) {
      bot.reply(message,"Hello " + user.name+"!!");
    } else {
      bot.reply(message,"Hello.");
    }
  });
});


controller.hears(['what is your favorite color'],'direct_message,direct_mention,mention',function(bot,message) {
  bot.reply(message,"pink");
});


controller.hears(['what time is it'],'direct_message,direct_mention,mention',function(bot,message) {
  var now = new Date();
  bot.reply(message, now.getHours() + ":" + now.getMinutes());
});


/*
 * Get current or another location
 */
controller.hears(['where is .+','where am i'], 'direct_message,direct_mention,mention', function(bot, message) {
  var locationName = null;

  var match = message.text.match(/where is (\w+)/i);
  if (match) {
    locationName = match[1];
  } else if (message.text.match(/where am i/i)) {
    locationName = 'current';
  }

  withLocation(controller, bot, message, locationName,
    function(location) {
      bot.reply(message, location);
    },
    function() {
      bot.reply(message, "Good question.");
      askLocationAndSayOk(controller, bot, message, locationName);
  });
});

/*
 * Set current location
 */
controller.hears(['i am (in|at) .+'], 'direct_message,direct_mention', function(bot, message) {
  // explicit location? e.g. i'm in San Francisco
  var match = message.text.match(/i am in (.+)/i);
  if (match) {
    saveLocation(controller, message.user, 'current', match[1], function(err) {
      bot.reply(message, "Ok");
    });
    return;
  }

  var locationName = null;

  // set and save current location?
  match = message.text.match(/i am here/i);
  if (match) {
    askLocationAndSayOk(controller, bot, message, 'current');
    return;
  }

  // named location? e.g. i'm at work
  match = message.text.match(/i am at (\w+)/i);
  if (match) {
    var locationName = match[1];
    withLocation(controller, bot, message, locationName,
      function(location) {
        saveLocation(controller, message.user, 'current', location, function(err) {
          bot.reply(message, "Ok, you're in " + location);
        });
      },
      function() {
        askLocationAndSayOk(controller, bot, message, locationName);
    });
  }
});

/*
 * Set another location
 */
controller.hears(['.+ is (in|at) .+','.+ is here'], 'direct_message,direct_mention', function(bot, message) {
  // explicit location? e.g. work is in Oakland
  var match = message.text.match(/(\w+) is in (.+)/i);
  if (match) {
    var locationName = match[1];
    var location = match[2];
    saveLocation(controller, message.user, locationName, location, function(err) {
      bot.reply(message, "Ok");
    });
    return;
  }

  var locationName1 = null,
      locationName2 = null;

  // set to current location?
  if (match = message.text.match(/(\w+) is here/i)) {
    locationName1 = match[1];
    locationName2 = 'current';
  } else if (match = message.text.match(/(\w+) is at (\w+)/i)) {
    // named location? e.g. work is at home
    locationName1 = match[1];
    locationName2 = match[2];
  }
  if (locationName1 && locationName2) {
    withLocation(controller, bot, message, locationName2,
      function(location) {
        saveLocation(controller, message.user, locationName1, location, function(err) {
          bot.reply(message, "Ok, " + locationName1 + " is in " + location);
        });
      },
      function() {
        askLocation(controller, bot, message, locationName2, function(response, convo, location) {
          saveLocation(controller, message.user, locationName1, location, function(err) {
            bot.reply(message, "Ok, " + locationName1 + " and " + locationName2 + " are both in " + location);
          });
        });
      }
    );
  }
});

/*
 * Weather
 */
controller.hears(['weather'],'direct_message,direct_mention,mention,ambient', function(bot, message) {
  // explicit location? e.g. weather in San Francisco
  var match = message.text.match(/weather in (.+)/i);
  if (match) {
    sayWeather(bot, message, match[1]);
    return;
  }

  // set and save current location?
  match = message.text.match(/weather here/i);
  if (match) {
    askLocationAndSayWeather(controller, bot, message, 'current');
    return;
  }

  // named location? e.g. weather at work
  var locationName;
  match = message.text.match(/weather at (\w+)/i);
  if (match) {
    locationName = match[1];
  } else {
    locationName = 'current';
  }
  withLocation(controller, bot, message, locationName,
    function(location) {
      sayWeather(bot, message, location);
    },
    function() {
      askLocationAndSayWeather(controller, bot, message, locationName);
  });
});


controller.hears(['call me (.*)'],'direct_message,direct_mention,mention',function(bot,message) {
  var matches = message.text.match(/call me (.*)/i);
  var name = matches[1];
  controller.storage.users.get(message.user,function(err,user) {
    if (!user) {
      user = {
        id: message.user,
      }
    }
    user.name = name;
    controller.storage.users.save(user,function(err,id) {
      bot.reply(message,"Got it. I will call you " + user.name + " from now on.");
    })
  })
});


controller.hears(['what is my name','who am i'],'direct_message,direct_mention,mention',function(bot,message) {
  controller.storage.users.get(message.user,function(err,user) {
    if (user && user.name) {
      bot.reply(message,"Your name is " + user.name);
    } else {
      bot.reply(message,"I don't know yet!");
    }
  })
});


controller.hears(['shutdown'],'direct_message,direct_mention,mention',function(bot,message) {
  bot.startConversation(message,function(err,convo) {
    convo.ask("Are you sure you want me to shutdown?",[
      {
        pattern: bot.utterances.yes,
        callback: function(response,convo) {
          convo.say("Bye!");
          convo.next();
          setTimeout(function() {
            process.exit();
          },3000);
        }
      },
      {
        pattern: bot.utterances.no,
        default:true,
        callback: function(response,convo) {
          convo.say("*Phew!*");
          convo.next();
        }
      }
    ])
  })
});


controller.hears(['uptime','identify yourself','who are you','what is your name'],'direct_message,direct_mention,mention',function(bot,message) {
  var hostname = os.hostname();
  var uptime = util.formatUptime(process.uptime());

  bot.reply(message,':robot_face: I am a bot named <@' + bot.identity.name +'>. I have been running for ' + uptime + ' on ' + hostname + ".");
});

/* Helper functions. TODO: Move into a separate file. */

function saveForUser(controller, userId, data, callback)
{
  controller.storage.users.get(userId, function(err, user) {
    if (!user) {
      user = {
        id: userId,
      }
    }
    user = extend(true, user, data);
    controller.storage.users.save(user, function(err, id) {
      if (callback) {
        callback(err);
      }
    });
  });
}

function saveForUserBucket(controller, userId, bucket, key, val, callback)
{
  var data = {};
  data[bucket] = {};
  data[bucket][key] = val;
  saveForUser(controller, userId, data, callback);
}

function ask(bot, message, question, replyCallback)
{
  bot.startConversation(message, function(err, convo) {
    convo.ask(question, function(response, convo) {
      replyCallback(response, convo);
      convo.next();
    });
  });
}

function askLocation(controller, bot, message, savedLocationName, replyCallback) {
  var question = (savedLocationName == 'current' ? 'Where are you?' : 'Where is ' + savedLocationName + '?');
  ask(bot, message, question, function(response, convo) {
    location = response.text;
    saveLocation(controller, message.user, savedLocationName, location, function(err) {
      replyCallback(response, convo, location);
    });
  });
}

function withLocation(controller, bot, message, locationName, callbackWithLocation, callbackWithoutLocation)
{
  controller.storage.users.get(message.user, function(err, user) {
    if (user && user.location && user.location[locationName]) {
      callbackWithLocation(user.location[locationName]);
    } else {
      callbackWithoutLocation();
    }
  });
}

function saveLocation(controller, userId, locationName, location, callback)
{
  saveForUserBucket(controller, userId, 'location', locationName, location, callback);
}

function askLocationAndSayOk(controller, bot, message, savedLocationName)
{
  askLocation(controller, bot, message, savedLocationName, function(response, convo, location) {
    bot.reply(response, "Ok");
  });
}
function askLocationAndSayWeather(controller, bot, message, savedLocationName)
{
  askLocation(controller, bot, message, savedLocationName, function(response, convo, location) {
    sayWeather(bot, response, location);
  });
}

function sayWeather(bot, message, location)
{
  weather.find({search: location, degreeType: 'F'}, function(err, result) {
    if (result && result.length > 0) {
      var location = result[0].location;
      var current = result[0].current;
      var today = result[0].forecast[0];
      var tomorrow = result[0].forecast[1];
      var todayPrecip = today.precip || "0";
      var tomorrowPrecip = tomorrow.precip || "0";
      bot.reply(message, "Currently " + current.temperature + "° in " + location.name + ", forecast " + today.skytextday + " with high of " + today.high + "° and " + todayPrecip + "% chance of precip today. Tomorrow " + tomorrow.skytextday + " with high of " + tomorrow.high + "° and " + tomorrowPrecip + "% chance of precip.");
    } else {
      bot.reply(message, "I couldn't get the weather for " + location);
    }
  });
}

