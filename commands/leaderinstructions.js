const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderinstructions")
    .setDescription("Post faction leader instructions")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const leaderMessage = [
      "👑 **FACTION LEADER INSTRUCTIONS**",
      "",
      "**When someone requests to join your faction:**",
      "1. You'll get pinged in this channel",
      "2. Review the applicant (check their profile, activity, etc.)",
      "3. Make your decision using these commands:",
      "",
      "**To Accept:** `/accept @username`",
      "**To Deny:** `/deny @username`",
      "**To Kick:** `/kickfaction @username`",
      "",
      "**Important Notes:**",
      "• Only faction leaders can use these commands",
      "• Once accepted, the user gets the faction role automatically",
      "• Use `/kickfaction` to remove someone from your faction",
      "• Be fair and consistent with your decisions",
      "• Consider discussing with other leaders for important decisions",
      "",
      "───────────────────────────────"
    ].join("\n");

    await interaction.reply({ content: leaderMessage });
  },
};