const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the mystical 8-ball a question")
    .addStringOption(option =>
      option.setName("question")
        .setDescription("Your question for the 8-ball")
        .setRequired(true)),
  async execute(interaction) {
    const question = interaction.options.getString("question");
    
    const responses = [
      // Positive responses
      "It is certain.", "Without a doubt.", "Yes definitely.", "You may rely on it.",
      "As I see it, yes.", "Most likely.", "Outlook good.", "Yes.", "Signs point to yes.",
      "The factions smile upon this.", "Your faction's destiny says yes.",
      
      // Negative responses  
      "Don't count on it.", "My reply is no.", "My sources say no.", "Outlook not so good.",
      "Very doubtful.", "No.", "Absolutely not.", "The faction leaders disapprove.",
      "Your faction's enemies would love this.",
      
      // Neutral responses
      "Reply hazy, try again.", "Ask again later.", "Better not tell you now.",
      "Cannot predict now.", "Concentrate and ask again.", "The faction spirits are unclear.",
      "Even the faction leaders are unsure about this.", "The outcome depends on your faction's strength."
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Get user's faction for theming
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
      .setTitle("🔮 Mystical 8-Ball")
      .setColor(factionColors[userFaction])
      .addFields(
        { name: "❓ Question", value: question, inline: false },
        { name: "🎱 Answer", value: `*${randomResponse}*`, inline: false }
      )
      .setFooter({ text: `Asked by ${interaction.user.username} | Faction: ${userFaction}` })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  },
};