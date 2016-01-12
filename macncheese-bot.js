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

var BOTNAME = 'macncheese';

var controller = botkit.slackbot({
  json_file_store: './storage/' + BOTNAME,
  debug: false,
});

var bot = controller.spawn({
  token: process.env['SLACK_TOKEN_' + BOTNAME.toUpperCase()]
}).startRTM();

/* Start bot routes */

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
  bot.reply(message,now.getHours() + ":" + now.getMinutes());
});


controller.hears(['weather'],'direct_message,direct_mention,mention,ambient',function(bot,message) {
  var match = message.text.match(/weather in (.+)/i);
  if (match) {
    // location provided, use and save it
    sayWeather(bot, message, match[1], true);
  } else {
    match = message.text.match(/weather here/i);
    if (match) {
      // ask location, use and save it
      askWeatherLocation(bot, message);
    } else {
      // location not provided, try looking up last saved location
      controller.storage.users.get(message.user,function(err,user) {
        if (user && user.weather_location) {
          sayWeather(bot, message, user.weather_location, false);
        } else {
          askWeatherLocation(bot, message);
        }
      });
    }
  }
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

function ask(bot, message, question, replyCallback)
{
  bot.startConversation(message, function(err, convo) {
    convo.ask(question, function(response, convo) {
      replyCallback(response, convo);
      convo.next();
    });
  });
}

function sayWeather(bot, message, location, saveLocation)
{
  if (saveLocation) {
    controller.storage.users.get(message.user,function(err,user) {
      if (!user) {
        user = {
          id: message.user,
        }
      }
      user.weather_location = location;
      controller.storage.users.save(user);
    });
  }
  weather.find({search: location, degreeType: 'F'}, function(err, result) {
    if (result && result.length > 0) {
      var location = result[0].location;
      var current = result[0].current;
      var today = result[0].forecast[0];
      var tomorrow = result[0].forecast[1];
      var todayPrecip = today.precip || "0";
      var tomorrowPrecip = tomorrow.precip || "0";
      bot.reply(message, "Currently " + current.temperature + "° in " + location.name + ", forecast " + today.skytextday + " with high of " + today.high + "° and " + todayPrecip + "% chance of rain today. Tomorrow " + tomorrow.skytextday + " with high of " + tomorrow.high + "° and " + tomorrowPrecip + "% chance of rain.");
    } else {
      bot.reply(message, "I couldn't get the weather for " + location);
    }
  });
}

function askWeatherLocation(bot, message)
{
  ask(bot, message, "Where are you?", function(response, convo) {
    sayWeather(bot, response, response.text, true);
  });
}

