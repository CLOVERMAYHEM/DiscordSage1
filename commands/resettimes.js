const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { isUserBotAdmin } = require('./stick.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resettimes")
    .setDescription("Reset all faction voice channel times (Bot Admin only)"),
  async execute(interaction) {
    // Check if user is bot admin
    if (!await isUserBotAdmin(interaction.member)) {
      return interaction.reply({ 
        content: "❌ Only bot administrators can reset faction times!", 
        ephemeral: true 
      });
    }
    // Create confirmation buttons
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_reset_times')
          .setLabel('✅ Confirm Reset')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('cancel_reset_times')
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Secondary)
      );
    
    await interaction.reply({
      content: "⚠️ **WARNING:** This will reset ALL faction voice channel times to 0!\n\nThis action cannot be undone. Are you sure you want to continue?",
      components: [row],
      ephemeral: true
    });
  },
};

// Handle reset confirmation buttons (this would be added to main index.js)
module.exports.handleResetButton = async (interaction) => {
  if (interaction.customId === 'confirm_reset_times') {
    // Reset all faction times
    global.factionTimes = {
      "Laughing_Meeks": 0,
      "Unicorn_Rapists": 0,
      "Special_Activities_Directive": 0
    };
    
    await interaction.update({
      content: "✅ All faction voice channel times have been reset to 0!",
      components: []
    });
    
    // Send notification to clock-in channel if set
    if (global.clockInChannelId) {
      const clockInChannel = interaction.guild.channels.cache.get(global.clockInChannelId);
      if (clockInChannel) {
        const embed = {
          color: 0xFF6B6B,
          title: "🔄 Faction Times Reset",
          description: "All faction voice channel times have been reset to 0 by an administrator.",
          fields: [
            { name: "👤 Reset by", value: `<@${interaction.user.id}>`, inline: true },
            { name: "📅 Reset time", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
          ],
          timestamp: new Date().toISOString()
        };
        
        await clockInChannel.send({ embeds: [embed] });
      }
    }
    
    return true;
  } else if (interaction.customId === 'cancel_reset_times') {
    await interaction.update({
      content: "❌ Reset cancelled. Faction times remain unchanged.",
      components: []
    });
    return true;
  }
  
  return false;
};