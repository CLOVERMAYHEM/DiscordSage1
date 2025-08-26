const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Display server and faction information"),
  async execute(interaction) {
    const guild = interaction.guild;
    
    // Count faction members
    const factions = {
      "Laughing Meeks": 0,
      "Unicorn Rapists": 0,
      "Special Activities Directive": 0
    };
    
    let totalFactionMembers = 0;
    
    for (const [factionName] of Object.entries(factions)) {
      const role = guild.roles.cache.find(r => r.name === factionName);
      if (role) {
        factions[factionName] = role.members.size;
        totalFactionMembers += role.members.size;
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle(`${guild.name} Server Information`)
      .setThumbnail(guild.iconURL())
      .setColor(0x3498DB)
      .addFields(
        { name: "📊 Server Stats", value: `👥 Total Members: ${guild.memberCount}\n🤖 Bots: ${guild.members.cache.filter(m => m.user.bot).size}\n👤 Humans: ${guild.members.cache.filter(m => !m.user.bot).size}`, inline: true },
        { name: "📅 Server Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: "👑 Owner", value: guild.members.cache.get(guild.ownerId)?.user.tag || "Unknown", inline: true },
        { name: "🏴 Faction Statistics", value: `⚔️ Total Faction Members: ${totalFactionMembers}\n🏴‍☠️ Laughing Meeks: ${factions["Laughing Meeks"]}\n🦄 Unicorn Rapists: ${factions["Unicorn Rapists"]}\n🎯 Special Activities Directive: ${factions["Special Activities Directive"]}\n\n📈 Faction Participation: ${((totalFactionMembers / guild.memberCount) * 100).toFixed(1)}%`, inline: false },
        { name: "📋 Channels & Roles", value: `💬 Text Channels: ${guild.channels.cache.filter(c => c.type === 0).size}\n🔊 Voice Channels: ${guild.channels.cache.filter(c => c.type === 2).size}\n🎭 Roles: ${guild.roles.cache.size}`, inline: true },
        { name: "🔧 Server Features", value: guild.features.length > 0 ? guild.features.map(f => f.toLowerCase().replace(/_/g, ' ')).join('\n') : "None", inline: true }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  },
};