const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setleaderschannel")
    .setDescription("Set the channel for auto-updating leader instructions")
    .addChannelOption(option => 
      option.setName("channel")
        .setDescription("The channel to post leader instructions in")
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");
    
    if (channel.type !== 0) {
      return interaction.reply({ 
        content: "❌ Please select a text channel!", 
        ephemeral: true 
      });
    }
    
    // Store the leader instructions channel ID
    global.leaderInstructionsChannelId = channel.id;
    
    // Post the leader instructions immediately
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

    const message = await channel.send(leaderMessage);
    global.leaderInstructionsMessageId = message.id;
    
    await interaction.reply({ 
      content: `✅ Leader instructions channel set to ${channel}! Instructions posted and will auto-update.`, 
      ephemeral: true 
    });
  },
};