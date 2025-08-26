const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View warnings for a user")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("User to check warnings for")
        .setRequired(true)),
  async execute(interaction) {
    const member = interaction.member;
    const targetUser = interaction.options.getUser("user");
    
    // Check if user is a faction leader or checking their own warnings
    const leaderRoles = ["1406779732275499098", "1406779912441823303", "1409081159811334204"];
    const isLeader = leaderRoles.some(roleId => member.roles.cache.has(roleId));
    const isOwnWarnings = targetUser.id === interaction.user.id;
    
    if (!isLeader && !isOwnWarnings) {
      return interaction.reply({ 
        content: "❌ You can only view your own warnings, or you must be a faction leader!", 
        ephemeral: true 
      });
    }
    
    const userWarnings = global.userWarnings?.[targetUser.id] || [];
    
    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Warnings for ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setTimestamp();
    
    if (userWarnings.length === 0) {
      embed.setColor(0x00FF00);
      embed.setDescription("✅ No warnings on record. Exemplary behavior!");
    } else {
      // Set color based on warning count
      if (userWarnings.length >= 3) embed.setColor(0xFF0000);
      else if (userWarnings.length >= 2) embed.setColor(0xFF8C00);
      else embed.setColor(0xFF6B00);
      
      embed.setDescription(`📝 **Total Warnings:** ${userWarnings.length}`);
      
      // Show recent warnings
      const recentWarnings = userWarnings.slice(-5).reverse(); // Last 5 warnings
      let warningsText = "";
      
      recentWarnings.forEach((warning, index) => {
        const warningNumber = userWarnings.length - index;
        warningsText += `**Warning #${warningNumber}**\n`;
        warningsText += `📋 ${warning.reason}\n`;
        warningsText += `👮 By: <@${warning.issuedBy}>\n`;
        warningsText += `📅 <t:${Math.floor(warning.issuedAt / 1000)}:R>\n\n`;
      });
      
      embed.addFields({
        name: "📋 Recent Warnings",
        value: warningsText.slice(0, 1024),
        inline: false
      });
      
      if (userWarnings.length > 5) {
        embed.setFooter({ text: `Showing 5 most recent warnings out of ${userWarnings.length} total` });
      }
    }
    
    await interaction.reply({ embeds: [embed], ephemeral: !isLeader });
  },
};