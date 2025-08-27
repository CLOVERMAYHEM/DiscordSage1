require('dotenv').config();
const fs = require("fs");
const express = require("express");
const { Client, Collection, GatewayIntentBits } = require("discord.js");

// Time tracking storage
if (!global.timeTracking) global.timeTracking = {};
if (!global.factionTimes) global.factionTimes = {
  "Laughing_Meeks": 0,
  "Unicorn_Rapists": 0,
  "Special_Activities_Directive": 0
};
if (!global.clockInChannelId) global.clockInChannelId = null;

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Faction leader mapping
const factionLeaders = {
  "Laughing_Meeks": "1406779732275499098",
  "Unicorn_Rapists": "1406779912441823303",
  "Special_Activities_Directive": "1409081159811334204",
};

// ---------------------- READY EVENT ----------------------
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Register slash commands
  const commands = [];
  for (const [name, command] of client.commands) {
    commands.push(command.data.toJSON());
  }

  try {
    await client.application.commands.set(commands);
    console.log("✅ Slash commands registered successfully!");
  } catch (error) {
    console.error("❌ Error registering commands:", error);
  }

  // Start daily leaderboard schedule
  startDailyLeaderboard();
});

// ---------------------- DAILY LEADERBOARD ----------------------
function startDailyLeaderboard() {
  const scheduleDaily = () => {
    const now = new Date();
    const next = new Date(now);
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(12, 0, 0, 0); // 12:00 PM UTC
    const msUntilNext = next.getTime() - now.getTime();
    setTimeout(() => {
      sendDailyLeaderboard();
      setInterval(sendDailyLeaderboard, 24 * 60 * 60 * 1000);
    }, msUntilNext);
  };

  scheduleDaily();
  console.log("📅 Daily leaderboard scheduled for 12:00 PM UTC");
}

async function sendDailyLeaderboard() {
  if (!global.clockInChannelId) return;
  const guild = client.guilds.cache.first();
  if (!guild) return;

  const clockInChannel = guild.channels.cache.get(global.clockInChannelId);
  if (!clockInChannel) return;

  const factionData = [];
  for (const [factionKey, totalTime] of Object.entries(global.factionTimes)) {
    const role = guild.roles.cache.find(r => r.name === factionKey.replace("_", " "));
    const memberCount = role ? role.members.size : 0;
    const hours = Math.floor(totalTime / 3600000);
    const minutes = Math.floor((totalTime % 3600000) / 60000);
    factionData.push({
      name: factionKey.replace("_", " "),
      totalTime,
      timeString: `${hours}h ${minutes}m`,
      memberCount
    });
  }

  factionData.sort((a, b) => b.totalTime - a.totalTime);

  let leaderboardText = "**📊 Daily Faction Time Rankings**\n\n";
  factionData.forEach((faction, i) => {
    const medals = ["🥇", "🥈", "🥉"];
    const medal = medals[i] || "🏅";
    leaderboardText += `${medal} **${faction.name}**\n⏱️ ${faction.timeString} | 👥 ${faction.memberCount} members\n\n`;
  });

  const totalTime = factionData.reduce((sum, f) => sum + f.totalTime, 0);
  const totalHours = Math.floor(totalTime / 3600000);
  const totalMinutes = Math.floor((totalTime % 3600000) / 60000);
  leaderboardText += `📈 **Combined Faction Time**: ${totalHours}h ${totalMinutes}m\n`;
  leaderboardText += `🏆 **Today's Champion**: ${factionData[0]?.name || "None"}\n\n`;
  leaderboardText += `*Use \`/timeleaderboard\` anytime to see current standings*`;

  const embed = {
    color: 0xFFD700,
    title: "🎯 Daily Faction Voice Time Report",
    description: leaderboardText,
    timestamp: new Date().toISOString(),
    footer: { text: "Keep up the great work, faction warriors!" }
  };

  await clockInChannel.send({ embeds: [embed] });
  console.log("📊 Daily leaderboard sent successfully");
}

