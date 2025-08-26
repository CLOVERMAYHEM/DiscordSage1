const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { isUserBotAdmin } = require('./stick.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("checkvoice")
    .setDescription("Debug voice channel tracking setup (Bot Admin only)"),
  async execute(interaction) {
    // Check if user is bot admin
    if (!await isUserBotAdmin(interaction.member)) {
      return interaction.reply({ 
        content: "❌ Only bot administrators can use debug commands!", 
        ephemeral: true 
      });
    }

    const guild = interaction.guild;
    
    // Get all voice channels
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2);
    
    const embed = new EmbedBuilder()
      .setTitle("🔧 Voice Channel Tracking Debug")
      .setColor(0x3498DB)
      .setTimestamp();
    
    let voiceChannelsList = "";
    let trackedChannels = "";
    
    // List all voice channels
    voiceChannels.forEach(channel => {
      voiceChannelsList += `🔊 **${channel.name}** (ID: ${channel.id})\n`;
      trackedChannels += `✅ **${channel.name}** - Will be tracked\n`;
    });
    
    if (!voiceChannelsList) {
      voiceChannelsList = "❌ No voice channels found!";
      trackedChannels = "❌ No voice channels to track!";
    } else {
      trackedChannels = "✅ **All voice channels** are tracked!\nFaction determined by user roles.";
    }
    
    embed.addFields(
      { name: "🔊 All Voice Channels", value: voiceChannelsList.slice(0, 1024), inline: false },
      { name: "✅ Tracked Channels", value: trackedChannels.slice(0, 1024), inline: false }
    );
    
    // Check clock-in channel
    let clockInStatus = "❌ Not set - Use `/setclockchannel #channel`";
    if (global.clockInChannelId) {
      const clockInChannel = guild.channels.cache.get(global.clockInChannelId);
      if (clockInChannel) {
        clockInStatus = `✅ Set to ${clockInChannel}`;
      } else {
        clockInStatus = "❌ Set but channel not found - Use `/setclockchannel #channel`";
      }
    }
    
    embed.addFields(
      { name: "📬 Clock-in Channel", value: clockInStatus, inline: false },
      { name: "👥 Currently Tracking", value: `${Object.keys(global.timeTracking || {}).length} users in voice`, inline: true },
      { name: "📊 Bot Permissions", value: guild.members.me.permissions.has('ViewChannel') && guild.members.me.permissions.has('Connect') ? "✅ Has voice permissions" : "❌ Missing voice permissions", inline: true }
    );
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};