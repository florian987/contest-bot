'use strict';

const { Client } = require('discord.js');
require('dotenv').config();

const client = new Client();

// Log our bot in using the token from https://discordapp.com/developers/applications/me
client.login(process.env.TOKEN);

/**
 * The ready event is vital, it means that only _after_ this will your bot start reacting to information
 * received from Discord
 */
client.on('ready', () => {
  console.log('I am ready!');
});

// Create an event listener for messages
client.on('message', message => {
  // DM message, with attachment, not coming from a bot
  if (message.channel.type === 'dm' && !message.author.bot && message.attachments.size > 0) {
    console.log('Got message from ', message.author.username);
    console.log('URL: ', message.attachments.first().url);

    const mode = getMode(message.content);
    console.log('Mode: ', mode);

    client.channels.fetch(process.env.MODERATION_CHANNEL)
      .then(targetChannel => {
        sendImageForModeration(
          message.attachments.first(),
          targetChannel,
          mode
        );

        // send message to user
        message.reply('Votre photo est envoyée pour modération !');
      })
      .catch(console.error);
  }
});

// Bot post image to a channel for moderation
const sendImageForModeration = (attachment, channel, mode) => {
  const text = 'Utilisez 👍 pour valider la photo ou 👎 pour refuser\nMode: ' + mode;
  channel
    .send(text, attachment)
    .then(message => {
      waitValidation(message, mode);
    })
    .catch(console.error);
};

// Filter method for validation
const filter = (reaction) => {
  return ['👍', '👎'].includes(reaction.emoji.name);
};

// Wait for validation
const waitValidation = (message, mode) => {
  // wait for 10 hours...
  message.awaitReactions(filter, { max: 1, time: 36000 * 1000, errors: ['time'] })
    .then(collected => {
      const reaction = collected.first();

      if (reaction.emoji.name === '👍') {
        publishPicture(message, mode);
      }

      if (reaction.emoji.name === '👎') {
        message.react('🆗').catch(console.error);
      }
    })
    .catch(collected => {
      // time is over
      message.react('⌛').catch(console.error);
    });
};

const publishPicture = (message, mode) => {
  if (mode === 'forum') {
    sendImageToForum(message.attachments.first().url)
      .then(status => {
        message.react('🆗').catch(console.error);
      })
      .catch(console.error);
  } else {
    client.channels.fetch(process.env.PUBLIC_CHANNEL)
      .then(channel => {
        channel
          .send(getText(mode), message.attachments.first())
          .then(publicMessage => {
            message.react('🆗').catch(console.error);
          })
          .catch(console.error);
      })
      .catch(console.error);
  }
};

const getMode = (comment) => {
  if (comment.search('conseil') !== -1) {
    return 'advice';
  } else if (comment.search('forum') !== -1) {
    return 'forum';
  }

  return 'teasing';
};

const getText = (mode) => {
  if (mode === 'advice') {
    return '[CoCOoNTEST 3] J\'ai besoin de vos conseils !';
  }

  return '[CoCOoNTEST 3] Nouveau teasing !';
};

const sendImageToForum = (url) => {
  console.log('Send to forum');

  const https = require('https');
  const data = 'url=' + url;
  const options = {
    hostname: process.env.FORUM_HOSTNAME,
    port: 443,
    path: '/api.php',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': data.length,
      'X-AUTH-TOKEN': process.env.FORUM_TOKEN
    }
  };

  return new Promise(function (resolve, reject) {
    const req = https.request(options, res => {
      console.log(`statusCode: ${res.statusCode}`);

      // reject on bad status
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error('statusCode=' + res.statusCode));
      }

      // resolve on data
      res.on('data', function () {
        resolve('ok');
      });
    });

    // reject on request error
    req.on('error', function (err) {
      reject(err);
    });

    req.write(data);
    req.end();
  });
};
