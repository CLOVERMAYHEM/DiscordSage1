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
  // Add more factions here
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
  // Send daily leaderboard at 12:00 PM UTC every day
  const scheduleDaily = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(12, 0, 0, 0); // 12:00 PM UTC
    
    const msUntilTomorrow = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      sendDailyLeaderboard();
      // Schedule the next one
      setInterval(sendDailyLeaderboard, 24 * 60 * 60 * 1000); // 24 hours
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
    
    // Convert times and sort
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
    
    // Sort by total time (descending)
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

// Monitor messages for instructions
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  // Handle instructions channel
  const isInstructionsChannel = global.instructionsChannelId && message.channel.id === global.instructionsChannelId;
  const isLeaderChannel = global.leaderInstructionsChannelId && message.channel.id === global.leaderInstructionsChannelId;
  if (!isInstructionsChannel && !isLeaderChannel) return;

  // ... (keep your instructions and leader instructions logic here)
});

// Handle interactions (slash commands and dropdowns)
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
          await interaction.reply({ content: "❌ Error running this command.", flags: 64 });
        } catch (replyErr) {
          console.error("Could not send error reply:", replyErr);
        }
      }
    }
  }

  // Handle battle button interactions
  if (interaction.isButton() && interaction.customId.startsWith('battle_join_')) {
    const battleModule = require('./commands/battle.js');
    const handled = await battleModule.handleBattleButton(interaction);
    if (!handled) {
      console.log("Battle button interaction not handled properly");
    }
  }

  // Handle reset times button interactions
  if (interaction.isButton() && (interaction.customId === 'confirm_reset_times' || interaction.customId === 'cancel_reset_times')) {
    const resetModule = require('./commands/resettimes.js');
    const handled = await resetModule.handleResetButton(interaction);
    if (!handled) {
      console.log("Reset button interaction not handled properly");
    }
  }

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

    targetChannel.send(`📢 <@&${leaderRoleId}> **Faction Request Alert!**\n\n<@${user.id}> requested to join **${faction.replace("_", " ")}**!\n\nUse \`/accept @${user.username}\` or \`/deny @${user.username}\``);

    await interaction.reply({ content: `✅ <@${user.id}> requested to join **${faction.replace("_", " ")}**! Leaders have been notified.`, flags: 64 });
  }
});

