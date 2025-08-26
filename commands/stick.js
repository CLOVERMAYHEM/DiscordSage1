const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

// Store sticky messages
if (!global.stickyMessages) global.stickyMessages = {};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stick")
    .setDescription("Create a sticky message that stays visible in the channel")
    .addStringOption(option =>
      option.setName("message")
        .setDescription("The message to stick")
        .setRequired(true))
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("Channel to stick the message in (default: current)")
        .setRequired(false))
    .addStringOption(option =>
      option.setName("style")
        .setDescription("Message style")
        .setRequired(false)
        .addChoices(
          { name: "🎯 Info", value: "info" },
          { name: "⚠️ Warning", value: "warning" },
          { name: "🚨 Important", value: "important" },
          { name: "📢 Announcement", value: "announcement" },
          { name: "🎉 Event", value: "event" }
        )),
  async execute(interaction) {
    const message = interaction.options.getString("message");
    const targetChannel = interaction.options.getChannel("channel") || interaction.channel;
    const style = interaction.options.getString("style") || "info";
    
    // Check if user is bot admin
    if (!await isUserBotAdmin(interaction.member)) {
      return interaction.reply({ 
        content: "❌ Only bot administrators can use sticky messages!", 
        ephemeral: true 
      });
    }
    
    // Check if it's a text channel
    if (targetChannel.type !== 0) {
      return interaction.reply({ 
        content: "❌ Sticky messages can only be used in text channels!", 
        ephemeral: true 
      });
    }
    
    // Style configurations
    const styles = {
      info: { color: 0x3498DB, emoji: "🎯", title: "Information" },
      warning: { color: 0xF39C12, emoji: "⚠️", title: "Warning" },
      important: { color: 0xE74C3C, emoji: "🚨", title: "Important Notice" },
      announcement: { color: 0x9B59B6, emoji: "📢", title: "Announcement" },
      event: { color: 0x2ECC71, emoji: "🎉", title: "Event" }
    };
    
    const styleConfig = styles[style];
    
    const embed = new EmbedBuilder()
      .setTitle(`${styleConfig.emoji} ${styleConfig.title}`)
      .setDescription(message)
      .setColor(styleConfig.color)
      .addFields({
        name: "📌 Sticky Message",
        value: "This message will automatically reappear when it scrolls out of view.",
        inline: false
      })
      .setFooter({ 
        text: `Sticky message by ${interaction.user.username} • This message will stay visible`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();
    
    try {
      // Delete old sticky message if exists
      if (global.stickyMessages[targetChannel.id]) {
        try {
          const oldMessage = await targetChannel.messages.fetch(global.stickyMessages[targetChannel.id].messageId);
          await oldMessage.delete();
        } catch (error) {
          // Old message already deleted or doesn't exist
        }
      }
      
      // Send new sticky message
      const sentMessage = await targetChannel.send({ embeds: [embed] });
      
      // Store sticky message info
      global.stickyMessages[targetChannel.id] = {
        messageId: sentMessage.id,
        content: message,
        style: style,
        author: interaction.user.id,
        createdAt: Date.now(),
        lastReposted: Date.now()
      };
      
      await interaction.reply({ 
        content: `✅ Sticky message created in ${targetChannel}! It will automatically repost when it scrolls out of view.`,
        ephemeral: true 
      });
      
    } catch (error) {
      console.error("Error creating sticky message:", error);
      await interaction.reply({ 
        content: "❌ Failed to create sticky message. Check bot permissions!", 
        ephemeral: true 
      });
    }
  },
};

// Function to check if sticky message needs reposting
async function checkStickyMessages(client) {
  for (const [channelId, stickyData] of Object.entries(global.stickyMessages)) {
    try {
      const channel = client.channels.cache.get(channelId);
      if (!channel) continue;
      
      // Get recent messages
      const messages = await channel.messages.fetch({ limit: 10 });
      const stickyMessage = messages.get(stickyData.messageId);
      
      // If sticky message is not in recent 10 messages, repost it
      if (!stickyMessage) {
        await repostStickyMessage(channel, channelId, stickyData);
      }
    } catch (error) {
      console.error(`Error checking sticky message in ${channelId}:`, error);
    }
  }
}

async function repostStickyMessage(channel, channelId, stickyData) {
  const styles = {
    info: { color: 0x3498DB, emoji: "🎯", title: "Information" },
    warning: { color: 0xF39C12, emoji: "⚠️", title: "Warning" },
    important: { color: 0xE74C3C, emoji: "🚨", title: "Important Notice" },
    announcement: { color: 0x9B59B6, emoji: "📢", title: "Announcement" },
    event: { color: 0x2ECC71, emoji: "🎉", title: "Event" }
  };
  
  const styleConfig = styles[stickyData.style];
  const user = await channel.client.users.fetch(stickyData.author);
  
  const embed = new EmbedBuilder()
    .setTitle(`${styleConfig.emoji} ${styleConfig.title}`)
    .setDescription(stickyData.content)
    .setColor(styleConfig.color)
    .addFields({
      name: "📌 Sticky Message",
      value: "This message will automatically reappear when it scrolls out of view.",
      inline: false
    })
    .setFooter({ 
      text: `Sticky message by ${user.username} • Reposted automatically`,
      iconURL: user.displayAvatarURL()
    })
    .setTimestamp();
  
  const newMessage = await channel.send({ embeds: [embed] });
  
  // Update stored message ID
  global.stickyMessages[channelId].messageId = newMessage.id;
  global.stickyMessages[channelId].lastReposted = Date.now();
}

// Check bot admin status
async function isUserBotAdmin(member) {
  if (!global.botAdmins) global.botAdmins = [];
  
  // Server owner is always bot admin
  if (member.guild.ownerId === member.id) return true;
  
  // Check if user has Administrator permission
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  
  // Check custom bot admin list
  return global.botAdmins.includes(member.id);
}

// Export functions for use in main bot file
module.exports.checkStickyMessages = checkStickyMessages;
module.exports.isUserBotAdmin = isUserBotAdmin;