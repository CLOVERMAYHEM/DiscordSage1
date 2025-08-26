const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("factiontime")
    .setDescription("View your faction's total voice channel time (leaders only)"),
  async execute(interaction) {
    const member = interaction.member;
    
    // Check if user is a faction leader
    const leaderRoles = ["1406779732275499098", "1406779912441823303", "1409081159811334204"];
    const isLeader = leaderRoles.some(roleId => member.roles.cache.has(roleId));
    
    if (!isLeader) {
      return interaction.reply({ 
        content: "❌ Only faction leaders can use this command!", 
        ephemeral: true 
      });
    }
    
    // Determine which faction the leader belongs to
    let leaderFaction = null;
    const factionRoleMap = {
      "1406779732275499098": "Laughing_Meeks",
      "1406779912441823303": "Unicorn_Rapists", 
      "1409081159811334204": "Special_Activities_Directive"
    };
    
    for (const [roleId, faction] of Object.entries(factionRoleMap)) {
      if (member.roles.cache.has(roleId)) {
        leaderFaction = faction;
        break;
      }
    }
    
    if (!leaderFaction) {
      return interaction.reply({ 
        content: "❌ Could not determine your faction leadership!", 
        ephemeral: true 
      });
    }
    
    // Get faction time
    const factionTime = global.factionTimes[leaderFaction] || 0;
    const hours = Math.floor(factionTime / 3600000);
    const minutes = Math.floor((factionTime % 3600000) / 60000);
    
    // Get faction member count
    const factionDisplayName = leaderFaction.replace("_", " ");
    const factionRole = interaction.guild.roles.cache.find(r => r.name === factionDisplayName);
    const memberCount = factionRole ? factionRole.members.size : 0;
    
    // Calculate average time per member
    const avgTime = memberCount > 0 ? factionTime / memberCount : 0;
    const avgHours = Math.floor(avgTime / 3600000);
    const avgMinutes = Math.floor((avgTime % 3600000) / 60000);
    
    const factionColors = {
      "Laughing_Meeks": 0xFF6B6B,
      "Unicorn_Rapists": 0x9B59B6,
      "Special_Activities_Directive": 0x3498DB
    };
    
    const embed = new EmbedBuilder()
      .setTitle(`🏴 ${factionDisplayName} Time Statistics`)
      .setColor(factionColors[leaderFaction])
      .addFields(
        { name: "⏱️ Total Faction Time", value: `${hours}h ${minutes}m`, inline: true },
        { name: "👥 Faction Members", value: `${memberCount}`, inline: true },
        { name: "📊 Average Per Member", value: `${avgHours}h ${avgMinutes}m`, inline: true },
        { name: "📈 Ranking", value: "Use `/timeleaderboard` to see faction rankings", inline: false }
      )
      .setFooter({ text: "Voice channel time tracking - Leaders only" })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};