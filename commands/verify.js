const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Verify yourself with your PlayStation username")
    .addStringOption(option =>
      option.setName("psn")
        .setDescription("Enter your PlayStation username")
        .setRequired(true)
    ),
  async execute(interaction) {
    const psn = interaction.options.getString("psn");
    const member = interaction.member;

    // ID of your verify channel
    const verifyChannelId = "1412200030215082075"; // ⬅️ replace with your verify channel ID

    // ID of your Member role
    const memberRoleId = "1385824103818330293"; // ⬅️ replace with your Member role ID

    // Make sure command is only used in verify channel
    if (interaction.channel.id !== verifyChannelId) {
      return interaction.reply({
        content: "❌ You can only use this command in the verification channel!",
        ephemeral: true,
      });
    }

    try {
      // Change nickname
      await member.setNickname(psn);

      // Add member role
      await member.roles.add(memberRoleId);

      await interaction.reply({
        content: `✅ You’ve been verified! Your nickname is now **${psn}** and you have access to the server.`,
        ephemeral: true,
      });

    } catch (error) {
      console.error("Error in verify command:", error);
      await interaction.reply({
        content: "❌ I couldn’t verify you. Please check my role is above Member role and I have Manage Nicknames permission.",
        ephemeral: true,
      });
    }
  },
};
