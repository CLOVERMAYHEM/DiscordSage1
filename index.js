// Load environment variables
require('dotenv').config();

const fs = require("fs");
const express = require("express");
const { Client, Collection, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");

// Initialize global storage
if (!global.timeTracking) global.timeTracking = {};
if (!global.factionTimes) global.factionTimes = {
  "Laughing_Meeks": 0,
  "Unicorn_Rapists": 0,
  "Special_Activities_Directive": 0
};
if (!global.pendingRequests) global.pendingRequests = {};
if (!global.clockInChannelId) global.clockInChannelId = null;
if (!global.notificationChannelId) global.notificationChannelId = null;

// Faction leaders mapping
global.factionLeaders = {
  "Laughing_Meeks": "1406779732275499098",
  "Unicorn_Rapists": "1406779912441823303",
  "Special_Activities_Directive": "1409081159811334204",
};

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

// Load command files
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command?.data?.name) client.commands.set(command.data.name, command);
  else console.warn(`⚠️ Command file ${file} is missing 'data.name'`);
}

// Client ready
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
    console.log("✅ Slash commands registered!");
  } catch (err) {
    console.error("❌ Error registering commands:", err);
  }

  startDailyLeaderboard();
  console.log("📅 Daily leaderboard scheduling started");
});

// Daily leaderboard function
function startDailyLeaderboard() {
  const scheduleDaily = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(12, 0, 0, 0); // 12:00 PM UTC

    const msUntilTomorrow = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      sendDailyLeaderboard();
      setInterval(sendDailyLeaderboard, 24 * 60 * 60 * 1000);
    }, msUntilTomorrow);
  };

  scheduleDaily();
}

async function sendDailyLeaderboard() {
  try {
    if (!global.clockInChannelId) return;

    const guild = client.guilds.cache.first();
    if (!guild) return;

    const clockInChannel = guild.channels.cache.get(global.clockInChannelId);
    if (!clockInChannel) return;

    const factionData = [];
    for (const [factionKey, totalTime] of Object.entries(global.factionTimes)) {
      const factionDisplay = factionKey.replace("_", " ");
      const role = guild.roles.cache.find(r => r.name === factionDisplay);
      const memberCount = role ? role.members.size : 0;
      const hours = Math.floor(totalTime / 3600000);
      const minutes = Math.floor((totalTime % 3600000) / 60000);

      factionData.push({
        name: factionDisplay,
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
  } catch (err) {
    console.error("❌ Error sending daily leaderboard:", err);
  }
}

// Slash command handling
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
        } catch {}
      }
    }
  }

  // Faction select menu
  if (interaction.isStringSelectMenu() && interaction.customId === "faction_select") {
    const user = interaction.user;
    const faction = interaction.values[0];

    global.pendingRequests[user.id] = faction;

    const leaderRoleId = global.factionLeaders[faction];
    if (!leaderRoleId)
      return interaction.reply({ content: "❌ No leader role set for this faction.", ephemeral: true });

    const leaderRole = interaction.guild.roles.cache.get(leaderRoleId);
    if (!leaderRole)
      return interaction.reply({ content: "❌ Leader role not found in this server.", ephemeral: true });

    const targetChannel =
      interaction.guild.channels.cache.get(global.notificationChannelId) ||
      interaction.guild.channels.cache.find(c => c.type === 0);

    if (!targetChannel)
      return interaction.reply({ content: "❌ No text channel found to send notifications!", ephemeral: true });

    targetChannel.send(
      `📢 <@&${leaderRoleId}> **Faction Request Alert!**\n\n<@${user.id}> requested to join **${faction.replace("_", " ")}**!\n\nUse \`/accept @${user.username}\` or \`/deny @${user.username}\``
    );

    await interaction.reply({
      content: `✅ Request sent! Leaders have been notified.`,
      ephemeral: true
    });
  }
});

// Voice channel tracking
client.on("voiceStateUpdate", async (oldState, newState) => {
  const member = newState.member;
  const userId = member.id;

  // Join
  if (!oldState.channel && newState.channel) {
    global.timeTracking[userId] = {
      startTime: Date.now(),
      channel: newState.channel.name,
      channelId: newState.channel.id
    };
    console.log(`🕐 Started tracking ${member.user.username} in ${newState.channel.name}`);
  }

  // Leave or switch
  if ((oldState.channel && !newState.channel) || (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id)) {
    if (!global.timeTracking[userId]) return;

    const session = global.timeTracking[userId];
    const timeSpent = Date.now() - session.startTime;

    // Determine faction
    const factions = ["Laughing Meeks", "Unicorn Rapists", "Special Activities Directive"];
    let userFaction = null;
    for (const factionName of factions) {
      const role = member.guild.roles.cache.find(r => r.name === factionName);
      if (role && member.roles.cache.has(role.id)) {
        userFaction = factionName.replace(" ", "_");
        break;
      }
    }

    if (userFaction && global.factionTimes[userFaction] !== undefined) {
      global.factionTimes[userFaction] += timeSpent;
    }

    delete global.timeTracking[userId];
    console.log(`📊 Logged ${member.user.username}'s session in ${session.channel}`);
  }
});

// Express server
const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => res.json({ status: "✅ Bot running" }));
app.get("/health", (req, res) => res.json({ status: "healthy" }));
app.listen(PORT, "0.0.0.0", () => console.log(`🌐 Web server running on port ${PORT}`));

// Login
client.login(process.env.DISCORD_TOKEN);
