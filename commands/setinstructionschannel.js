const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setinstructionschannel")
    .setDescription("Set the channel for auto-updating instructions")
    .addChannelOption(option => 
      option.setName("channel")
        .setDescription("The channel to post instructions in")
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
    
    // Store the instructions channel ID
    global.instructionsChannelId = channel.id;
    
    // Post the instructions immediately
    const instructionMessage = [
      "🏴‍☠️ **HOW TO JOIN A FACTION**",
      "",
      "**Step 1:** Type `/factions` to see available factions",
      "**Step 2:** Select the faction you want to join from the dropdown menu",
      "**Step 3:** Wait for faction leaders to review your request",
      "",
      "**Available Factions:**",
      "• **Laughing Meeks**",
      "• **Unicorn Rapists**",
      "• **Special Activities Directive**",
      "",
      "**Note:** You can only be in one faction at a time!",
      "",
      "───────────────────────────────"
    ].join("\n");

    const message = await channel.send(instructionMessage);
    global.instructionsMessageId = message.id;
    
    await interaction.reply({ 
      content: `✅ Instructions channel set to ${channel}! Instructions posted and will auto-update.`, 
      ephemeral: true 
    });
  },
};