const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("quote")
    .setDescription("Get an inspirational faction quote!"),
  async execute(interaction) {
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
    
    const factionQuotes = {
      "Laughing Meeks": [
        "\"Laughter is the best weapon against our enemies!\"",
        "\"Those who laugh together, fight together!\"",
        "\"A smile before battle, victory after!\"",
        "\"Our joy is our strength, our mirth is our shield!\"",
        "\"They fear our laughter because they know we're having fun winning!\""
      ],
      "Unicorn Rapists": [
        "\"Embrace the chaos, become the storm!\"",
        "\"We are the beautiful nightmare our enemies can't escape!\"",
        "\"Unconventional tactics for unconventional warriors!\"",
        "\"Our madness is our method, our wildness our way!\"",
        "\"They call us crazy - we call it creative!\""
      ],
      "Special Activities Directive": [
        "\"Precision in planning, excellence in execution!\"",
        "\"Special operations require special people!\"",
        "\"We are the directive that directs destiny!\"",
        "\"Elite minds, elite results!\"",
        "\"Where others see problems, we see objectives!\""
      ],
      "None": [
        "\"Every great faction member started without a faction!\"",
        "\"Your journey awaits - choose your destiny!\"",
        "\"The path to greatness begins with a single choice!\"",
        "\"Heroes aren't born in factions - they're forged by them!\""
      ]
    };
    
    const quotes = factionQuotes[userFaction] || factionQuotes["None"];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    
    const factionColors = {
      "Laughing Meeks": 0xFF6B6B,
      "Unicorn Rapists": 0x9B59B6,
      "Special Activities Directive": 0x3498DB,
      "None": 0x95A5A6
    };
    
    const embed = new EmbedBuilder()
      .setTitle("💬 Faction Wisdom")
      .setColor(factionColors[userFaction])
      .setDescription(randomQuote)
      .addFields(
        { name: "🏴 Your Faction", value: userFaction, inline: true }
      )
      .setFooter({ text: "Stay strong, faction warrior!" })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  },
};