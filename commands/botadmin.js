const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("botadmin")
    .setDescription("Manage bot administrators")
    .addSubcommand(subcommand =>
      subcommand
        .setName("add")
        .setDescription("Add a user as bot administrator")
        .addUserOption(option =>
          option.setName("user")
            .setDescription("User to make bot admin")
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("remove")
        .setDescription("Remove a user from bot administrators")
        .addUserOption(option =>
          option.setName("user")
            .setDescription("User to remove from bot admins")
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("list")
        .setDescription("List all bot administrators")),
  async execute(interaction) {
    // Check if user can manage bot admins (server owner or has Administrator permission)
    if (interaction.guild.ownerId !== interaction.user.id && 
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        content: "❌ Only server administrators can manage bot admins!", 
        ephemeral: true 
      });
    }
    
    if (!global.botAdmins) global.botAdmins = [];
    
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === "add") {
      const user = interaction.options.getUser("user");
      
      if (global.botAdmins.includes(user.id)) {
        return interaction.reply({ 
          content: `❌ ${user.username} is already a bot administrator!`, 
          ephemeral: true 
        });
      }
      
      global.botAdmins.push(user.id);
      
      const embed = new EmbedBuilder()
        .setTitle("✅ Bot Administrator Added")
        .setColor(0x00FF00)
        .setDescription(`**${user.username}** has been granted bot administrator privileges!`)
        .addFields(
          { name: "👤 New Admin", value: `<@${user.id}>`, inline: true },
          { name: "👮 Added by", value: `<@${interaction.user.id}>`, inline: true },
          { name: "🔧 Privileges", value: "• Manage sticky messages\n• Access admin commands\n• Configure bot settings", inline: false }
        )
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } else if (subcommand === "remove") {
      const user = interaction.options.getUser("user");
      
      if (!global.botAdmins.includes(user.id)) {
        return interaction.reply({ 
          content: `❌ ${user.username} is not a bot administrator!`, 
          ephemeral: true 
        });
      }
      
      global.botAdmins = global.botAdmins.filter(id => id !== user.id);
      
      const embed = new EmbedBuilder()
        .setTitle("❌ Bot Administrator Removed")
        .setColor(0xFF6B00)
        .setDescription(`**${user.username}** has been removed from bot administrators.`)
        .addFields(
          { name: "👤 Removed Admin", value: `<@${user.id}>`, inline: true },
          { name: "👮 Removed by", value: `<@${interaction.user.id}>`, inline: true }
        )
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } else if (subcommand === "list") {
      const embed = new EmbedBuilder()
        .setTitle("🔧 Bot Administrators")
        .setColor(0x3498DB)
        .setDescription("Users with bot administration privileges")
        .setTimestamp();
      
      let adminsList = "";
      
      // Server owner is always admin
      const owner = await interaction.guild.fetchOwner();
      adminsList += `👑 **${owner.user.username}** (Server Owner)\n`;
      
      // Members with Administrator permission
      const adminMembers = interaction.guild.members.cache.filter(member => 
        member.permissions.has(PermissionFlagsBits.Administrator) && 
        member.id !== owner.id
      );
      
      for (const [, member] of adminMembers) {
        adminsList += `⚡ **${member.user.username}** (Administrator)\n`;
      }
      
      // Custom bot admins
      if (global.botAdmins.length > 0) {
        adminsList += "\n🤖 **Custom Bot Admins:**\n";
        for (const adminId of global.botAdmins) {
          try {
            const user = await interaction.client.users.fetch(adminId);
            adminsList += `🔧 **${user.username}**\n`;
          } catch (error) {
            adminsList += `🔧 Unknown User (${adminId})\n`;
          }
        }
      }
      
      if (!adminsList.trim()) {
        adminsList = "No bot administrators found.";
      }
      
      embed.addFields({
        name: "👥 Current Administrators",
        value: adminsList.slice(0, 1024),
        inline: false
      });
      
      embed.addFields({
        name: "ℹ️ Administrator Privileges",
        value: "• Use `/stick` and `/unstick` commands\n• Manage bot settings\n• Access administrative features\n• Reset faction data",
        inline: false
      });
      
      await interaction.reply({ embeds: [embed] });
    }
  },
};