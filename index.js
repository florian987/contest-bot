'use strict';

// Extract the required classes from the discord.js module
const { Client, MessageAttachment, MessageEmbed } = require('discord.js');

require('dotenv').config();

// Create an instance of a Discord client
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
    console.log('Mode: ', getPhotoText(message.content))

    client.channels.fetch(process.env.MODERATION_CHANNEL)
      .then(targetChannel => {
        sendImageForModeration(
          message.attachments.first(),
          targetChannel,
          getPhotoText(message.content)
        );

        // send message to user
        message.reply('Votre photo est envoyée pour modération !');
      })
      .catch(console.error);
  }
});

// Bot post image to a channel for moderation
const sendImageForModeration = (attachment, channel, text) => {
  channel
    .send('Utilisez 👍 pour valider la photo ou 👎 pour refuser', attachment)
    .then(message => {
      waitValidation(message, text);
    })
    .catch(console.error);
};

// Filter method for validation
const filter = (reaction) => {
  return ['👍', '👎'].includes(reaction.emoji.name);
};

// Wait for validation
const waitValidation = (message, text) => {
  // wait for 10 hours...
  message.awaitReactions(filter, { max: 1, time: 36000 * 1000, errors: ['time'] })
    .then(collected => {
      const reaction = collected.first();

      if (reaction.emoji.name === '👍') {
        sendToPublicChannel(message, text);
      }

      message
        .react('🆗')
        .catch(console.error);
    })
    .catch(collected => {
      // time is over
      message
        .react('⌛')
        .catch(console.error);
    });
};

const sendToPublicChannel = (message, text) => {
  client.channels.fetch(process.env.PUBLIC_CHANNEL)
  .then(channel => {
    channel
      .send(text, message.attachments.first())
      .catch(console.error);
  })
  .catch(console.error);
}

const getPhotoText = (text) => {
  if (text.search('conseil') !== -1) {
    return '[CoCOoNTEST 3] J\'ai besoin de vos conseils !';
  }

  return '[CoCOoNTEST 3] Nouveau teasing !';
} 
