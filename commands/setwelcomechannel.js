const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setwelcomechannel")
    .setDescription("Set the channel where welcome messages are sent")
    .addChannelOption(option => 
      option.setName("channel")
        .setDescription("The channel to send welcome messages to")
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");
    
    // Check if it's a text channel
    if (channel.type !== 0) {
      return interaction.reply({ 
        content: "❌ Please select a text channel!", 
        ephemeral: true 
      });
    }
    
    // Initialize guild settings if not exists
    const guildId = interaction.guild.id;
    if (!global.guildSettings) global.guildSettings = {};
    if (!global.guildSettings[guildId]) {
      global.guildSettings[guildId] = {
        factionsEnabled: true,
        clockInChannelId: null,
        notificationChannelId: null,
        welcomeChannelId: null
      };
    }
    
    // Store the welcome channel ID for this guild
    global.guildSettings[guildId].welcomeChannelId = channel.id;
    
    await interaction.reply({ 
      content: `✅ Welcome messages will now be sent to ${channel}!`, 
      ephemeral: true 
    });
  },
};