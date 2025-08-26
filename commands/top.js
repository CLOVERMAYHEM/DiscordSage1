const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("top")
    .setDescription("Show top performers in various categories")
    .addStringOption(option =>
      option.setName("category")
        .setDescription("What to rank by")
        .setRequired(true)
        .addChoices(
          { name: "🕐 Voice Time", value: "time" },
          { name: "⚔️ Battle Victories", value: "battles" },
          { name: "🏆 Achievement Points", value: "achievements" },
          { name: "📈 Activity Score", value: "activity" },
          { name: "💯 Longest Session", value: "session" }
        )),
  async execute(interaction) {
    const category = interaction.options.getString("category");
    
    // Get all faction members
    const factionMembers = [];
    const factions = [
      "Laughing Meeks",
      "Unicorn Rapists", 
      "Special Activities Directive"
    ];
    
    for (const factionName of factions) {
      const role = interaction.guild.roles.cache.find(r => r.name === factionName);
      if (role) {
        for (const member of role.members.values()) {
          const userData = global.userTimes?.[member.id] || { totalTime: 0, sessions: 0, longestSession: 0 };
          const achievementData = global.userAchievements?.[member.id] || { totalPoints: 0, unlocked: [] };
          
          factionMembers.push({
            user: member.user,
            faction: factionName,
            totalTime: userData.totalTime,
            sessions: userData.sessions,
            longestSession: userData.longestSession,
            achievementPoints: achievementData.totalPoints,
            activityScore: calculateActivityScore(member.id),
            battleWins: getBattleWins(member.id)
          });
        }
      }
    }
    
    if (factionMembers.length === 0) {
      return interaction.reply({ content: "❌ No faction members found!", ephemeral: true });
    }
    
    // Sort based on category
    let sortedMembers;
    let title;
    let valueFormatter;
    
    switch (category) {
      case "time":
        sortedMembers = factionMembers.sort((a, b) => b.totalTime - a.totalTime);
        title = "🕐 Top Voice Time Champions";
        valueFormatter = (member) => {
          const hours = Math.floor(member.totalTime / 3600000);
          const minutes = Math.floor((member.totalTime % 3600000) / 60000);
          return `${hours}h ${minutes}m`;
        };
        break;
      case "battles":
        sortedMembers = factionMembers.sort((a, b) => b.battleWins - a.battleWins);
        title = "⚔️ Top Battle Warriors";
        valueFormatter = (member) => `${member.battleWins} victories`;
        break;
      case "achievements":
        sortedMembers = factionMembers.sort((a, b) => b.achievementPoints - a.achievementPoints);
        title = "🏆 Top Achievement Hunters";
        valueFormatter = (member) => `${member.achievementPoints} points`;
        break;
      case "activity":
        sortedMembers = factionMembers.sort((a, b) => b.activityScore - a.activityScore);
        title = "📈 Most Active Members";
        valueFormatter = (member) => `${member.activityScore} activity`;
        break;
      case "session":
        sortedMembers = factionMembers.sort((a, b) => b.longestSession - a.longestSession);
        title = "💯 Longest Session Records";
        valueFormatter = (member) => {
          const hours = Math.floor(member.longestSession / 3600000);
          const minutes = Math.floor((member.longestSession % 3600000) / 60000);
          return `${hours}h ${minutes}m`;
        };
        break;
    }
    
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(0xFFD700)
      .setDescription("The elite performers across all factions!")
      .setTimestamp();
    
    // Show top 10
    let leaderboardText = "";
    sortedMembers.slice(0, 10).forEach((member, index) => {
      const medals = ["🥇", "🥈", "🥉"];
      const medal = medals[index] || `${index + 1}.`;
      
      leaderboardText += `${medal} **${member.user.username}**\n`;
      leaderboardText += `🏴 ${member.faction} • ${valueFormatter(member)}\n\n`;
    });
    
    embed.addFields({
      name: "🏆 Top 10 Rankings",
      value: leaderboardText.slice(0, 1024),
      inline: false
    });
    
    // Add overall stats
    const totalValue = sortedMembers.reduce((sum, member) => {
      switch (category) {
        case "time": return sum + member.totalTime;
        case "battles": return sum + member.battleWins;
        case "achievements": return sum + member.achievementPoints;
        case "activity": return sum + member.activityScore;
        case "session": return Math.max(sum, member.longestSession);
        default: return sum;
      }
    }, 0);
    
    let statsText = "";
    if (category === "time") {
      const hours = Math.floor(totalValue / 3600000);
      const minutes = Math.floor((totalValue % 3600000) / 60000);
      statsText = `🎯 Combined Time: ${hours}h ${minutes}m\n📊 Average per Member: ${Math.round(totalValue / sortedMembers.length / 3600000 * 10) / 10}h`;
    } else if (category === "session") {
      const hours = Math.floor(totalValue / 3600000);
      const minutes = Math.floor((totalValue % 3600000) / 60000);
      statsText = `🏆 Server Record: ${hours}h ${minutes}m\n👤 Record Holder: ${sortedMembers[0].user.username}`;
    } else {
      statsText = `📊 Total ${category}: ${totalValue}\n📈 Average per Member: ${Math.round(totalValue / sortedMembers.length)}`;
    }
    
    embed.addFields({
      name: "📈 Server Statistics",
      value: statsText,
      inline: false
    });
    
    await interaction.reply({ embeds: [embed] });
  },
};

function calculateActivityScore(userId) {
  const userData = global.userTimes?.[userId] || {};
  const achievementData = global.userAchievements?.[userId] || {};
  
  const timePoints = Math.floor((userData.totalTime || 0) / 3600000); // 1 point per hour
  const sessionPoints = (userData.sessions || 0) * 2; // 2 points per session
  const achievementPoints = (achievementData.totalPoints || 0);
  
  return timePoints + sessionPoints + achievementPoints;
}

function getBattleWins(userId) {
  // This would be tracked in battle system - for now return 0
  return global.userBattleWins?.[userId] || 0;
}