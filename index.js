// Load environment variables
require('dotenv').config();

const fs = require("fs");
const express = require("express");
const {
  Client,
  Collection,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");

// Initialize global storage
if (!global.timeTracking) global.timeTracking = {};
if (!global.factionTimes)
  global.factionTimes = {
    Laughing_Meeks: 0,
    Unicorn_Rapists: 0,
    Special_Activities_Directive: 0,
  };
if (!global.userTimes) global.userTimes = {};
if (!global.pendingRequests) global.pendingRequests = {};
if (!global.clockInChannelId) global.clockInChannelId = null;
if (!global.notificationChannelId) global.notificationChannelId = null;
if (!global.guildSettings) global.guildSettings = {};
if (!global.warnChannelId) global.warnChannelId = null;
if (!global.stickyMessages) global.stickyMessages = {};
if (!global.messageCounters) global.messageCounters = {}; // Track messages per channel for sticky system

// Faction leaders mapping
global.factionLeaders = {
  Laughing_Meeks: "1406779732275499098",
  Unicorn_Rapists: "1406779912441823303",
  Special_Activities_Directive: "1409081159811334204",
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
const commandFiles = fs
  .readdirSync("./commands")
  .filter((f) => f.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command?.data?.name) client.commands.set(command.data.name, command);
  else console.warn(`⚠️ Command file ${file} is missing 'data.name'`);
}

// Import sticky message functions
const { checkStickyMessages, isUserBotAdmin } = require('./commands/stick.js');

// Utility function to format time duration
function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

// Utility function to check if factions are enabled for a guild
function areFactionsEnabled(guild) {
  const guildId = guild.id;
  if (!global.guildSettings[guildId]) {
    // Initialize with default settings (factions enabled)
    global.guildSettings[guildId] = {
      factionsEnabled: true,
      clockInChannelId: null,
      notificationChannelId: null,
      welcomeChannelId: null
    };
  }
  return global.guildSettings[guildId].factionsEnabled;
}

// Utility function to get user's faction
function getUserFaction(member) {
  // Return null if factions are disabled for this guild
  if (!areFactionsEnabled(member.guild)) {
    return null;
  }
  
  const factions = [
    "Laughing Meeks",
    "Unicorn Rapists",
    "Special Activities Directive",
  ];
  for (const factionName of factions) {
    const role = member.guild.roles.cache.find((r) => r.name === factionName);
    if (role && member.roles.cache.has(role.id)) {
      return {
        name: factionName,
        key: factionName.replace(" ", "_"),
      };
    }
  }
  return null;
}

// Send clock-in message
async function sendClockInMessage(member, channel) {
  if (!global.clockInChannelId) return;

  try {
    const guild = member.guild;
    const clockInChannel = guild.channels.cache.get(global.clockInChannelId);
    if (!clockInChannel) {
      console.warn(`⚠️ Clock-in channel not found: ${global.clockInChannelId}`);
      return;
    }

    const faction = getUserFaction(member);
    const embed = new EmbedBuilder()
      .setTitle("🟢 Voice Channel Join")
      .setColor(0x00ff00)
      .setDescription(`${member} joined **${channel.name}**`)
      .addFields(
        {
          name: "👤 User",
          value: `${member.displayName} (${member.user.username})`,
          inline: true,
        },
        { name: "🔊 Channel", value: channel.name, inline: true },
        {
          name: "👥 Faction",
          value: faction ? faction.name : "No Faction",
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({ text: "Clock-in System" });

    await clockInChannel.send({ embeds: [embed] });
    console.log(
      `📝 Sent clock-in message for ${member.user.username} in ${channel.name}`,
    );
  } catch (error) {
    console.error(`❌ Error sending clock-in message:`, error);
  }
}

// Send clock-out message
async function sendClockOutMessage(member, channel, sessionDuration) {
  if (!global.clockInChannelId) return;

  try {
    const guild = member.guild;
    const clockInChannel = guild.channels.cache.get(global.clockInChannelId);
    if (!clockInChannel) {
      console.warn(`⚠️ Clock-in channel not found: ${global.clockInChannelId}`);
      return;
    }

    const faction = getUserFaction(member);
    const durationText = formatDuration(sessionDuration);

    const embed = new EmbedBuilder()
      .setTitle("🔴 Voice Channel Leave")
      .setColor(0xff0000)
      .setDescription(`${member} left **${channel.name}**`)
      .addFields(
        {
          name: "👤 User",
          value: `${member.displayName} (${member.user.username})`,
          inline: true,
        },
        { name: "🔊 Channel", value: channel.name, inline: true },
        {
          name: "👥 Faction",
          value: faction ? faction.name : "No Faction",
          inline: true,
        },
        { name: "⏱️ Session Duration", value: durationText, inline: false },
      )
      .setTimestamp()
      .setFooter({ text: "Clock-out System" });

    await clockInChannel.send({ embeds: [embed] });
    console.log(
      `📝 Sent clock-out message for ${member.user.username} from ${channel.name} (${durationText})`,
    );
  } catch (error) {
    console.error(`❌ Error sending clock-out message:`, error);
  }
}

// Send motivational DM to user after voice session
async function sendMotivationalDM(member, sessionDuration) {
  // Only send motivational DMs if factions are enabled for this guild
  if (!areFactionsEnabled(member.guild)) {
    return;
  }
  
  try {
    const faction = getUserFaction(member);
    const durationText = formatDuration(sessionDuration);
    
    // Motivational messages based on faction
    const motivationalMessages = {
      "Laughing Meeks": [
        "Keep laughing in the face of adversity! Your faction is proud of your dedication!",
        "Another victory for the Laughing Meeks! Your time and effort strengthen the brotherhood!",
        "The Meeks legacy grows stronger with warriors like you! Keep up the amazing work!",
        "Laughter echoes through the ranks - your faction salutes your commitment!"
      ],
      "Unicorn Rapists": [
        "Magnificent work, warrior! Your faction's power grows with every moment you contribute!",
        "The unicorns bow to your dedication! Keep charging forward for glory!",
        "Your commitment brings honor to the Unicorn Rapists! Stay fierce!",
        "Legend in the making! Your faction celebrates your unwavering spirit!"
      ],
      "Special Activities Directive": [
        "Mission accomplished, operative! Your dedication to the directive is exemplary!",
        "Special activities require special dedication - and you've delivered! Outstanding work!",
        "The directive recognizes your exceptional commitment! Keep executing with precision!",
        "Your service to the Special Activities Directive is commendable! Stay focused!"
      ],
      "No Faction": [
        "Great work in voice! Consider joining a faction to maximize your impact!",
        "Impressive dedication! A faction would be lucky to have someone with your commitment!",
        "Keep up the excellent work! Your potential could shine even brighter with a faction!",
        "Outstanding effort! Think about which faction could benefit from your dedication!"
      ]
    };

    const factionName = faction ? faction.name : "No Faction";
    const messages = motivationalMessages[factionName] || motivationalMessages["No Faction"];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Create faction-themed embed
    const factionColors = {
      "Laughing Meeks": 0xFF6B6B,
      "Unicorn Rapists": 0x9B59B6,
      "Special Activities Directive": 0x3498DB,
      "No Faction": 0x95A5A6
    };

    const embed = new EmbedBuilder()
      .setTitle("🏆 Session Complete!")
      .setColor(factionColors[factionName])
      .setDescription(randomMessage)
      .addFields(
        { name: "⏱️ Time Clocked", value: durationText, inline: true },
        { name: "🏴 Faction", value: factionName, inline: true }
      )
      .setFooter({ text: "Every minute counts for your faction's glory!" })
      .setTimestamp();

    // Send DM to user
    await member.send({ embeds: [embed] });
    console.log(`📨 Sent motivational DM to ${member.user.username} (${durationText})`);
    
  } catch (error) {
    // User might have DMs disabled or blocked the bot
    console.log(`⚠️ Could not send DM to ${member.user.username}: ${error.message}`);
  }
}

// Send channel switch message
async function sendChannelSwitchMessage(
  member,
  oldChannel,
  newChannel,
  sessionDuration,
) {
  if (!global.clockInChannelId) return;

  try {
    const guild = member.guild;
    const clockInChannel = guild.channels.cache.get(global.clockInChannelId);
    if (!clockInChannel) {
      console.warn(`⚠️ Clock-in channel not found: ${global.clockInChannelId}`);
      return;
    }

    const faction = getUserFaction(member);
    const durationText = formatDuration(sessionDuration);

    const embed = new EmbedBuilder()
      .setTitle("🔄 Voice Channel Switch")
      .setColor(0xffaa00)
      .setDescription(`${member} switched voice channels`)
      .addFields(
        {
          name: "👤 User",
          value: `${member.displayName} (${member.user.username})`,
          inline: true,
        },
        {
          name: "👥 Faction",
          value: faction ? faction.name : "No Faction",
          inline: true,
        },
        { name: "📤 Left Channel", value: oldChannel.name, inline: false },
        { name: "📥 Joined Channel", value: newChannel.name, inline: true },
        { name: "⏱️ Previous Session", value: durationText, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: "Channel Switch System" });

    await clockInChannel.send({ embeds: [embed] });
    console.log(
      `📝 Sent channel switch message for ${member.user.username}: ${oldChannel.name} → ${newChannel.name} (${durationText})`,
    );
  } catch (error) {
    console.error(`❌ Error sending channel switch message:`, error);
  }
}

// Handle new messages for sticky message system
async function handleStickyMessageCheck(message) {
  // Skip bot messages and non-text channels
  if (message.author.bot || message.channel.type !== ChannelType.GuildText) {
    return;
  }

  const channelId = message.channel.id;
  
  // Check if there's a sticky message for this channel
  if (!global.stickyMessages[channelId]) {
    return;
  }

  // Skip if this message is the sticky message itself to prevent infinite loops
  if (message.id === global.stickyMessages[channelId].messageId) {
    return;
  }

  // Initialize message counter for this channel if it doesn't exist
  if (typeof global.messageCounters[channelId] !== 'number') {
    global.messageCounters[channelId] = 0;
  }

  // Increment message counter
  global.messageCounters[channelId]++;

  console.log(`📊 Message count in ${message.channel.name}: ${global.messageCounters[channelId]}/3`);

  // Check if we've reached 3 messages since last sticky repost
  if (global.messageCounters[channelId] >= 3) {
    try {
      // Reset counter first
      global.messageCounters[channelId] = 0;
      
      // Repost sticky message
      await repostStickyMessage(message.channel, channelId, global.stickyMessages[channelId]);
      
      console.log(`📌 Reposted sticky message in ${message.channel.name} after 3 messages`);
    } catch (error) {
      console.error(`❌ Error reposting sticky message in ${channelId}:`, error);
      // If reposting fails, remove the sticky message to prevent further errors
      delete global.stickyMessages[channelId];
      delete global.messageCounters[channelId];
    }
  }
}

// Repost sticky message function
async function repostStickyMessage(channel, channelId, stickyData) {
  const styles = {
    info: { color: 0x3498DB, emoji: "🎯", title: "Information" },
    warning: { color: 0xF39C12, emoji: "⚠️", title: "Warning" },
    important: { color: 0xE74C3C, emoji: "🚨", title: "Important Notice" },
    announcement: { color: 0x9B59B6, emoji: "📢", title: "Announcement" },
    event: { color: 0x2ECC71, emoji: "🎉", title: "Event" }
  };
  
  const styleConfig = styles[stickyData.style] || styles.info;
  
  try {
    // First delete old sticky message if it exists
    if (stickyData.messageId) {
      try {
        const oldMessage = await channel.messages.fetch(stickyData.messageId);
        if (oldMessage) {
          await oldMessage.delete();
          console.log(`🗑️ Deleted old sticky message in ${channel.name}`);
        }
      } catch (error) {
        console.log(`⚠️ Could not delete old sticky message: ${error.message}`);
        // Continue anyway, old message might already be deleted
      }
    }

    // Fetch user for footer
    let user;
    try {
      user = await channel.client.users.fetch(stickyData.author);
    } catch (error) {
      console.log(`⚠️ Could not fetch sticky message author: ${error.message}`);
      user = { username: "Unknown User", displayAvatarURL: () => null };
    }
    
    const embed = new EmbedBuilder()
      .setTitle(`${styleConfig.emoji} ${styleConfig.title}`)
      .setDescription(stickyData.content)
      .setColor(styleConfig.color)
      .addFields({
        name: "📌 Sticky Message",
        value: "This message will automatically reappear every 3 messages.",
        inline: false
      })
      .setFooter({ 
        text: `Sticky message by ${user.username} • Reposted automatically`,
        iconURL: user.displayAvatarURL ? user.displayAvatarURL() : null
      })
      .setTimestamp();

    // Send new sticky message
    const newMessage = await channel.send({ embeds: [embed] });
    console.log(`✅ Posted new sticky message in ${channel.name}`);
    
    // Update stored message ID and timestamp
    global.stickyMessages[channelId].messageId = newMessage.id;
    global.stickyMessages[channelId].lastReposted = Date.now();
    
  } catch (error) {
    console.error(`❌ Error in repostStickyMessage for ${channel.name}:`, error);
    // If we can't send the message, remove the sticky to prevent further errors
    delete global.stickyMessages[channelId];
    delete global.messageCounters[channelId];
    console.log(`🧹 Removed broken sticky message from ${channel.name}`);
    throw error; // Re-throw so caller knows it failed
  }
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
  console.log("📌 Sticky message system initialized");
});

// Message event handler
client.on("messageCreate", async (message) => {
  // Handle sticky message checking
  await handleStickyMessageCheck(message);
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
      const role = guild.roles.cache.find((r) => r.name === factionDisplay);
      const memberCount = role ? role.members.size : 0;
      const hours = Math.floor(totalTime / 3600000);
      const minutes = Math.floor((totalTime % 3600000) / 60000);

      factionData.push({
        name: factionDisplay,
        totalTime,
        timeString: `${hours}h ${minutes}m`,
        memberCount,
      });
    }

    factionData.sort((a, b) => b.totalTime - a.totalTime);

    const embed = new EmbedBuilder()
      .setTitle("📊 Daily Faction Leaderboard")
      .setColor(0x3498db)
      .setDescription("Here are today's faction activity standings!")
      .setTimestamp()
      .setFooter({ text: "Daily Leaderboard • Updates every 24 hours" });

    factionData.forEach((faction, index) => {
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";
      embed.addFields({
        name: `${medal} ${faction.name}`,
        value: `⏱️ **${faction.timeString}**\n👥 ${faction.memberCount} members`,
        inline: true,
      });
    });

    await clockInChannel.send({ embeds: [embed] });
    console.log("📊 Daily leaderboard sent");

    // Reset daily times
    for (const key of Object.keys(global.factionTimes)) {
      global.factionTimes[key] = 0;
    }
    global.userTimes = {};

  } catch (error) {
    console.error("❌ Error sending daily leaderboard:", error);
  }
}

// Voice state update handler
client.on("voiceStateUpdate", async (oldState, newState) => {
  const member = newState.member || oldState.member;
  const userId = member.id;
  const now = Date.now();

  // User joined a voice channel
  if (!oldState.channel && newState.channel) {
    global.timeTracking[userId] = {
      startTime: now,
      channel: newState.channel,
    };

    await sendClockInMessage(member, newState.channel);
    console.log(
      `👤 ${member.user.username} joined voice channel: ${newState.channel.name}`,
    );
  }
  // User left a voice channel
  else if (oldState.channel && !newState.channel) {
    if (global.timeTracking[userId]) {
      const sessionDuration = now - global.timeTracking[userId].startTime;
      const faction = getUserFaction(member);

      // Only track time if factions are enabled for this guild
      if (areFactionsEnabled(member.guild)) {
        // Add to user's total time
        if (!global.userTimes[userId]) global.userTimes[userId] = 0;
        global.userTimes[userId] += sessionDuration;

        // Add to faction time if user has a faction
        if (faction) {
          global.factionTimes[faction.key] += sessionDuration;
        }
      }

      await sendClockOutMessage(member, oldState.channel, sessionDuration);
      await sendMotivationalDM(member, sessionDuration);

      delete global.timeTracking[userId];
      console.log(
        `👤 ${member.user.username} left voice channel: ${oldState.channel.name} (${formatDuration(sessionDuration)})`,
      );
    }
  }
  // User switched channels
  else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
    if (global.timeTracking[userId]) {
      const sessionDuration = now - global.timeTracking[userId].startTime;
      const faction = getUserFaction(member);

      // Only track time if factions are enabled for this guild
      if (areFactionsEnabled(member.guild)) {
        // Add to user's total time
        if (!global.userTimes[userId]) global.userTimes[userId] = 0;
        global.userTimes[userId] += sessionDuration;

        // Add to faction time if user has a faction
        if (faction) {
          global.factionTimes[faction.key] += sessionDuration;
        }
      }

      await sendChannelSwitchMessage(
        member,
        oldState.channel,
        newState.channel,
        sessionDuration,
      );

      // Update tracking for new channel
      global.timeTracking[userId] = {
        startTime: now,
        channel: newState.channel,
      };

      console.log(
        `👤 ${member.user.username} switched: ${oldState.channel.name} → ${newState.channel.name} (${formatDuration(sessionDuration)})`,
      );
    }
  }
});

