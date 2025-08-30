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
if (!global.warnChannelId) global.warnChannelId = null; // New variable for invite warnings

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
      notificationChannelId: null
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
      color: 0xffd700,
      title: "🎯 Daily Faction Voice Time Report",
      description: leaderboardText,
      timestamp: new Date().toISOString(),
      footer: { text: "Keep up the great work, faction warriors!" },
    };

    await clockInChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error("❌ Error sending daily leaderboard:", err);
  }
}

// Slash command handling
client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Check if command requires factions and if they're disabled
    const factionCommands = ['accept', 'deny', 'joinfaction', 'leavefaction', 'factionstats', 'timeleaderboard', 'factiontime', 'factions'];
    if (factionCommands.includes(interaction.commandName) && !areFactionsEnabled(interaction.guild)) {
      return interaction.reply({
        content: "❌ Faction features are disabled in this server! Use `/togglefactions enabled:true` to enable them.",
        ephemeral: true,
      });
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({
            content: "❌ Error running this command.",
            ephemeral: true,
          });
        } catch {}
      }
    }
  }

  // Faction select menu
  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "faction_select"
  ) {
    // Check if factions are enabled for this guild
    if (!areFactionsEnabled(interaction.guild)) {
      return interaction.reply({
        content: "❌ Faction features are disabled in this server!",
        ephemeral: true,
      });
    }

    const user = interaction.user;
    const faction = interaction.values[0];

    global.pendingRequests[user.id] = faction;

    const leaderRoleId = global.factionLeaders[faction];
    if (!leaderRoleId)
      return interaction.reply({
        content: "❌ No leader role set for this faction.",
        ephemeral: true,
      });

    const leaderRole = interaction.guild.roles.cache.get(leaderRoleId);
    if (!leaderRole)
      return interaction.reply({
        content: "❌ Leader role not found in this server.",
        ephemeral: true,
      });

    const targetChannel =
      interaction.guild.channels.cache.get(global.notificationChannelId) ||
      interaction.guild.channels.cache.find((c) => c.type === 0);

    if (!targetChannel)
      return interaction.reply({
        content: "❌ No text channel found to send notifications!",
        ephemeral: true,
      });

    targetChannel.send(
      `📢 <@&${leaderRoleId}> **Faction Request Alert!**\n\n<@${user.id}> requested to join **${faction.replace("_", " ")}**!\n\nUse \`/accept @${user.username}\` or \`/deny @${user.username}\``,
    );

    await interaction.reply({
      content: `✅ Request sent! Leaders have been notified.`,
      ephemeral: true,
    });
  }
});

// Enhanced voice channel tracking with clock-in/clock-out messages
client.on("voiceStateUpdate", async (oldState, newState) => {
  const member = newState.member;
  const userId = member.id;

  // User joined a voice channel (from no channel)
  if (!oldState.channel && newState.channel) {
    global.timeTracking[userId] = {
      startTime: Date.now(),
      channel: newState.channel.name,
      channelId: newState.channel.id,
    };

    console.log(
      `🕐 Started tracking ${member.user.username} in ${newState.channel.name}`,
    );
    await sendClockInMessage(member, newState.channel);
  }

  // User left a voice channel (to no channel)
  else if (oldState.channel && !newState.channel) {
    if (global.timeTracking[userId]) {
      const session = global.timeTracking[userId];
      const timeSpent = Date.now() - session.startTime;

      // Send clock-out message
      await sendClockOutMessage(member, oldState.channel, timeSpent);
      
      // Send motivational DM to user
      await sendMotivationalDM(member, timeSpent);

      // Update faction time tracking (only if factions are enabled)
      if (areFactionsEnabled(member.guild)) {
        const faction = getUserFaction(member);
        if (faction && global.factionTimes[faction.key] !== undefined) {
          global.factionTimes[faction.key] += timeSpent;
          console.log(
            `📊 Added ${formatDuration(timeSpent)} to ${faction.name} faction total`,
          );
        }
      }

      // Update individual user time tracking
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
      global.userTimes[userId].todayTime += timeSpent;
      global.userTimes[userId].lastActive = Date.now();
      
      if (timeSpent > global.userTimes[userId].longestSession) {
        global.userTimes[userId].longestSession = timeSpent;
      }

      delete global.timeTracking[userId];
      console.log(
        `📊 Logged ${member.user.username}'s session in ${session.channel}: ${formatDuration(timeSpent)}`,
      );
    }
  }

  // User switched voice channels
  else if (
    oldState.channel &&
    newState.channel &&
    oldState.channel.id !== newState.channel.id
  ) {
    if (global.timeTracking[userId]) {
      const session = global.timeTracking[userId];
      const timeSpent = Date.now() - session.startTime;

      // Send channel switch message
      await sendChannelSwitchMessage(
        member,
        oldState.channel,
        newState.channel,
        timeSpent,
      );

      // Update faction time tracking for the previous session (only if factions are enabled)
      if (areFactionsEnabled(member.guild)) {
        const faction = getUserFaction(member);
        if (faction && global.factionTimes[faction.key] !== undefined) {
          global.factionTimes[faction.key] += timeSpent;
          console.log(
            `📊 Added ${formatDuration(timeSpent)} to ${faction.name} faction total`,
          );
        }
      }

      // Update individual user time tracking
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
      global.userTimes[userId].todayTime += timeSpent;
      global.userTimes[userId].lastActive = Date.now();
      
      if (timeSpent > global.userTimes[userId].longestSession) {
        global.userTimes[userId].longestSession = timeSpent;
      }

      // Start new tracking session for the new channel
      global.timeTracking[userId] = {
        startTime: Date.now(),
        channel: newState.channel.name,
        channelId: newState.channel.id,
      };

      console.log(
        `🔄 ${member.user.username} switched from ${oldState.channel.name} to ${newState.channel.name} (${formatDuration(timeSpent)})`,
      );
    } else {
      // Edge case: user wasn't being tracked but switched channels
      global.timeTracking[userId] = {
        startTime: Date.now(),
        channel: newState.channel.name,
        channelId: newState.channel.id,
      };

      console.log(
        `🕐 Started tracking ${member.user.username} in ${newState.channel.name} (channel switch)`,
      );
      await sendClockInMessage(member, newState.channel);
    }
  }
});

