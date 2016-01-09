# Let's Play with Botkit

This is a repo for experimenting with Slackbots using the [Botkit](https://github.com/howdyai/botkit) Node.js framework. Botkit is to Slack as Express is to the web.

## Installation

```bash
git clone git@github.com:ewiener/consequential-bots.git
```

## Getting Started

1) Install the consequential-bots repo.

2) Install botkit and other node dependencies defined in package.json. From within consequential-bots, run:

```
npm install
```

3) Make a new bot integration inside of the consequential Slack team. Go here:

https://consequential.slack.com/services/new/bot

Enter a name for your bot, let's say Steve. As the Botkit documentation says, avoid a single task specific name.

4) After you click "Add Bot Integration", copy the API token that Slack gives you.

5) Create a .env file inside your consequential-bots repo and add a line like this:

```
SLACK_TOKEN_STEVE=<your-new-api-token>
```

6) Copy example-bot.js to your own bot file, named after your own bot, and customize:

```
cp example-bot.js steve-bot.js
```

Edit steve-bot.js and replace YOUR_BOT_NAME with STEVE or steve as appropriate.

7) Fire up your new bot:

```
node steve-bot.js
```

8) Your bot should be online! Within Slack, send it a quick direct message to say hello. It should say hello back!

Try:
  * who are you?
  * call me Bob
  * shutdown

9) Note: Your bot uses ./storage/steve to remember things.

10) See the [Botkit documentation](https://github.com/howdyai/botkit) for much more.

## What's Next

1) Deploy to heroku to keep the bots alive.