// Interaction handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ Error executing ${interaction.commandName}:`, error);
    const reply = {
      content: "❌ There was an error executing this command!",
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// Handle member join events for welcome messages
client.on("guildMemberAdd", async (member) => {
  try {
    const guildId = member.guild.id;
    
    // Check if guild settings exist and have a welcome channel set
    if (!global.guildSettings[guildId] || !global.guildSettings[guildId].welcomeChannelId) {
      return; // No welcome channel set
    }
    
    const welcomeChannelId = global.guildSettings[guildId].welcomeChannelId;
    const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
    
    if (!welcomeChannel) {
      console.warn(`⚠️ Welcome channel not found: ${welcomeChannelId}`);
      return;
    }
    
    // Create welcome embed
    const embed = new EmbedBuilder()
      .setTitle("🎉 Welcome to the Server!")
      .setColor(0x00ff00)
      .setDescription(`Welcome ${member}! We're glad to have you here.`)
      .addFields(
        { name: "👤 Member", value: `${member.displayName}`, inline: true },
        { name: "📅 Joined", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        { name: "📊 Member Count", value: `${member.guild.memberCount}`, inline: true }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp()
      .setFooter({ text: "Welcome System" });
    
    await welcomeChannel.send({ embeds: [embed] });
    console.log(`👋 Sent welcome message for ${member.user.username}`);
    
  } catch (error) {
    console.error("❌ Error sending welcome message:", error);
  }
});

// Start Express server for health checks
const app = express();
app.get('/', (req, res) => {
  res.send('Discord bot is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Health check server running on port ${PORT}`);
});

// Login to Discord
const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
if (!token) {
  console.error("❌ No Discord token found! Please set DISCORD_TOKEN or TOKEN environment variable.");
  process.exit(1);
}

client.login(token);
