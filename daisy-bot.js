/*
 * Example bot, based on Botkit sample bot.
 *
 * Copy this file to create your own bot. Replace <YOUR_BOT_NAME> and <your_bot_name> below with your bot's name.
 * Add the following to .env in this directory:
 *   SLACK_TOKEN_YOUR_BOT_NAME=<your_bot_slack_token>
 */

var botkit = require('botkit');
var dotenv = require('dotenv').load();
var os = require('os');
var util = require('./lib/util');

var BOTNAME = 'daisy';

var controller = botkit.slackbot({
  json_file_store: './storage/' + BOTNAME,
  debug: false,
});

var bot = controller.spawn({
  token: process.env['SLACK_TOKEN_' + BOTNAME.toUpperCase()]
}).startRTM();

/* Start bot routes */

controller.hears(['.*'],'direct_message,direct_mention,mention',function(bot,message) {
    bot.api.reactions.add({
      timestamp: message.ts,
      channel: message.channel,
      name: 'dog2',
    },function(err,res) {
      if (err) {
        bot.botkit.log("Failed to add emoji reaction :(",err);
      }
    });
});
