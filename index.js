// Load environment variables from .env
require("dotenv").config();

const fs = require("fs");
const express = require("express");
const { Client, Collection, GatewayIntentBits } = require("discord.js");

// Globals
if (!global.timeTracking) global.timeTracking = {};
if (!global.factionTimes) global.factionTimes = {
  "Laughing_Meeks": 0,
  "Unicorn_Rapists": 0,
  "Special_Activities_Directive": 0
};
if (!global.userTimes) global.userTimes = {};
global.clockInChannelId = process.env.CLOCK_IN_CHANNEL_ID;

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command.data && command.data.name) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`⚠️ Skipping command file: ${file} (missing data.name)`);
  }
}

// Faction leader mapping
const factionLeaders = {
  "Laughing_Meeks": "1406779732275499098",
  "Unicorn_Rapists": "1406779912441823303",
  "Special_Activities_Directive": "1409081159811334204"
};

// Discord ready
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Register slash commands
  const commands = [];
  for (const [name, command] of client.commands) commands.push(command.data.toJSON());
  try {
    console.log("🔄 Registering slash commands...");
    await client.application.commands.set(commands);
    console.log("✅ Slash commands registered successfully!");
  } catch (err) {
    console.error("❌ Error registering commands:", err);
  }

  startDailyLeaderboard();
});

// Daily leaderboard
function startDailyLeaderboard() {
  const scheduleDaily = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(12, 0, 0, 0);
    const msUntilTomorrow = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      sendDailyLeaderboard();
      setInterval(sendDailyLeaderboard, 24 * 60 * 60 * 1000);
    }, msUntilTomorrow);
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

  const factionData = Object.entries(global.factionTimes).map(([factionKey, totalTime]) => {
    const factionDisplayName = factionKey.replace("_", " ");
    const role = guild.roles.cache.find(r => r.name === factionDisplayName);
    const memberCount = role ? role.members.size : 0;
    const hours = Math.floor(totalTime / 3600000);
    const minutes = Math.floor((totalTime % 3600000) / 60000);
    return { name: factionDisplayName, totalTime, timeString: `${hours}h ${minutes}m`, memberCount };
  }).sort((a, b) => b.totalTime - a.totalTime);

  let leaderboardText = "**📊 Daily Faction Time Rankings**\n\n";
  factionData.forEach((faction, index) => {
    const medals = ["🥇", "🥈", "🥉"];
    const medal = medals[index] || "🏅";
    leaderboardText += `${medal} **${faction.name}**\n⏱️ ${faction.timeString} | 👥 ${faction.memberCount} members\n\n`;
  });

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

// Interaction handler
client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try { await command.execute(interaction); } 
    catch (err) {
      console.error(err);
      if (!interaction.replied && !interaction.deferred) {
        try { await interaction.reply({ content: "❌ Error running this command.", ephemeral: true }); } 
        catch { }
      }
    }
  }

  // Add button and select menu handlers here if needed
});

// Voice tracking
client.on("voiceStateUpdate", async (oldState, newState) => {
  const member = newState.member;
  const userId = member.id;

  if (!global.timeTracking) global.timeTracking = {};
  if (!global.userTimes) global.userTimes = {};

  const getUserFaction = () => {
    const factions = ["Laughing Meeks", "Unicorn Rapists", "Special Activities Directive"];
    for (const factionName of factions) {
      const role = member.guild.roles.cache.find(r => r.name === factionName);
      if (role && member.roles.cache.has(role.id)) return factionName.replace(" ", "_");
    }
    return null;
  };

  const clockInChannel = member.guild.channels.cache.get(global.clockInChannelId);

  // Join
  if (!oldState.channel && newState.channel) {
    global.timeTracking[userId] = { startTime: Date.now(), channel: newState.channel.name, channelId: newState.channel.id };
    console.log(`🕐 Started tracking ${member.user.username} in ${newState.channel.name}`);
  }

  // Leave
  if (oldState.channel && !newState.channel && global.timeTracking[userId]) {
    const sessionData = global.timeTracking[userId];
    const timeSpent = Date.now() - sessionData.startTime;
    const userFaction = getUserFaction();

    if (userFaction && global.factionTimes[userFaction] !== undefined) global.factionTimes[userFaction] += timeSpent;

    if (!global.userTimes[userId]) global.userTimes[userId] = { totalTime: 0, sessions: 0, longestSession: 0, todayTime: 0, lastActive: null };
    const userData = global.userTimes[userId];
    userData.totalTime += timeSpent;
    userData.sessions += 1;
    userData.lastActive = Date.now();
    if (timeSpent > userData.longestSession) userData.longestSession = timeSpent;

    if (clockInChannel) {
      const hours = Math.floor(timeSpent / 3600000);
      const minutes = Math.floor((timeSpent % 3600000) / 60000);
      const seconds = Math.floor((timeSpent % 60000) / 1000);
      const timeString = `${hours}h ${minutes}m ${seconds}s`;

      const factionColors = { "Laughing_Meeks": 0xFF6B6B, "Unicorn_Rapists": 0x9B59B6, "Special_Activities_Directive": 0x3498DB, "None": 0x95A5A6 };

      const embed = {
        color: factionColors[userFaction] || 0x95A5A6,
        title: "🕐 Voice Channel Clock Out",
        fields: [
          { name: "👤 User", value: `<@${userId}>`, inline: true },
          { name: "📢 Channel", value: sessionData.channel, inline: true },
          { name: "⏱️ Time Spent", value: timeString, inline: true },
          { name: "🏴 Faction", value: userFaction ? userFaction.replace("_", " ") : "None", inline: false }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "Faction Time Tracking • Keep up the great work!" },
        thumbnail: { url: member.user.displayAvatarURL() }
      };

      await clockInChannel.send({ embeds: [embed] });
      console.log(`📊 Logged ${timeString} for ${member.user.username} in ${sessionData.channel}`);
    }

    delete global.timeTracking[userId];
  }

  // Switch channel
  if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id && global.timeTracking[userId]) {
    const sessionData = global.timeTracking[userId];
    const timeSpent = Date.now() - sessionData.startTime;
    const userFaction = getUserFaction();

    if (userFaction && global.factionTimes[userFaction] !== undefined) global.factionTimes[userFaction] += timeSpent;

    if (!global.userTimes[userId]) global.userTimes[userId] = { totalTime: 0, sessions: 0, longestSession: 0, todayTime: 0, lastActive: null };
    const userData = global.userTimes[userId];
    userData.totalTime += timeSpent;
    userData.sessions += 1;
    userData.lastActive = Date.now();
    if (timeSpent > userData.longestSession) userData.longestSession = timeSpent;

    global.timeTracking[userId] = { startTime: Date.now(), channel: newState.channel.name, channelId: newState.channel.id };
    console.log(`🔄 Switched tracking ${member.user.username} to ${newState.channel.name}`);
  }
});

// Express server for uptime
const app = express();
const PORT = process.env.PORT || 5000;
app.get("/", (req, res) => res.json({ status: "✅ Bot running", uptime: process.uptime(), guilds: client.guilds.cache.size }));
app.listen(PORT, "0.0.0.0", () => console.log(`🌐 Web server running on port ${PORT}`));

// Discord error handling
client.on("error", console.error);
client.on("warn", console.warn);
process.on("unhandledRejection", (reason, promise) => console.error('Unhandled Rejection at:', promise, 'reason:', reason));

// Graceful shutdown
process.on('SIGINT', () => { console.log('🛑 Shutting down gracefully...'); client.destroy(); process.exit(0); });

// Log in
client.login(process.env.DISCORD_TOKEN);
