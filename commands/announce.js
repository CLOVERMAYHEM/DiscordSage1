const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Make a faction announcement (Leaders only)")
    .addStringOption(option =>
      option.setName("message")
        .setDescription("Your announcement message")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("type")
        .setDescription("Type of announcement")
        .setRequired(false)
        .addChoices(
          { name: "📢 General", value: "general" },
          { name: "⚔️ Battle Call", value: "battle" },
          { name: "🏆 Achievement", value: "achievement" },
          { name: "📅 Event", value: "event" },
          { name: "🚨 Important", value: "important" }
        )),
  async execute(interaction) {
    const member = interaction.member;
    const message = interaction.options.getString("message");
    const type = interaction.options.getString("type") || "general";
    
    // Check if user is a faction leader
    const leaderRoles = ["1406779732275499098", "1406779912441823303", "1409081159811334204"];
    const isLeader = leaderRoles.some(roleId => member.roles.cache.has(roleId));
    
    if (!isLeader) {
      return interaction.reply({ 
        content: "❌ Only faction leaders can make announcements!", 
        ephemeral: true 
      });
    }
    
    // Determine leader's faction
    let leaderFaction = null;
    let factionDisplayName = null;
    const factionRoleMap = {
      "1406779732275499098": { key: "Laughing_Meeks", name: "Laughing Meeks" },
      "1406779912441823303": { key: "Unicorn_Rapists", name: "Unicorn Rapists" },
      "1409081159811334204": { key: "Special_Activities_Directive", name: "Special Activities Directive" }
    };
    
    for (const [roleId, factionInfo] of Object.entries(factionRoleMap)) {
      if (member.roles.cache.has(roleId)) {
        leaderFaction = factionInfo.key;
        factionDisplayName = factionInfo.name;
        break;
      }
    }
    
    if (!leaderFaction) {
      return interaction.reply({ 
        content: "❌ Could not determine your faction leadership!", 
        ephemeral: true 
      });
    }
    
    // Get faction role for mentions
    const factionRole = interaction.guild.roles.cache.find(r => r.name === factionDisplayName);
    
    const announcementTypes = {
      general: { emoji: "📢", color: 0x3498DB, title: "Faction Announcement" },
      battle: { emoji: "⚔️", color: 0xFF6B6B, title: "Battle Call" },
      achievement: { emoji: "🏆", color: 0xFFD700, title: "Faction Achievement" },
      event: { emoji: "📅", color: 0x9B59B6, title: "Faction Event" },
      important: { emoji: "🚨", color: 0xFF0000, title: "Important Notice" }
    };
    
    const announcementInfo = announcementTypes[type];
    
    const embed = new EmbedBuilder()
      .setTitle(`${announcementInfo.emoji} ${announcementInfo.title}`)
      .setColor(announcementInfo.color)
      .setDescription(message)
      .addFields(
        { name: "🏴 From", value: `**${factionDisplayName}** Leadership`, inline: true },
        { name: "👤 Leader", value: `<@${interaction.user.id}>`, inline: true },
        { name: "📅 Posted", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();
    
    // Send announcement
    let announcementContent = "";
    if (factionRole && type === "important") {
      announcementContent = `${factionRole} **IMPORTANT FACTION ANNOUNCEMENT**`;
    } else if (factionRole) {
      announcementContent = `${factionRole}`;
    }
    
    await interaction.reply({ 
      content: announcementContent,
      embeds: [embed] 
    });
    
    // Award points for leadership activity
    if (!global.factionPoints) global.factionPoints = {
      "Laughing_Meeks": { points: 0, victories: 0, activities: 0 },
      "Unicorn_Rapists": { points: 0, victories: 0, activities: 0 },
      "Special_Activities_Directive": { points: 0, victories: 0, activities: 0 }
    };
    
    global.factionPoints[leaderFaction].points += 5;
    global.factionPoints[leaderFaction].activities += 1;
  },
};