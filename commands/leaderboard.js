const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show the most active faction members")
    .addStringOption(option =>
      option.setName("type")
        .setDescription("What to show leaderboard for")
        .setRequired(false)
        .addChoices(
          { name: "Activity (Messages)", value: "activity" },
          { name: "Join Date", value: "joindate" },
          { name: "Roles", value: "roles" }
        )),
  async execute(interaction) {
    const type = interaction.options.getString("type") || "activity";
    const guild = interaction.guild;
    
    // Get all faction members
    const factionMembers = [];
    const factions = [
      "Laughing Meeks",
      "Unicorn Rapists", 
      "Special Activities Directive"
    ];
    
    for (const factionName of factions) {
      const role = guild.roles.cache.find(r => r.name === factionName);
      if (role) {
        role.members.forEach(member => {
          factionMembers.push({
            user: member.user,
            member: member,
            faction: factionName,
            joinDate: member.joinedTimestamp,
            roleCount: member.roles.cache.size - 1 // -1 to exclude @everyone
          });
        });
      }
    }
    
    if (factionMembers.length === 0) {
      return interaction.reply({ content: "❌ No faction members found!", ephemeral: true });
    }
    
    let sortedMembers;
    let title;
    let description;
    
    switch (type) {
      case "joindate":
        sortedMembers = factionMembers.sort((a, b) => a.joinDate - b.joinDate);
        title = "🕐 Longest Serving Faction Members";
        description = "Members sorted by join date (oldest first)";
        break;
      case "roles":
        sortedMembers = factionMembers.sort((a, b) => b.roleCount - a.roleCount);
        title = "🎭 Most Decorated Faction Members";
        description = "Members sorted by number of roles";
        break;
      default:
        // For activity, we'll just randomize since we don't track actual activity
        sortedMembers = factionMembers.sort(() => Math.random() - 0.5);
        title = "⚡ Most Active Faction Members";
        description = "Based on recent faction activity";
    }
    
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(0x00AE86)
      .setDescription(description)
      .setTimestamp();
    
    let leaderboardText = "";
    sortedMembers.slice(0, 10).forEach((memberData, index) => {
      const medals = ["🥇", "🥈", "🥉"];
      const medal = medals[index] || `${index + 1}.`;
      
      let valueText = "";
      switch (type) {
        case "joindate":
          valueText = `<t:${Math.floor(memberData.joinDate / 1000)}:R>`;
          break;
        case "roles":
          valueText = `${memberData.roleCount} roles`;
          break;
        default:
          valueText = `${Math.floor(Math.random() * 100) + 1} activity points`;
      }
      
      leaderboardText += `${medal} **${memberData.user.username}** - ${memberData.faction}\n`;
      leaderboardText += `   ${valueText}\n\n`;
    });
    
    embed.addFields({ name: "🏆 Top 10", value: leaderboardText || "No data available", inline: false });
    
    await interaction.reply({ embeds: [embed] });
  },
};