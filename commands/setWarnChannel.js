const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwarnchannel')
    .setDescription('Sets the channel for invite link warnings.')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send warnings to.')
        .addChannelTypes(ChannelType.GuildText) // Restrict to text channels
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // Only allow server managers to use this command

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');

    // Make sure global.warnChannelId exists and is initialized
    if (!global.warnChannelId) {
      global.warnChannelId = null; 
    }
    
    global.warnChannelId = channel.id;

    await interaction.reply({
      content: `✅ Warning channel set to ${channel}!`,
      ephemeral: true,
    });
  },
};
