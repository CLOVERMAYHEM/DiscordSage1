const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");

// This command only shows a dropdown menu for faction requests
module.exports = {
  data: new SlashCommandBuilder()
    .setName("factions")
    .setDescription("Shows the faction request menu."),

  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("faction_select")
        .setPlaceholder("Select a faction to request")
        .addOptions([
          { label: "Laughing Meeks", value: "Laughing_Meeks" },
          { label: "Unicorn Rapists", value: "Unicorn_Rapists" },
          { label: "Special Activities Directive", value: "Special_Activities_Directive" },
        ])
    );

    await interaction.reply({
      content: "📢 Choose a faction to request joining. Leaders will be notified.",
      components: [row],
      ephemeral: true
    });
  },
};
