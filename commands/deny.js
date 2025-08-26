const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deny")
    .setDescription("Deny a user's faction request")
    .addUserOption(option => option.setName("user").setDescription("User to deny").setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser("user");

    if (!global.pendingRequests || !global.pendingRequests[target.id])
      return interaction.reply({ content: "❌ This user has no pending requests.", ephemeral: true });

    const faction = global.pendingRequests[target.id];
    delete global.pendingRequests[target.id];

    await interaction.reply(`❌ Denied <@${target.id}> from joining **${faction.replace("_", " ")}**.`);
  },
};
