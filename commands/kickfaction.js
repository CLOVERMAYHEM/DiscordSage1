const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kickfaction")
    .setDescription("Remove a member from their faction")
    .addUserOption(option => 
      option.setName("user")
        .setDescription("User to remove from faction")
        .setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser("user");
    const member = await interaction.guild.members.fetch(target.id);
    
    // Check if user has faction leader permissions
    const factionLeaders = {
      "Laughing_Meeks": "1406767357711618069",
      "Unicorn_Rapists": "1406769312856801431",
      "Special_Activities_Directive": "1409081159811334204",
    };
    
    const isLeader = Object.values(factionLeaders).some(roleId => 
      interaction.member.roles.cache.has(roleId)
    );
    
    if (!isLeader) {
      return interaction.reply({ 
        content: "❌ Only faction leaders can use this command!", 
        ephemeral: true 
      });
    }
    
    // Find which faction roles the target has
    const factionRoles = [];
    for (const [factionName, leaderRoleId] of Object.entries(factionLeaders)) {
      const factionRole = interaction.guild.roles.cache.find(r => 
        r.name === factionName.replace("_", " ")
      );
      if (factionRole && member.roles.cache.has(factionRole.id)) {
        factionRoles.push(factionRole);
      }
    }
    
    if (factionRoles.length === 0) {
      return interaction.reply({ 
        content: "❌ This user is not in any faction!", 
        ephemeral: true 
      });
    }
    
    // Remove all faction roles
    try {
      await member.roles.remove(factionRoles);
      
      const factionNames = factionRoles.map(r => r.name).join(", ");
      await interaction.reply(`✅ Removed <@${target.id}> from **${factionNames}**!`);
      
      // Try to DM the user
      try {
        await target.send(`You have been removed from **${factionNames}** by ${interaction.user.username}.`);
      } catch {
        // User has DMs disabled
      }
      
    } catch (error) {
      console.error("Error removing faction roles:", error);
      await interaction.reply({ 
        content: "❌ Failed to remove user from faction. Check bot permissions.", 
        ephemeral: true 
      });
    }
  },
};