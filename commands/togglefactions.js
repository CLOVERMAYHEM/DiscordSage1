const { SlashCommandBuilder } = require("discord.js");
const { isUserBotAdmin } = require('./stick.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("togglefactions")
    .setDescription("Enable or disable faction features for this server (Bot Admin only)")
    .addBooleanOption(option =>
      option.setName("enabled")
        .setDescription("Enable (true) or disable (false) faction features")
        .setRequired(true)),
  async execute(interaction) {
    // Check if user is bot admin
    if (!await isUserBotAdmin(interaction.member)) {
      return interaction.reply({ 
        content: "❌ Only bot administrators can manage faction settings!", 
        ephemeral: true 
      });
    }

    const enabled = interaction.options.getBoolean("enabled");
    const guildId = interaction.guild.id;
    
    // Initialize guild settings if not exists
    if (!global.guildSettings) global.guildSettings = {};
    if (!global.guildSettings[guildId]) {
      global.guildSettings[guildId] = {
        factionsEnabled: true, // Default to enabled
        clockInChannelId: null,
        notificationChannelId: null
      };
    }
    
    // Update faction setting
    global.guildSettings[guildId].factionsEnabled = enabled;
    
    const status = enabled ? "enabled" : "disabled";
    const emoji = enabled ? "✅" : "❌";
    
    await interaction.reply({
      content: `${emoji} Faction features have been **${status}** for this server!\n\n` +
               `${enabled ? 
                 "• Voice time tracking will contribute to faction totals\n• Faction commands are active\n• Motivational DMs will be sent\n• Faction-based features are operational" :
                 "• Voice time tracking will NOT contribute to faction totals\n• Faction commands are disabled\n• No motivational DMs will be sent\n• Only basic time tracking remains active"
               }`,
      ephemeral: true
    });
  },
};
