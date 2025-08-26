const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("accept")
    .setDescription("Accept a user's faction request")
    .addUserOption(option => option.setName("user").setDescription("User to accept").setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser("user");

    if (!global.pendingRequests || !global.pendingRequests[target.id])
      return interaction.reply({ content: "❌ This user has no pending requests.", ephemeral: true });

    const faction = global.pendingRequests[target.id];
    const role = interaction.guild.roles.cache.find(r => r.name === faction.replace("_", " "));
    if (!role) return interaction.reply({ content: "❌ Faction role not found.", ephemeral: true });

    const member = await interaction.guild.members.fetch(target.id);
    await member.roles.add(role);
    delete global.pendingRequests[target.id];

    await interaction.reply(`✅ Accepted <@${target.id}> into **${faction.replace("_", " ")}**!`);
  },
};
