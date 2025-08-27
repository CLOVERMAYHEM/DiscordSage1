// Load environment variables from .env
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

// Load commands safely
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command.data?.name) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`⚠️ Skipping command file: ${file} (missing data.name)`);
  }
}

// Faction leader mapping
const factionLeaders = {
  "Laughing_Meeks": "1406779732275499098",
  "Unicorn_Rapists": "1406779912441823303",
  "Special_Activities_Directive": "1409081159811334204",
};

// Global tracking objects
if (!global.timeTracking) global.timeTracking = {};
if (!global.factionTimes) global.factionTimes = {
  "Laughing_Meeks": 0,
  "Unicorn_Rapists": 0,
  "Special_Activities_Directive": 0
};
if (!global.clockInChannelId) global.clockInChannelId = null;

// Client ready
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Register slash commands
  const commands = [];
  for (const [name, command] of client.commands) {
    commands.push(command.data.toJSON());
  }
  try {
    await client.application.commands.set(commands);
    console.log("✅ Slash commands registered!");
  } catch (err) {
    console.error("❌ Error registering commands:", err);
  }

  startDailyLeaderboard();

  // Sticky messages (if stick.js exists)
  try {
    const stickyModule = require('./commands/stick.js');
    setInterval(() => stickyModule.checkStickyMessages(client), 30000);
    console.log("📌 Sticky message monitoring started");
  } catch {
    console.log("ℹ️ No stick.js module found.");
  }
});

// Daily leaderboard
function startDailyLeaderboard() {
  const scheduleDaily = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(12,0,0,0);
    const msUntilTomorrow = tomorrow - now;

    setTimeout(() => {
      sendDailyLeaderboard();
      setInterval(sendDailyLeaderboard, 24*60*60*1000);
    }, msUntilTomorrow);
  }
  scheduleDaily();
  console.log("📅 Daily leaderboard scheduled for 12:00 PM UTC");
}

async function sendDailyLeaderboard() {
  if (!global.clockInChannelId) return;
  const guild = client.guilds.cache.first();
  if (!guild) return;
  const channel = guild.channels.cache.get(global.clockInChannelId);
  if (!channel) return;

  const factionData = [];
  for (const [factionKey, totalTime] of Object.entries(global.factionTimes)) {
    const factionDisplayName = factionKey.replace("_"," ");
    const role = guild.roles.cache.find(r => r.name === factionDisplayName);
    const memberCount = role ? role.members.size : 0;
    const hours = Math.floor(totalTime/3600000);
    const minutes = Math.floor((totalTime%3600000)/60000);
    factionData.push({ name: factionDisplayName, totalTime, timeString: `${hours}h ${minutes}m`, memberCount });
  }

  factionData.sort((a,b)=>b.totalTime - a.totalTime);

  let text = "**📊 Daily Faction Time Rankings**\n\n";
  factionData.forEach((faction, i)=>{
    const medals = ["🥇","🥈","🥉"];
    const medal = medals[i] || "🏅";
    text += `${medal} **${faction.name}**\n⏱️ ${faction.timeString} | 👥 ${faction.memberCount} members\n\n`;
  });

  const totalTime = factionData.reduce((sum,f)=>sum+f.totalTime,0);
  const totalHours = Math.floor(totalTime/3600000);
  const totalMinutes = Math.floor((totalTime%3600000)/60000);

  text += `📈 **Combined Faction Time**: ${totalHours}h ${totalMinutes}m\n`;
  text += `🏆 **Today's Champion**: ${factionData[0]?.name || "None"}\n\n`;
  text += "*Use `/timeleaderboard` anytime to see current standings*";

  await channel.send({
    embeds: [{
      color:0xFFD700,
      title:"🎯 Daily Faction Voice Time Report",
      description:text,
      timestamp:new Date(),
      footer:{text:"Keep up the great work, faction warriors!"}
    }]
  });
}

// Interaction handler
client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try { await command.execute(interaction); }
    catch(err){
      console.error(err);
      if(!interaction.replied && !interaction.deferred){
        await interaction.reply({content:"❌ Error running command.", ephemeral:true});
      }
    }
  }

  // Add your button/select handling here (battle, reset, faction_select)
});

// Voice tracking
client.on("voiceStateUpdate", (oldState,newState)=>{
  const member = newState.member;
  const userId = member.id;

  // Leaving channel
  if(oldState.channel && !newState.channel && global.timeTracking[userId]){
    const session = global.timeTracking[userId];
    const timeSpent = Date.now()-session.startTime;

    // Determine faction
    let userFaction=null;
    const factions=["Laughing Meeks","Unicorn Rapists","Special Activities Directive"];
    for(const f of factions){
      const role=member.guild.roles.cache.find(r=>r.name===f);
      if(role && member.roles.cache.has(role.id)){
        userFaction=f.replace(" ","_");
        break;
      }
    }

    if(userFaction && global.factionTimes[userFaction]!==undefined)
      global.factionTimes[userFaction]+=timeSpent;

    delete global.timeTracking[userId];
  }

  // Joining channel
  if(!oldState.channel && newState.channel){
    global.timeTracking[userId]={startTime:Date.now(), channel:newState.channel.name, channelId:newState.channel.id};
  }

  // Switching channels (leave old, join new)
  if(oldState.channel && newState.channel && oldState.channel.id!==newState.channel.id && global.timeTracking[userId]){
    const session = global.timeTracking[userId];
    const timeSpent = Date.now()-session.startTime;
    let userFaction=null;
    const factions=["Laughing Meeks","Unicorn Rapists","Special Activities Directive"];
    for(const f of factions){
      const role=member.guild.roles.cache.find(r=>r.name===f);
      if(role && member.roles.cache.has(role.id)){
        userFaction=f.replace(" ","_");
        break;
      }
    }
    if(userFaction && global.factionTimes[userFaction]!==undefined)
      global.factionTimes[userFaction]+=timeSpent;

    global.timeTracking[userId]={startTime:Date.now(), channel:newState.channel.name, channelId:newState.channel.id};
  }
});

// Express uptime server
const app = express();
const PORT = process.env.PORT || 5000;
app.get("/", (req,res)=>res.json({status:"✅ Bot running", uptime:process.uptime()}));
app.listen(PORT,"0.0.0.0",()=>console.log(`🌐 Web server running on port ${PORT}`));

// Log in using token from .env
if(!process.env.DISCORD_TOKEN) console.error("❌ DISCORD_TOKEN not set in .env");
client.login(process.env.DISCORD_TOKEN).catch(err=>console.error("❌ Failed to login:",err));
