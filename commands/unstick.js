const { SlashCommandBuilder } = require("discord.js");
const { isUserBotAdmin } = require('./stick.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unstick")
    .setDescription("Remove sticky message from a channel")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("Channel to remove sticky message from (default: current)")
        .setRequired(false)),
  async execute(interaction) {
    const targetChannel = interaction.options.getChannel("channel") || interaction.channel;
    
    // Check if user is bot admin
    if (!await isUserBotAdmin(interaction.member)) {
      return interaction.reply({ 
        content: "❌ Only bot administrators can remove sticky messages!", 
        ephemeral: true 
      });
    }
    
    if (!global.stickyMessages || !global.stickyMessages[targetChannel.id]) {
      return interaction.reply({ 
        content: "❌ No sticky message found in that channel!", 
        ephemeral: true 
      });
    }
    
    try {
      // Delete the sticky message
      const stickyData = global.stickyMessages[targetChannel.id];
      const message = await targetChannel.messages.fetch(stickyData.messageId);
      await message.delete();
      
      // Remove from storage
      delete global.stickyMessages[targetChannel.id];
      
      await interaction.reply({ 
        content: `✅ Sticky message removed from ${targetChannel}!`, 
        ephemeral: true 
      });
      
    } catch (error) {
      console.error("Error removing sticky message:", error);
      await interaction.reply({ 
        content: "❌ Failed to remove sticky message!", 
        ephemeral: true 
      });
    }
  },
};