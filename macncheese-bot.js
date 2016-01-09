
/*
 * Mac 'n' Cheese bot.
 *
 * Initially based on Botkit sample bot.
 */

var botkit = require('botkit');
var dotenv = require('dotenv').load();
var weather = require('weather-js');
var os = require('os');
var path = require('path');
var util = require('./lib/util');

var controller = botkit.slackbot({
  json_file_store: './storage/macncheese',
  debug: false,
});

var bot = controller.spawn({
  token: process.env.SLACK_TOKEN_MACNCHEESE
}).startRTM();

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
})

controller.hears(['what is your favorite color'],'direct_message,direct_mention,mention',function(bot,message) {
  bot.reply(message,"pink");
});

controller.hears(['what time is it'],'direct_message,direct_mention,mention',function(bot,message) {
  var now = new Date();
  bot.reply(message,now.getHours() + ":" + now.getMinutes());
});

controller.hears(['weather'],'direct_message,direct_mention,mention,ambient',function(bot,message) {
  weather.find({search: 'San Francisco, CA', degreeType: 'F'}, function(err, result) {
    var current = result[0].current;
    var today = result[0].forecast[0];
    bot.reply(message, "Currently " + current.temperature + ", forecast " + today.skytextday + " with high of " + today.high + " today");
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
})


controller.hears(['uptime','identify yourself','who are you','what is your name'],'direct_message,direct_mention,mention',function(bot,message) {

  var hostname = os.hostname();
  var uptime = util.formatUptime(process.uptime());

  bot.reply(message,':robot_face: I am a bot named <@' + bot.identity.name +'>. I have been running for ' + uptime + ' on ' + hostname + ".");

})


