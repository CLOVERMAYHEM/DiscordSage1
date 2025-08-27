// index.js
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

client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (!command.data || !command.data.name) {
    console.log(`⚠️ Skipping command file: ${file} (missing data.name)`);
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

// Time tracking storage
if (!global.timeTracking) global.timeTracking = {};
if (!global.factionTimes) global.factionTimes = {
  "Laughing_Meeks": 0,
  "Unicorn_Rapists": 0,
  "Special_Activities_Directive": 0
};
if (!global.clockInChannelId) global.clockInChannelId = null;

// ---------------------- READY EVENT ----------------------
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
});

// ---------------------- INTERACTION HANDLER ----------------------
client.on("interactionCreate", async interaction => {
  // Slash commands
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

  // Faction select menu
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

  // You can add other interactions (buttons) here like battle buttons / reset buttons
});

// ---------------------- VOICE STATE TRACKING ----------------------
client.on("voiceStateUpdate", async (oldState, newState) => {
  const member = newState.member;
  const userId = member.id;

  // Joined a voice channel
  if (!oldState.channel && newState.channel) {
    global.timeTracking[userId] = { startTime: Date.now(), channel: newState.channel.name, channelId: newState.channel.id };
    console.log(`🕐 Started tracking ${member.user.username} in ${newState.channel.name}`);
  }

  // Left a voice channel
  if (oldState.channel && !newState.channel && global.timeTracking[userId]) {
    const sessionData = global.timeTracking[userId];
    const timeSpent = Date.now() - sessionData.startTime;

    // Determine user's faction
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

    // Send clock-out message
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

        await clockInChannel.send({ embeds: [embed] });
      }
    }

    delete global.timeTracking[userId];
  }

  // Switching channels
  if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id && global.timeTracking[userId]) {
    const sessionData = global.timeTracking[userId];
    const timeSpent = Date.now() - sessionData.startTime;

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

    // Start new tracking
    global.timeTracking[userId] = { startTime: Date.now(), channel: newState.channel.name, channelId: newState.channel.id };
    console.log(`🔄 Switched tracking ${member.user.username} to ${newState.channel.name}`);
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// ---------------------- ERROR HANDLING ----------------------
client.on('error', console.error);
client.on('warn', console.warn);
process.on('unhandledRejection', (reason, promise) => console.error('Unhandled Rejection:', reason));

// ---------------------- LOGIN ----------------------
client.login(process.env.DISCORD_TOKEN);
