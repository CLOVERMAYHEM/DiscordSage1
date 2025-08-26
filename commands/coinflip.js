const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin to make decisions for your faction!")
    .addStringOption(option =>
      option.setName("question")
        .setDescription("What are you deciding? (optional)")
        .setRequired(false)),
  async execute(interaction) {
    const question = interaction.options.getString("question");
    const isHeads = Math.random() < 0.5;
    const result = isHeads ? "Heads" : "Tails";
    const emoji = isHeads ? "🪙" : "🔴";
    
    // Get user's faction
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
    
    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username} flipped a coin!`)
      .setColor(factionColors[userFaction])
      .setDescription(`${emoji} **${result}**`)
      .addFields(
        { name: "🏴 Faction", value: userFaction, inline: true }
      )
      .setTimestamp();
    
    if (question) {
      embed.addFields({ name: "❓ Decision", value: question, inline: false });
    }
    
    // Add faction-themed flavor text
    const flavorTexts = {
      "Heads": [
        "The faction gods smile upon you!",
        "Fortune favors your faction today!",
        "Victory is in your faction's future!",
        "Your faction's luck is strong!"
      ],
      "Tails": [
        "Perhaps your faction should reconsider...",
        "The faction spirits suggest caution.",
        "Your faction might want to think twice.",
        "Even the bravest faction warriors pause sometimes."
      ]
    };
    
    const flavorText = flavorTexts[result][Math.floor(Math.random() * flavorTexts[result].length)];
    embed.addFields({ name: "✨ Faction Fortune", value: flavorText, inline: false });
    
    await interaction.reply({ embeds: [embed] });
  },
};