// ---------------------- INTERACTIONS ----------------------
client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ Error running this command.", ephemeral: true });
      }
    }
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "faction_select") {
    const selectedFaction = interaction.values[0];
    const member = interaction.member;

    try {
      const role = interaction.guild.roles.cache.find(r => r.name === selectedFaction.replace("_", " "));
      if (!role) return interaction.reply({ content: "❌ Faction role not found!", ephemeral: true });

      // Remove other faction roles
      const factions = ["Laughing Meeks", "Unicorn Rapists", "Special Activities Directive"];
      const rolesToRemove = member.roles.cache.filter(r => factions.includes(r.name));
      await member.roles.remove(rolesToRemove);

      // Add selected faction role
      await member.roles.add(role);

      await interaction.reply({ content: `✅ You joined **${role.name}**!`, ephemeral: true });
    } catch (err) {
      console.error("Error assigning faction role:", err);
      if (!interaction.replied) {
        await interaction.reply({ content: "❌ Could not assign faction role.", ephemeral: true });
      }
    }
  }
});

// ---------------------- VOICE TRACKING ----------------------
client.on("voiceStateUpdate", async (oldState, newState) => {
  const member = newState.member;
  const userId = member.id;

  const endSession = (sessionData) => {
    const timeSpent = Date.now() - sessionData.startTime;

    const factions = ["Laughing Meeks", "Unicorn Rapists", "Special Activities Directive"];
    let userFaction = null;
    for (const fName of factions) {
      const role = member.guild.roles.cache.find(r => r.name === fName);
      if (role && member.roles.cache.has(role.id)) {
        userFaction = fName.replace(" ", "_");
        break;
      }
    }
    if (userFaction) global.factionTimes[userFaction] += timeSpent;

    if (global.clockInChannelId) {
      const clockInChannel = member.guild.channels.cache.get(global.clockInChannelId);
      if (clockInChannel) {
        const hours = Math.floor(timeSpent / 3600000);
        const minutes = Math.floor((timeSpent % 3600000) / 60000);
        const seconds = Math.floor((timeSpent % 60000) / 1000);
        const embed = {
          color: 0x3498DB,
          title: "🕐 Voice Channel Clock Out",
          fields: [
            { name: "👤 User", value: `<@${userId}>`, inline: true },
            { name: "📢 Channel", value: sessionData.channel, inline: true },
            { name: "⏱️ Time Spent", value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
            { name: "🏴 Faction", value: userFaction ? userFaction.replace("_", " ") : "None", inline: false }
          ],
          timestamp: new Date().toISOString(),
          footer: { text: "Faction Time Tracking" },
          thumbnail: { url: member.user.displayAvatarURL() }
        };
        clockInChannel.send({ embeds: [embed] });
      }
    }

    delete global.timeTracking[userId];
  };

  if (!oldState.channel && newState.channel) {
    global.timeTracking[userId] = { startTime: Date.now(), channel: newState.channel.name, channelId: newState.channel.id };
  } else if (oldState.channel && !newState.channel && global.timeTracking[userId]) {
    endSession(global.timeTracking[userId]);
  } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id && global.timeTracking[userId]) {
    endSession(global.timeTracking[userId]);
    global.timeTracking[userId] = { startTime: Date.now(), channel: newState.channel.name, channelId: newState.channel.id };
  }
});

// ---------------------- EXPRESS SERVER ----------------------
const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json({
    status: "✅ Bot is running",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    guilds: client.guilds ? client.guilds.cache.size : 0,
    botTag: client.user ? client.user.tag : "Not logged in yet"
  });
});

app.listen(PORT, "0.0.0.0", () => console.log(`🌐 Web server running on port ${PORT}`));

// ---------------------- ERROR HANDLING ----------------------
client.on('error', console.error);
client.on('warn', console.warn);
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));

// ---------------------- LOGIN ----------------------
client.login(process.env.DISCORD_TOKEN);
