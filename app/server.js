import botkit from 'botkit';

// botkit controller
const controller = botkit.slackbot({
  debug: false,
});

// initialize slackbot
const slackbot = controller.spawn({
  token: process.env.SLACK_BOT_TOKEN,
  // this grabs the slack token we exported earlier
}).startRTM(err => {
  // start the real time message client
  if (err) { throw new Error(err); }
});

const Yelp = require('yelp');

const yelp = new Yelp({
  consumer_key: process.env.YELP_KEY,
  consumer_secret: process.env.YELP_KEY_SECRET,
  token: process.env.YELP_TOKEN,
  token_secret: process.env.YELP_TOKEN_SECRET,
});

// prepare webhook
// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});

// example hello response
controller.hears(['hello', 'hi', 'howdy', 'whatsup'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Hello, ${res.user.name}!`);
    } else {
      bot.reply(message, 'Hello there!');
    }
  });
});

// Restaurant recommender
// Based on code here: https://github.com/howdyai/botkit/blob/master/readme.md#receiving-messages
controller.hears(['hungry', 'food', 'eat', 'restaurant', 'feed'], ['direct_message', 'direct_mention'], (bot, message) => {
  function askType(response, convo) {
    convo.ask('What type of food do you want?', (food, convo) => {
      convo.say('Awesome.');
      askQuality(response, convo, food);
      convo.next();
    });
  }
  function askQuality(response, convo, food) {
    convo.ask('What minimum average rating can you handle?', (rating, convo) => {
      convo.say('Ok.');
      askWhere(response, convo, food, rating);
      convo.next();
    });
  }
  function askWhere(response, convo, typeOfFood, minRating) {
    convo.ask('So where are you?', (location, convo) => {
      convo.say('Ok! Searching Yelp!');
      doSearch(typeOfFood, minRating, location, convo);
      convo.next();
    });
  }

  function doSearch(food, rating, myLoc, convo) {
    yelp.search({ term: `${food.text}`, location: `${myLoc.text}` })
    .then((data) => {
      data.businesses.forEach(business => {
        if (business.rating > parseFloat(`${rating.text}`)) {
          convo.say(`Business name: ${business.name} \nReview Sample: ${business.snippet_text}
            - - - - - - - - - - - - - - - - - - -`);
        }
      });
    })
    .catch((err) => {
      console.error(err);
    });
    convo.next();
  }

  bot.startConversation(message, askType);
});

// A silly conversation about the weather
controller.hears(['weather', 'sun', 'rain', 'cloud', 'forecast'], ['direct_message', 'direct_mention'], (bot, message) => {
  function mentionWeather(weatherResponse, weatherConvo) {
    weatherConvo.ask('The weather is nice today, isn\'t it?', (weatherResponse, weatherConvo) => {
      weatherConvo.say('I just love seeing the sun!');
      giveAdvice(weatherResponse, weatherConvo);
      weatherConvo.next();
    });
  }
  function giveAdvice(weatherResponse, weatherConvo) {
    weatherConvo.ask('Make sure to put on sunscreen!', (weatherResponse, weatherConvo) => {
      weatherConvo.say('It would be a shame to get burnt');
      sayBye(weatherResponse, weatherConvo);
      weatherConvo.next();
    });
  }
  function sayBye(weatherResponse, weatherConvo) {
    weatherConvo.ask('Enjoy your day, my friend.', (weatherResponse, weatherConvo) => {
      weatherConvo.say('Talk to you soon!');
      weatherConvo.next();
    });
  }

  bot.startConversation(message, mentionWeather);
});

// Using attachments
controller.hears(['dog'], ['direct_message,direct_mention'], (bot, message) => {
  const replyWithAttachments = {
    username: 'Bot Edwards',
    text: 'You requested a dog.',
    attachments: [
      {
        fallback: 'To be useful, I need you to invite me in a channel.',
        title: 'Magic Carpet Dog',
        text: 'Be happy ',
        color: '#FF5733',
        image_url: 'https://media.giphy.com/media/yXBqba0Zx8S4/giphy.gif',
      },
    ],
    icon_url: 'http://r.ddmcdn.com/s_f/o_1/cx_633/cy_0/cw_1725/ch_1725/w_720/APL/uploads/2014/11/too-cute-doggone-it-video-playlist.jpg',
  };

  bot.reply(message, replyWithAttachments);
});


// Help message
controller.hears(['help'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'Hello there. I see you need some assistance! I can provide restaurant recommendations near you. \
I can also talk about the weather!');
});

// Announces its presence when mentioned, regardless of context
controller.hears([''], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'what do you need?');
});

// Uncomment this section to make a mean bot
// controller.on('user_typing', (bot, message) => {
//   bot.reply(message, 'Stop typing! Do you think I want to talk to you!?!!');
// });
