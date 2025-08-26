const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dice")
    .setDescription("Roll dice for your faction!")
    .addIntegerOption(option =>
      option.setName("sides")
        .setDescription("Number of sides on the die (default: 6)")
        .setMinValue(2)
        .setMaxValue(100)
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName("count")
        .setDescription("Number of dice to roll (default: 1)")
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false)),
  async execute(interaction) {
    const sides = interaction.options.getInteger("sides") || 6;
    const count = interaction.options.getInteger("count") || 1;
    
    const rolls = [];
    let total = 0;
    
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      rolls.push(roll);
      total += roll;
    }
    
    // Get user's faction for color
    const member = interaction.member;
    const factions = [
      "Laughing Meeks",
      "Unicorn Rapists", 
      "Special Activities Directive"
    ];
    
    let userFaction = "None";
    for (const factionName of factions) {
      const role = interaction.guild.roles.cache.find(r => r.name === factionName);
      if (role && member.roles.cache.has(role.id)) {
        userFaction = factionName;
        break;
      }
    }
    
    const factionColors = {
      "Laughing Meeks": 0xFF6B6B,
      "Unicorn Rapists": 0x9B59B6,
      "Special Activities Directive": 0x3498DB,
      "None": 0x95A5A6
    };
    
    let resultText = "";
    if (count === 1) {
      resultText = `🎲 **${rolls[0]}**`;
    } else {
      resultText = `🎲 Rolls: **${rolls.join(", ")}**\n📊 Total: **${total}**`;
    }
    
    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username} rolled the dice!`)
      .setColor(factionColors[userFaction])
      .setDescription(resultText)
      .addFields(
        { name: "🎯 Die Type", value: `d${sides}`, inline: true },
        { name: "🔢 Count", value: `${count}`, inline: true },
        { name: "🏴 Faction", value: userFaction, inline: true }
      )
      .setTimestamp();
    
    // Add special messages for extreme rolls
    if (rolls.every(r => r === sides)) {
      embed.addFields({ name: "🔥 CRITICAL SUCCESS!", value: "Maximum roll achieved!", inline: false });
    } else if (rolls.every(r => r === 1)) {
      embed.addFields({ name: "💀 CRITICAL FAILURE!", value: "Minimum roll... ouch!", inline: false });
    }
    
    await interaction.reply({ embeds: [embed] });
  },
};