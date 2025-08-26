const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all available bot commands"),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("🤖 Faction Bot Commands")
      .setColor(0x3498DB)
      .setDescription("Here are all the cool things I can do!")
      .addFields(
        {
          name: "🏴 Faction Management",
          value: "`/factions` - Join a faction\n`/accept` - Accept faction requests (leaders)\n`/deny` - Deny faction requests (leaders)\n`/kickfaction` - Remove someone from faction (leaders)\n`/profile` - View user's faction profile",
          inline: false
        },
        {
          name: "📊 Statistics & Info", 
          value: "`/factionstats` - Faction leaderboard\n`/leaderboard` - Most active members\n`/serverinfo` - Server statistics\n`/profile @user` - View someone's profile",
          inline: false
        },
        {
          name: "⚔️ Faction Battles",
          value: "`/battle [faction]` - Challenge another faction to battle!\nClick buttons to join your faction in the fight!",
          inline: false
        },
        {
          name: "🎲 Fun & Games",
          value: "`/dice` - Roll dice for your faction\n`/8ball [question]` - Ask the mystical 8-ball\n`/coinflip` - Flip a coin\n`/quote` - Get inspirational faction quotes",
          inline: false
        },
        {
          name: "⏱️ Time Tracking",
          value: "`/timeleaderboard` - View faction time rankings\n`/mytime` - View your personal time stats\n`/factiontime` - View your faction's time (leaders)\n`/setclockchannel` - Set time tracking channel (admin)\n`/resettimes` - Reset all faction times (admin)",
          inline: false
        },
        {
          name: "🏆 Achievements & Points",
          value: "`/achievements` - View your achievements\n`/factionpoints` - See faction point standings\n`/top [category]` - Top performers leaderboard\n`/missions view` - View faction missions\n`/missions create` - Create missions (leaders)",
          inline: false
        },
        {
          name: "👮 Moderation",
          value: "`/warn @user [reason]` - Issue warning (leaders)\n`/warnings @user` - View user warnings\n`/announce [message]` - Faction announcements (leaders)",
          inline: false
        },
        {
          name: "📌 Sticky Messages",
          value: "`/stick [message]` - Create sticky message (admins)\n`/unstick` - Remove sticky message (admins)\n`/botadmin add/remove/list` - Manage bot admins",
          inline: false
        },
        {
          name: "⚙️ Admin Commands", 
          value: "`/instructions` - Post faction join instructions\n`/leaderinstructions` - Post leader instructions\n`/setchannel` - Set notification channel\n`/setinstructionschannel` - Set instructions channel\n`/setleaderschannel` - Set leader channel",
          inline: false
        }
      )
      .setFooter({ text: "Use /[command] to try any of these!" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};