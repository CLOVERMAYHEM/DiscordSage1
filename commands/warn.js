const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

// Initialize warnings system
if (!global.userWarnings) global.userWarnings = {};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Issue a warning to a faction member (Leaders only)")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("User to warn")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("Reason for the warning")
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName("dm")
        .setDescription("Send warning via DM (default: false)")
        .setRequired(false)),
  async execute(interaction) {
    const member = interaction.member;
    const targetUser = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");
    const sendDM = interaction.options.getBoolean("dm") || false;
    
    // Check if user is a faction leader
    const leaderRoles = ["1406779732275499098", "1406779912441823303", "1409081159811334204"];
    const isLeader = leaderRoles.some(roleId => member.roles.cache.has(roleId));
    
    if (!isLeader) {
      return interaction.reply({ 
        content: "❌ Only faction leaders can issue warnings!", 
        ephemeral: true 
      });
    }
    
    // Initialize user warnings
    if (!global.userWarnings[targetUser.id]) {
      global.userWarnings[targetUser.id] = [];
    }
    
    const warning = {
      id: Date.now().toString(),
      reason: reason,
      issuedBy: interaction.user.id,
      issuedAt: Date.now(),
      guild: interaction.guild.id
    };
    
    global.userWarnings[targetUser.id].push(warning);
    const warningCount = global.userWarnings[targetUser.id].length;
    
    const embed = new EmbedBuilder()
      .setTitle("⚠️ Official Warning Issued")
      .setColor(0xFF6B00)
      .addFields(
        { name: "👤 Member", value: `<@${targetUser.id}>`, inline: true },
        { name: "👮 Issued by", value: `<@${interaction.user.id}>`, inline: true },
        { name: "📝 Warning #", value: `${warningCount}`, inline: true },
        { name: "📋 Reason", value: reason, inline: false },
        { name: "📅 Date", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setTimestamp();
    
    // Add severity info based on warning count
    if (warningCount >= 3) {
      embed.addFields({
        name: "🚨 Severity Level",
        value: "**HIGH RISK** - Multiple warnings issued. Consider faction disciplinary action.",
        inline: false
      });
      embed.setColor(0xFF0000);
    } else if (warningCount >= 2) {
      embed.addFields({
        name: "⚠️ Severity Level", 
        value: "**MODERATE** - Repeated behavior noted.",
        inline: false
      });
      embed.setColor(0xFF8C00);
    }
    
    // Send DM if requested
    if (sendDM) {
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle("⚠️ Faction Warning")
          .setColor(0xFF6B00)
          .setDescription(`You have received a warning in **${interaction.guild.name}**`)
          .addFields(
            { name: "📋 Reason", value: reason, inline: false },
            { name: "👮 From", value: `<@${interaction.user.id}>`, inline: true },
            { name: "📝 Warning Count", value: `${warningCount}`, inline: true }
          )
          .setFooter({ text: "Please follow faction rules and guidelines." })
          .setTimestamp();
        
        await targetUser.send({ embeds: [dmEmbed] });
        embed.addFields({ name: "📬 DM Status", value: "✅ Warning sent via DM", inline: false });
      } catch (error) {
        embed.addFields({ name: "📬 DM Status", value: "❌ Could not send DM", inline: false });
      }
    }
    
    await interaction.reply({ embeds: [embed] });
  },
};