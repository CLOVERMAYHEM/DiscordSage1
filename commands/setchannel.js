const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setchannel")
    .setDescription("Set the channel where faction join requests are sent")
    .addChannelOption(option => 
      option.setName("channel")
        .setDescription("The channel to send notifications to")
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
    
    // Store the channel ID globally
    global.notificationChannelId = channel.id;
    
    await interaction.reply({ 
      content: `✅ Faction join requests will now be sent to ${channel}!`, 
      ephemeral: true 
    });
  },
};