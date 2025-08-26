const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("factionstats")
    .setDescription("Display faction statistics and leaderboard"),
  async execute(interaction) {
    const guild = interaction.guild;
    
    // Faction mapping
    const factions = {
      "Laughing_Meeks": "Laughing Meeks",
      "Unicorn_Rapists": "Unicorn Rapists", 
      "Special_Activities_Directive": "Special Activities Directive"
    };

    let statsData = [];
    
    for (const [key, displayName] of Object.entries(factions)) {
      const role = guild.roles.cache.find(r => r.name === displayName);
      if (role) {
        const memberCount = role.members.size;
        statsData.push({
          name: displayName,
          members: memberCount,
          role: role
        });
      }
    }

    // Sort by member count
    statsData.sort((a, b) => b.members - a.members);

    const embed = new EmbedBuilder()
      .setTitle("🏆 Faction Leaderboard")
      .setColor(0x00AE86)
      .setThumbnail(interaction.guild.iconURL())
      .setTimestamp();

    let description = "**🎯 Compete for faction dominance!**\n\n";
    statsData.forEach((faction, index) => {
      const medals = ["🥇", "🥈", "🥉"];
      const medal = medals[index] || "🏅";
      const percentage = ((faction.members / guild.memberCount) * 100).toFixed(1);
      const progressBar = "█".repeat(Math.max(1, Math.round(percentage / 5))) + "░".repeat(20 - Math.max(1, Math.round(percentage / 5)));
      
      description += `${medal} **${faction.name}**\n`;
      description += `👥 ${faction.members} members (${percentage}%)\n`;
      description += `${progressBar}\n\n`;
    });

    embed.setDescription(description);
    embed.addFields({
      name: "📈 Server Statistics",
      value: `🎯 Total Faction Members: ${statsData.reduce((sum, f) => sum + f.members, 0)}\n📊 Total Server Members: ${guild.memberCount}\n🏴‍☠️ Faction Participation: ${(statsData.reduce((sum, f) => sum + f.members, 0) / guild.memberCount * 100).toFixed(1)}%\n💪 Competition Level: ${statsData.length > 1 ? "Active" : "Recruiting"}`,
      inline: false
    });

    await interaction.reply({ embeds: [embed] });
  },
};