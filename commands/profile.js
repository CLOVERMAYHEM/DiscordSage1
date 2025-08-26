const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View user faction profile")
    .addUserOption(option => 
      option.setName("user")
        .setDescription("User to view profile for (defaults to yourself)")
        .setRequired(false)),
  async execute(interaction) {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id);
    
    // Check faction membership
    const factions = [
      "Laughing Meeks",
      "Unicorn Rapists", 
      "Special Activities Directive"
    ];
    
    let userFaction = "None";
    let isLeader = false;
    
    for (const factionName of factions) {
      const role = interaction.guild.roles.cache.find(r => r.name === factionName);
      if (role && member.roles.cache.has(role.id)) {
        userFaction = factionName;
        break;
      }
    }
    
    // Check if leader (simplified check)
    const leaderRoles = ["1406779732275499098", "1406779912441823303", "1409081159811334204"];
    isLeader = leaderRoles.some(roleId => member.roles.cache.has(roleId));
    
    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Profile`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setColor(userFaction === "None" ? 0x666666 : 0x00AE86)
      .addFields(
        { name: "👤 Discord Name", value: targetUser.tag, inline: true },
        { name: "📅 Joined Server", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: "🏴 Current Faction", value: userFaction, inline: true },
        { name: "👑 Leadership", value: isLeader ? "✅ Faction Leader" : "❌ Not a Leader", inline: true },
        { name: "🎭 Roles", value: member.roles.cache.filter(r => r.name !== "@everyone").map(r => r.name).join(", ") || "None", inline: false }
      )
      .setTimestamp();
    
    if (userFaction !== "None") {
      embed.setFooter({ text: `Proud member of ${userFaction}!` });
    }
    
    await interaction.reply({ embeds: [embed] });
  },
};