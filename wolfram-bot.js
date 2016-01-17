/*
 * Example bot, based on Botkit sample bot.
 *
 * Copy this file to create your own bot. Set BOTNAME below to your bot's name.
 * Add the following to .env in this directory:
 *   SLACK_TOKEN_YOUR_BOT_NAME=<your_bot_slack_token>
 */

var botkit = require('botkit');
var dotenv = require('dotenv').load();
var os = require('os');
var util = require('./lib/util');
var wolfram = require('wolfram-alpha').createClient(process.env.WOLFRAM_APPID);

var BOTNAME = 'wolfram';

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
      bot.reply(message,"Hello " + user.name + "!! You can ask me math or general knowledge questions.");
    } else {
      bot.reply(message,"Hello. You can ask me math or general knowledge questions.");
    }
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


controller.hears(['uptime','identify yourself','who are you','what is your name'],'direct_message,direct_mention,mention',function(bot,message) {
  var hostname = os.hostname();
  var uptime = util.formatUptime(process.uptime());

  bot.reply(message,':robot_face: I am a bot named <@' + bot.identity.name +'>. I have been running for ' + uptime + ' on ' + hostname + ".");
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

controller.hears(['.+'], 'direct_message,direct_mention,mention', function(bot, message) {
  wolfram.query(message.text, function(err, result) {
    if (err) {
      bot.reply(message, "Sorry, I had trouble answering that.");
      bot.botkit.log("Error querying WolframAlpha: " + JSON.stringify(err));
    } else if (result && result.length > 1 && result[1] && result[1].subpods && result[1].subpods && result[1].subpods.length > 0 && result[1].subpods[0].text) {
      bot.reply(message, result[1].subpods[0].text);
    } else {
      bot.reply(message, "I don't know.");
      bot.botkit.log("Invalid result for '" + message.text + "': + " + JSON.stringify(result));
    }
  });
});

