const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

// Initialize faction missions
if (!global.factionMissions) global.factionMissions = {
  "Laughing_Meeks": [],
  "Unicorn_Rapists": [],
  "Special_Activities_Directive": []
};

const MISSION_TEMPLATES = [
  {
    name: "Voice Challenge",
    description: "Accumulate 20 hours of faction voice time",
    type: "time",
    target: 72000000, // 20 hours in ms
    reward: 100,
    emoji: "🎯"
  },
  {
    name: "Battle Domination", 
    description: "Win 5 faction battles",
    type: "battles",
    target: 5,
    reward: 150,
    emoji: "⚔️"
  },
  {
    name: "Social Activity",
    description: "Have 10 members use bot commands today",
    type: "activity",
    target: 10,
    reward: 75,
    emoji: "💬"
  },
  {
    name: "Recruitment Drive",
    description: "Get 3 new faction members",
    type: "recruitment",
    target: 3,
    reward: 125,
    emoji: "👥"
  },
  {
    name: "Unity Mission",
    description: "Have all online members in voice at once",
    type: "unity",
    target: 1,
    reward: 200,
    emoji: "🤝"
  }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("missions")
    .setDescription("View faction missions and objectives")
    .addSubcommand(subcommand =>
      subcommand
        .setName("view")
        .setDescription("View current faction missions"))
    .addSubcommand(subcommand =>
      subcommand
        .setName("create")
        .setDescription("Create a new faction mission (Leaders only)")
        .addStringOption(option =>
          option.setName("type")
            .setDescription("Mission type")
            .setRequired(true)
            .addChoices(
              { name: "Voice Time Challenge", value: "time" },
              { name: "Battle Challenge", value: "battles" },
              { name: "Activity Challenge", value: "activity" },
              { name: "Recruitment Drive", value: "recruitment" },
              { name: "Unity Mission", value: "unity" }
            ))
        .addStringOption(option =>
          option.setName("custom")
            .setDescription("Custom mission description (optional)")
            .setRequired(false))),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === "view") {
      await this.viewMissions(interaction);
    } else if (subcommand === "create") {
      await this.createMission(interaction);
    }
  },

  async viewMissions(interaction) {
    const member = interaction.member;
    
    // Get user's faction
    const factions = [
      "Laughing Meeks",
      "Unicorn Rapists", 
      "Special Activities Directive"
    ];
    
    let userFaction = null;
    let userFactionKey = null;
    for (const factionName of factions) {
      const role = interaction.guild.roles.cache.find(r => r.name === factionName);
      if (role && member.roles.cache.has(role.id)) {
        userFaction = factionName;
        userFactionKey = factionName.replace(" ", "_");
        break;
      }
    }
    
    if (!userFaction) {
      return interaction.reply({ 
        content: "❌ You must be in a faction to view missions!", 
        ephemeral: true 
      });
    }
    
    const factionMissions = global.factionMissions[userFactionKey] || [];
    
    const factionColors = {
      "Laughing Meeks": 0xFF6B6B,
      "Unicorn Rapists": 0x9B59B6,
      "Special Activities Directive": 0x3498DB
    };
    
    const embed = new EmbedBuilder()
      .setTitle(`🎯 ${userFaction} Faction Missions`)
      .setColor(factionColors[userFaction])
      .setDescription("Complete missions to earn faction points and glory!")
      .setTimestamp();
    
    if (factionMissions.length === 0) {
      embed.addFields({
        name: "📝 No Active Missions",
        value: "Your faction leaders haven't created any missions yet.\nLeaders can use `/missions create` to add objectives!",
        inline: false
      });
    } else {
      let missionsText = "";
      factionMissions.forEach((mission, index) => {
        const progressPercent = Math.min(100, Math.round((mission.progress / mission.target) * 100));
        const progressBar = createProgressBar(progressPercent);
        const status = mission.completed ? "✅ COMPLETED" : `${progressPercent}%`;
        
        missionsText += `${mission.emoji} **${mission.name}**\n`;
        missionsText += `*${mission.description}*\n`;
        missionsText += `${progressBar} ${status}\n`;
        missionsText += `🏆 Reward: ${mission.reward} points\n\n`;
      });
      
      embed.addFields({
        name: "🎯 Active Missions",
        value: missionsText.slice(0, 1024),
        inline: false
      });
    }
    
    // Add faction stats
    const factionPoints = global.factionPoints?.[userFactionKey]?.points || 0;
    embed.addFields({
      name: "📊 Faction Status",
      value: `⭐ Total Points: ${factionPoints}\n🎯 Active Missions: ${factionMissions.length}\n🏆 Completed: ${factionMissions.filter(m => m.completed).length}`,
      inline: false
    });
    
    await interaction.reply({ embeds: [embed] });
  },

  async createMission(interaction) {
    const member = interaction.member;
    const missionType = interaction.options.getString("type");
    const customDescription = interaction.options.getString("custom");
    
    // Check if user is a faction leader
    const leaderRoles = ["1406779732275499098", "1406779912441823303", "1409081159811334204"];
    const isLeader = leaderRoles.some(roleId => member.roles.cache.has(roleId));
    
    if (!isLeader) {
      return interaction.reply({ 
        content: "❌ Only faction leaders can create missions!", 
        ephemeral: true 
      });
    }
    
    // Get leader's faction
    let leaderFaction = null;
    const factionRoleMap = {
      "1406779732275499098": "Laughing_Meeks",
      "1406779912441823303": "Unicorn_Rapists", 
      "1409081159811334204": "Special_Activities_Directive"
    };
    
    for (const [roleId, faction] of Object.entries(factionRoleMap)) {
      if (member.roles.cache.has(roleId)) {
        leaderFaction = faction;
        break;
      }
    }
    
    if (!leaderFaction) {
      return interaction.reply({ 
        content: "❌ Could not determine your faction leadership!", 
        ephemeral: true 
      });
    }
    
    // Find mission template
    const template = MISSION_TEMPLATES.find(t => t.type === missionType);
    if (!template) {
      return interaction.reply({ 
        content: "❌ Invalid mission type!", 
        ephemeral: true 
      });
    }
    
    // Check if faction already has this mission type active
    const existingMission = global.factionMissions[leaderFaction].find(m => m.type === missionType && !m.completed);
    if (existingMission) {
      return interaction.reply({ 
        content: `❌ Your faction already has an active ${template.name} mission!`, 
        ephemeral: true 
      });
    }
    
    // Create new mission
    const newMission = {
      id: Date.now().toString(),
      name: template.name,
      description: customDescription || template.description,
      type: template.type,
      target: template.target,
      progress: 0,
      reward: template.reward,
      emoji: template.emoji,
      createdBy: interaction.user.id,
      createdAt: Date.now(),
      completed: false
    };
    
    global.factionMissions[leaderFaction].push(newMission);
    
    await interaction.reply({
      content: `✅ Created new mission: **${newMission.name}**\n*${newMission.description}*\n🏆 Reward: ${newMission.reward} points`,
      ephemeral: true
    });
  }
};

function createProgressBar(percentage) {
  const filled = Math.round(percentage / 10);
  const empty = 10 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}