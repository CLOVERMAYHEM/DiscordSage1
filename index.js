// Load environment variables
require('dotenv').config();

const fs = require("fs");
const express = require("express");
const { Client, Collection, GatewayIntentBits } = require("discord.js");

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

// Global storage for tracking times
if (!global.timeTracking) global.timeTracking = {};
if (!global.factionTimes) global.factionTimes = {
  "Laughing_Meeks": 0,
  "Unicorn_Rapists": 0,
  "Special_Activities_Directive": 0
};
if (!global.clockInChannelId) global.clockInChannelId = null;

client.commands = new Collection();

// --- FIXED COMMAND LOADING ---
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (!command || !command.data || !command.data.name) {
    console.warn(`⚠️ Skipping command file: ${file} (missing data.name)`);
    continue;
  }
  client.commands.set(command.data.name, command);
}

// Faction leader mapping
const factionLeaders = {
  "Laughing_Meeks": "1406779732275499098",
  "Unicorn_Rapists": "1406779912441823303",
  "Special_Activities_Directive": "1409081159811334204",
};

// --- CLIENT READY ---
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

  // Sticky messages module
  const stickyModule = require('./commands/stick.js');
  setInterval(() => {
    stickyModule.checkStickyMessages(client);
  }, 30000); // every 30 seconds
  console.log("📌 Sticky message monitoring started");
});

// --- DAILY LEADERBOARD FUNCTION ---
function startDailyLeaderboard() {
  const scheduleDaily = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(12, 0, 0, 0);

    const msUntilTomorrow = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      sendDailyLeaderboard();
      setInterval(sendDailyLeaderboard, 24 * 60 * 60 * 1000); // repeat daily
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
        totalTime,
        timeString: `${hours}h ${minutes}m`,
        memberCount
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

// --- INTERACTIONS ---
client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({ content: "❌ Error running this command.", ephemeral: true });
        } catch (replyErr) {
          console.error("Could not send error reply:", replyErr);
        }
      }
    }
  }

  // You can keep your button and select menu interactions here (battle, reset, faction requests, etc.)
});

// --- VOICE STATE TRACKING ---
client.on("voiceStateUpdate", async (oldState, newState) => {
  // Keep your full voice tracking logic here as in your current code
});

// --- EXPRESS SERVER ---
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

// --- ERROR HANDLING ---
client.on('error', console.error);
client.on('warn', console.warn);
process.on('unhandledRejection', (reason, promise) => console.error('Unhandled Rejection at:', promise, 'reason:', reason));

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

// --- LOGIN ---
client.login(process.env.DISCORD_TOKEN);