// New Event Listener for Message Content
client.on("messageCreate", async (message) => {
  // Ignore messages from bots to prevent an infinite loop
  if (message.author.bot) return;

  // Regular expression to detect common Discord invite links
  const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9-]{1,}/g;

  // Check if the message content contains an invite link
  if (inviteRegex.test(message.content)) {
    // A flag to ensure we only warn the user once per message
    let alreadyWarned = false;
    
    // Check if the link is to this server, if so, ignore it
    const invites = await message.guild.invites.fetch();
    const isThisServerInvite = invites.some(invite => message.content.includes(invite.code));
    
    if (isThisServerInvite) {
      // It's an invite to the same server, so do nothing.
      return;
    }

    try {
      // 1. Delete the message
      if (message.deletable) {
        await message.delete();
      }

      // 2. Warn the user via a DM
      if (!alreadyWarned) {
        await message.author.send({
          content: `⚠️ Your message was deleted in **${message.guild.name}** because it contained a Discord invite link.`,
          embeds: [{
            title: "🚫 Discord Invite Link Detected",
            description: `**Your message:**\n${message.content}`,
            color: 0xffa500,
            footer: {
              text: "Please do not share invite links to other servers."
            },
            timestamp: new Date().toISOString()
          }]
        }).catch(err => {
          console.error(`❌ Could not DM user ${message.author.tag}: ${err}`);
          // If the DM fails, you can still send the public warning
        });
        alreadyWarned = true;
      }
      
      // 3. Send a warning to the designated channel
      if (global.warnChannelId) {
        const warnChannel = message.guild.channels.cache.get(global.warnChannelId);
        if (warnChannel) {
          const warningEmbed = new EmbedBuilder()
            .setTitle("🚫 Invite Link Warning")
            .setColor(0xffa500)
            .setAuthor({
              name: message.author.tag,
              iconURL: message.author.displayAvatarURL(),
            })
            .setDescription(`**User:** ${message.author}\n**Channel:** ${message.channel}\n**Deleted Message Content:**\n\`\`\`\n${message.content.substring(0, 1020)}\n\`\`\``)
            .setTimestamp()
            .setFooter({ text: "Auto-Moderation System" });

          await warnChannel.send({ embeds: [warningEmbed] });
          console.log(`📝 Sent invite link warning for ${message.author.tag}`);
        }
      }

    } catch (error) {
      console.error("❌ Error handling invite link:", error);
    }
  }
});
// End of New Event Listener

// Express server
const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) =>
  res.json({
    status: "✅ Bot running",
    clockInChannel: global.clockInChannelId,
  }),
);
app.get("/health", (req, res) => res.json({ status: "healthy" }));
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🌐 Web server running on port ${PORT}`),
);

// Login
client.login(process.env.DISCORD_TOKEN);
