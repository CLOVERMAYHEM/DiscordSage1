const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const MEMBER_ROLE_ID = "1385824103818330293"; // ✅ Member role
const NEEDS_VERIFY_ROLE_ID = "1412199598566412448"; // ⛔ Needs to Get Verified role
const VERIFY_CHANNEL_ID = "1412200030215082075"; // 📌 Verify channel

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Verify yourself by entering your PlayStation username")
    .addStringOption(option =>
      option
        .setName("username")
        .setDescription("Your PlayStation username")
        .setRequired(true)
    ),
  
  async execute(interaction) {
    const username = interaction.options.getString("username");
    const member = interaction.member;

    // 🔒 Make sure command is only used in verify channel
    if (interaction.channelId !== VERIFY_CHANNEL_ID) {
      return interaction.reply({
        content: "❌ You can only use this command in the verification channel!",
        ephemeral: true,
      });
    }

    try {
      // Change nickname
      await member.setNickname(username).catch(() => {});

      // Add Member role
      await member.roles.add(MEMBER_ROLE_ID);

      // Remove Needs to Get Verified role
      if (member.roles.cache.has(NEEDS_VERIFY_ROLE_ID)) {
        await member.roles.remove(NEEDS_VERIFY_ROLE_ID);
      }

      await interaction.reply({
        content: `✅ You have been verified!\nYour nickname is now **${username}** and you have been given access.`,
        ephemeral: true,
      });

    } catch (error) {
      console.error("Verify command error:", error);
      await interaction.reply({
        content: "❌ Something went wrong while verifying you. Please contact a staff member.",
        ephemeral: true,
      });
    }
  },
};
