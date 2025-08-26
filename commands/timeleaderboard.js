const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("timeleaderboard")
    .setDescription("Show faction voice channel time leaderboard"),
  async execute(interaction) {
    const factionTimes = global.factionTimes || {
      "Laughing_Meeks": 0,
      "Unicorn_Rapists": 0,
      "Special_Activities_Directive": 0
    };
    
    // Convert times and sort
    const factionData = [];
    for (const [factionKey, totalTime] of Object.entries(factionTimes)) {
      const factionDisplayName = factionKey.replace("_", " ");
      const role = interaction.guild.roles.cache.find(r => r.name === factionDisplayName);
      const memberCount = role ? role.members.size : 0;
      
      const hours = Math.floor(totalTime / 3600000);
      const minutes = Math.floor((totalTime % 3600000) / 60000);
      
      // Calculate average time per member
      const avgTime = memberCount > 0 ? totalTime / memberCount : 0;
      const avgHours = Math.floor(avgTime / 3600000);
      const avgMinutes = Math.floor((avgTime % 3600000) / 60000);
      
      factionData.push({
        name: factionDisplayName,
        totalTime: totalTime,
        timeString: `${hours}h ${minutes}m`,
        memberCount: memberCount,
        avgTime: avgTime,
        avgTimeString: `${avgHours}h ${avgMinutes}m`
      });
    }
    
    // Sort by total time (descending)
    factionData.sort((a, b) => b.totalTime - a.totalTime);
    
    const embed = new EmbedBuilder()
      .setTitle("🏆 Faction Voice Time Leaderboard")
      .setColor(0xFFD700)
      .setDescription("Rankings based on total voice channel time")
      .setTimestamp();
    
    let leaderboardText = "";
    factionData.forEach((faction, index) => {
      const medals = ["🥇", "🥈", "🥉"];
      const medal = medals[index] || "🏅";
      
      leaderboardText += `${medal} **${faction.name}**\n`;
      leaderboardText += `⏱️ Total Time: ${faction.timeString}\n`;
      leaderboardText += `👥 Members: ${faction.memberCount}\n`;
      leaderboardText += `📊 Avg per member: ${faction.avgTimeString}\n\n`;
    });
    
    embed.addFields({ 
      name: "🏴 Faction Rankings", 
      value: leaderboardText || "No time data available", 
      inline: false 
    });
    
    // Add some stats
    const totalTime = factionData.reduce((sum, f) => sum + f.totalTime, 0);
    const totalHours = Math.floor(totalTime / 3600000);
    const totalMinutes = Math.floor((totalTime % 3600000) / 60000);
    
    embed.addFields({
      name: "📈 Server Statistics",
      value: `🎯 Combined Faction Time: ${totalHours}h ${totalMinutes}m\n🏴‍☠️ Most Active: ${factionData[0]?.name || "None"}\n📊 Competition Level: ${factionData.length > 1 ? "High" : "Low"}`,
      inline: false
    });
    
    await interaction.reply({ embeds: [embed] });
  },
};