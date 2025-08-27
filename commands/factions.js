const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("factions")
    .setDescription("Shows the faction join menu."),
  
  async execute(interaction) {
    try {
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("faction_select")
          .setPlaceholder("Select a faction")
          .addOptions([
            { label: "Laughing Meeks", value: "Laughing_Meeks" },
            { label: "Unicorn Rapists", value: "Unicorn_Rapists" },
            { label: "Special Activities Directive", value: "Special_Activities_Directive" },
          ])
      );

      await interaction.reply({ 
        content: "Choose a faction to join:", 
        components: [row], 
        ephemeral: true // Make it private to the user
      });
    } catch (err) {
      console.error("Error in /factions command:", err);
      if (!interaction.replied) {
        await interaction.reply({ content: "❌ Something went wrong!", ephemeral: true });
      }
    }
  },
};
