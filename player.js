const cfg = {
  discord_bot_token: '',
  twitch_api_token: '',
  default_embed_color: 0xfec732,
  prefix: 't.'
};

const messages = {
  requesting: '`Requesting...`',
  missingchannel: '**Error:** Please give a channel name or url!',
  unknown: '**Error:** **[**Unknown Channel **|** Channel is not running any streams.**]**',
  noMemberVoiceConnection: '**Error:** You must be connected to a voice channel!',
  notJoinable: '**Error:** I cannot join your voice channel!',
  noBotVoiceConnection: '**Error:** Bot is not connected to a voice channel!'
};

const Discord = require('discord.js');
const twitchStreams = require('twitch-get-stream')(cfg.twitch_api_token);
const client = new Discord.Client();

const c = {
  'help': message => {
    const embed = embedBuilder(cfg.prefix + 'help');
    embed.addField('❯ Commands', `\`${cfg.prefix}help\` - Shows help guide.
\`${cfg.prefix}play <username/URL>\` - The bot starts playing the given Twitch stream if requirements meet.
\`${cfg.prefix}leave\` - The bot leaves the voice channel if requirements meet.`);
    message.channel.send(embed).catch(_ => { });
  },
  'play': async (message, args) => {
    let channel = args.join(' ');
    if (!channel) return message.channel.send(messages.missingchannel).catch(_ => { });

    channel = channel.includes('twitch.tv/') ? channel.split('twitch.tv/').pop() : channel;
    channel = channel.endsWith('/') ? channel.replace('/', '') : channel;

    const msg = await message.channel.send(messages.requesting).catch(_ => { });
    const stream = await twitchStreams.get(channel).catch(_ => { });

    if (!stream) return msg.edit(messages.unknown).catch(_ => { });
    if (!message.member.voiceChannel) return msg.edit(messages.noMemberVoiceConnection).catch(_ => { });
    if (!message.member.voiceChannel.joinable) return msg.edit(messages.notJoinable).catch(_ => { });

    if (message.guild.me.voiceChannel) await message.guild.me.voiceChannel.leave();

    const connection = await message.member.voiceChannel.join();
    const find = stream.find(entry => entry.quality === 'Audio Only');

    connection.playStream(find.url);

    const embed = embedBuilder(cfg.prefix + 'playstream');
    embed.addField('❯ Currently playing', `[${channel}](https://twitch.com/${channel})`);
    embed.addField('❯ Disconnect', `\`${cfg.prefix}leave\``)
    msg.edit(embed).catch(_ => { });
  },
  'leave': message => {
    if (message.guild.me.voiceChannel && message.guild.me.voiceChannel.members.size === 1) {
      message.guild.me.voiceChannel.leave();
      message.react('✅').catch(_ => { });
      return;
    };

    if (!message.guild.me.voiceChannel) return message.channel.send(messages.noBotVoiceConnection).catch(_ => { });
    if (message.member.voiceChannel.id !== message.guild.me.voiceChannel.id && message.guld.me.voiceChannel.members.size !== 1) return message.channel.send('**Error:** We are not on the same channel!').catch(_ => { });

    message.guild.me.voiceChannel.leave();
    message.react('✅').catch(_ => { });
  },
};

const embedBuilder = cmd => {
  return new Discord.RichEmbed()
    .setFooter(`${cmd} - ${client.user.username}`, client.user.displayAvatarURL)
    .setColor(cfg.default_embed_color)
    .setTimestamp();
};

client.on("message", m => {
  if (m.author.bot && m.channel.type !== 'text' && !m.content.startsWith(cfg.prefix)) return;
  const args = m.content.split(" ").slice(1);
  const cmd = m.content.toLowerCase().slice(cfg.prefix.length).split(' ')[0];
  if (c.hasOwnProperty(cmd)) c[cmd](m, args);
});

client.login(cfg.discord_bot_token).then(_ => console.log(`${client.user.tag}: Logged in!`)).catch(console.error);
client.on('error', console.error);
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);
