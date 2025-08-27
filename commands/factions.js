async execute(interaction) {
  // Check if factions are enabled for this guild
  const factionsEnabled = global.guildSettings && 
                          global.guildSettings[interaction.guild.id] && 
                          global.guildSettings[interaction.guild.id].factionsEnabled !== false;
  
  if (!factionsEnabled) {
    return interaction.reply({
      content: "❌ Faction features are disabled in this server! Contact an admin to enable them.",
      ephemeral: true,
    });
  }

  // Your original code continues here...
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
  await interaction.reply({ content: "Choose a faction to join:", components: [row], flags: 64 });
}
