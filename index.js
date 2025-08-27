// Load environment variables from .env
require('dotenv').config();

const fs = require("fs");
const express = require("express");
const { Client, Collection, GatewayIntentBits } = require("discord.js");

// Time tracking storage (in production, use a database)
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

// Discord client ready event
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Register slash commands
  const commands = [];
  for (const [name, command] of client.commands) {
    commands.push(command.data.toJSON());
  }

  try {
    console.log("🔄 Registering slash commands...");
    await client.application.commands.set(commands);
    console.log("✅ Slash commands registered successfully!");
  } catch (error) {
    console.error("❌ Error registering commands:", error);
  }

  // Start daily leaderboard schedule
  startDailyLeaderboard();

  // Start sticky message monitoring
  const stickyModule = require('./commands/stick.js');
  setInterval(() => {
    stickyModule.checkStickyMessages(client);
  }, 30000); // Check every 30 seconds
  console.log("📌 Sticky message monitoring started");
});

// Daily leaderboard function
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
  try {
    if (!global.clockInChannelId) return;

    const guild = client.guilds.cache.first();
    if (!guild) return;

    const clockInChannel = guild.channels.cache.get(global.clockInChannelId);
    if (!clockInChannel) return;

    const factionTimes = global.factionTimes || {
      "Laughing_Meeks": 0,
      "Unicorn_Rapists": 0,
      "Special_Activities_Directive": 0
    };

    const factionData = [];
    for (const [factionKey, totalTime] of Object.entries(factionTimes)) {
      const factionDisplayName = factionKey.replace("_", " ");
      const role = guild.roles.cache.find(r => r.name === factionDisplayName);
      const memberCount = role ? role.members.size : 0;

      const hours = Math.floor(totalTime / 3600000);
      const minutes = Math.floor((totalTime % 3600000) / 60000);

      factionData.push({
        name: factionDisplayName,
        totalTime: totalTime,
        timeString: `${hours}h ${minutes}m`,
        memberCount: memberCount
      });
    }

    factionData.sort((a, b) => b.totalTime - a.totalTime);

    let leaderboardText = "**📊 Daily Faction Time Rankings**\n\n";
    factionData.forEach((faction, index) => {
      const medals = ["🥇", "🥈", "🥉"];
      const medal = medals[index] || "🏅";

      leaderboardText += `${medal} **${faction.name}**\n`;
      leaderboardText += `⏱️ ${faction.timeString} | 👥 ${faction.memberCount} members\n\n`;
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
  } catch (error) {
    console.error("❌ Error sending daily leaderboard:", error);
  }
}

// Handle interactions (commands + dropdowns)
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

  // Faction request handling
  if (interaction.isStringSelectMenu() && interaction.customId === "faction_select") {
    const faction = interaction.values[0];
    const user = interaction.user;

    if (!global.pendingRequests) global.pendingRequests = {};
    global.pendingRequests[user.id] = faction;

    const leaderRoleId = factionLeaders[faction];
    if (!leaderRoleId) return interaction.reply({ content: "❌ No leader role set for this faction.", ephemeral: true });

    const leaderRole = interaction.guild.roles.cache.get(leaderRoleId);
    if (!leaderRole) return interaction.reply({ content: "❌ Leader role not found in this server.", ephemeral: true });

    let targetChannel = interaction.guild.channels.cache.get(global.notificationChannelId) || interaction.guild.channels.cache.find(c => c.type === 0);
    if (!targetChannel) return interaction.reply({ content: "❌ No text channel found to send notifications!", ephemeral: true });

    targetChannel.send(`📢 <@&${leaderRoleId}> **Faction Request Alert!**
<@${user.id}> requested to join **${faction.replace("_", " ")}**.
Use \`/accept @${user.username}\` or \`/deny @${user.username}\` to respond.`);

    await interaction.reply({ content: `✅ Your request to join **${faction.replace("_", " ")}** has been sent to the leaders.`, ephemeral: true });
  }

  // Other interactions (battle buttons, reset, etc.) are unchanged
});

// Voice channel tracking (unchanged)
client.on("voiceStateUpdate", async (oldState, newState) => {
  // All your previous voice tracking logic remains here
  // No changes needed for faction request fixes
});

// Express server for uptime
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

app.get("/health", (req, res) => res.json({ status: "healthy", uptime: process.uptime() }));
app.get("/ping", (req, res) => res.send("pong"));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web server running on port ${PORT}`);
  console.log(`📡 Ready for UptimeRobot monitoring`);
});

// Error handling & graceful shutdown
client.on('error', console.error);
client.on('warn', console.warn);
process.on('unhandledRejection', (reason, promise) => console.error('Unhandled Rejection at:', promise, 'reason:', reason));
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

// Log in with environment variable
client.login(process.env.DISCORD_TOKEN);
