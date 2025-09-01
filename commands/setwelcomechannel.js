const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setwelcomechannel")
    .setDescription("Set the channel where welcome messages are sent")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel to send welcome messages to")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText) // ✅ fixed (no trailing comma)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");

    // Validate channel exists and is accessible
    if (!channel) {
      return interaction.reply({
        content: "❌ Invalid channel provided!",
        ephemeral: true,
      });
    }

    // Check if the channel is from the same guild
    if (channel.guild.id !== interaction.guild.id) {
      return interaction.reply({
        content: "❌ Channel must be from this server!",
        ephemeral: true,
      });
    }

    // Check if it's a text channel
    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply({
        content: "❌ Please select a text channel!",
        ephemeral: true,
      });
    }

    // Check if bot has permissions to send messages in the channel
    const botMember = interaction.guild.members.cache.get(
      interaction.client.user.id,
    );
    const permissions = channel.permissionsFor(botMember);

    if (
      !permissions.has([
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ViewChannel,
      ])
    ) {
      return interaction.reply({
        content: "❌ I don't have permission to send messages in that channel!",
        ephemeral: true,
      });
    }

    // Initialize guild settings if not exists
    const guildId = interaction.guild.id;
    if (!global.guildSettings) global.guildSettings = {};
    if (!global.guildSettings[guildId]) {
      global.guildSettings[guildId] = {
        factionsEnabled: true,
        clockInChannelId: null,
        notificationChannelId: null,
        welcomeChannelId: null,
      };
    }

    // Store the welcome channel ID for this guild
    global.guildSettings[guildId].welcomeChannelId = channel.id;

    console.log(
      `✅ Welcome channel set for guild ${guildId}: ${channel.name} (${channel.id})`,
    );

    await interaction.reply({
      content: `✅ Welcome messages will now be sent to ${channel}!`,
      ephemeral: true,
    });
  },
};