// Voice channel time tracking
client.on("voiceStateUpdate", async (oldState, newState) => {
  const member = newState.member;
  const userId = member.id;
  
  // Check if user joined a voice channel
  if (!oldState.channel && newState.channel) {
    // Track ALL voice channels since only faction members can access their faction channels
    global.timeTracking[userId] = {
      startTime: Date.now(),
      channel: newState.channel.name,
      channelId: newState.channel.id
    };
    
    // Debug log
    console.log(`🕐 Started tracking ${member.user.username} in ${newState.channel.name}`);
  }
  
  // Check if user left a voice channel
  if (oldState.channel && !newState.channel && global.timeTracking[userId]) {
    const sessionData = global.timeTracking[userId];
    const timeSpent = Date.now() - sessionData.startTime;
    const hours = Math.floor(timeSpent / 3600000);
    const minutes = Math.floor((timeSpent % 3600000) / 60000);
    const seconds = Math.floor((timeSpent % 60000) / 1000);
    
    // Determine user's faction for time tracking
    const factions = [
      "Laughing Meeks",
      "Unicorn Rapists", 
      "Special Activities Directive"
    ];
    
    let userFaction = null;
    for (const factionName of factions) {
      const role = member.guild.roles.cache.find(r => r.name === factionName);
      if (role && member.roles.cache.has(role.id)) {
        userFaction = factionName.replace(" ", "_");
        break;
      }
    }
    
    // Add time to faction total
    if (userFaction && global.factionTimes[userFaction] !== undefined) {
      global.factionTimes[userFaction] += timeSpent;
    }
    
    // Track individual user time
    if (!global.userTimes) global.userTimes = {};
    if (!global.userTimes[userId]) {
      global.userTimes[userId] = {
        totalTime: 0,
        sessions: 0,
        longestSession: 0,
        todayTime: 0,
        lastActive: null
      };
    }
    
    global.userTimes[userId].totalTime += timeSpent;
    global.userTimes[userId].sessions += 1;
    global.userTimes[userId].lastActive = Date.now();
    
    if (timeSpent > global.userTimes[userId].longestSession) {
      global.userTimes[userId].longestSession = timeSpent;
    }
    
    // Award points for voice time
    if (!global.factionPoints) global.factionPoints = {
      "Laughing_Meeks": { points: 0, victories: 0, activities: 0 },
      "Unicorn_Rapists": { points: 0, victories: 0, activities: 0 },
      "Special_Activities_Directive": { points: 0, victories: 0, activities: 0 }
    };
    
    const pointsEarned = Math.floor(timeSpent / 3600000); // 1 point per hour
    if (userFaction && global.factionPoints[userFaction]) {
      global.factionPoints[userFaction].points += pointsEarned;
      global.factionPoints[userFaction].activities += 1;
    }
    
    // Check achievements
    const achievementsModule = require('./commands/achievements.js');
    achievementsModule.checkAndUnlockAchievements(userId, global.userTimes[userId].totalTime);
    
    // Send clock-out message
    if (global.clockInChannelId) {
      const clockInChannel = member.guild.channels.cache.get(global.clockInChannelId);
      if (clockInChannel) {
        let timeString = "";
        if (hours > 0) timeString += `${hours}h `;
        if (minutes > 0) timeString += `${minutes}m `;
        timeString += `${seconds}s`;
        
        const factionColors = {
          "Laughing_Meeks": 0xFF6B6B,
          "Unicorn_Rapists": 0x9B59B6,
          "Special_Activities_Directive": 0x3498DB,
          "None": 0x95A5A6
        };
        
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
      } else {
        console.log("❌ Clock-in channel not found! Use /setclockchannel to set one.");
      }
    } else {
      console.log("❌ Clock-in channel not set! Use /setclockchannel to set one.");
    }
    
    delete global.timeTracking[userId];
  }
  
  // Handle channel switching
  if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id && global.timeTracking[userId]) {
    // User switched channels - end current session and start new one
    const sessionData = global.timeTracking[userId];
    const timeSpent = Date.now() - sessionData.startTime;
    
    // Determine user's faction for time tracking
    let userFaction = null;
    const factions = [
      "Laughing Meeks",
      "Unicorn Rapists", 
      "Special Activities Directive"
    ];
    
    for (const factionName of factions) {
      const role = member.guild.roles.cache.find(r => r.name === factionName);
      if (role && member.roles.cache.has(role.id)) {
        userFaction = factionName.replace(" ", "_");
        break;
      }
    }
    
    // Add time to faction total
    if (userFaction && global.factionTimes[userFaction] !== undefined) {
      global.factionTimes[userFaction] += timeSpent;
    }
    
    // Track individual user time
    if (!global.userTimes) global.userTimes = {};
    if (!global.userTimes[userId]) {
      global.userTimes[userId] = {
        totalTime: 0,
        sessions: 0,
        longestSession: 0,
        todayTime: 0,
        lastActive: null
      };
    }
    
    global.userTimes[userId].totalTime += timeSpent;
    global.userTimes[userId].sessions += 1;
    global.userTimes[userId].lastActive = Date.now();
    
    if (timeSpent > global.userTimes[userId].longestSession) {
      global.userTimes[userId].longestSession = timeSpent;
    }
    
    // Award points for voice time
    if (!global.factionPoints) global.factionPoints = {
      "Laughing_Meeks": { points: 0, victories: 0, activities: 0 },
      "Unicorn_Rapists": { points: 0, victories: 0, activities: 0 },
      "Special_Activities_Directive": { points: 0, victories: 0, activities: 0 }
    };
    
    const pointsEarned = Math.floor(timeSpent / 3600000); // 1 point per hour
    if (userFaction && global.factionPoints[userFaction]) {
      global.factionPoints[userFaction].points += pointsEarned;
      global.factionPoints[userFaction].activities += 1;
    }
    
    // Check achievements
    const achievementsModule = require('./commands/achievements.js');
    achievementsModule.checkAndUnlockAchievements(userId, global.userTimes[userId].totalTime);
    
    // Start tracking in new channel (track all voice channels)
    global.timeTracking[userId] = {
      startTime: Date.now(),
      channel: newState.channel.name,
      channelId: newState.channel.id
    };
    
    console.log(`🔄 Switched tracking ${member.user.username} to ${newState.channel.name}`);
  }
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

// Discord error handling
client.on('error', console.error);
client.on('warn', console.warn);
process.on('unhandledRejection', (reason, promise) => console.error('Unhandled Rejection at:', promise, 'reason:', reason));

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

// Log in using the correct environment variable
client.login(process.env.DISCORD_TOKEN);