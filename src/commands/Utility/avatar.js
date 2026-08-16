import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Felhasznalo avatarkepenek megjelenitese")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription(
          "A felhasznalo, akinek az avatarat meg szeretned tekinteni (alapertelmezett: te)",
        ),
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("target") || interaction.user;
    const avatarUrl = user.displayAvatarURL({ size: 2048, dynamic: true });

    const embed = createEmbed({ 
      title: `${user.username} avatara`, 
      description: `[Letoltesi link](${avatarUrl})` 
    })
      .setImage(avatarUrl);

    await InteractionHelper.safeReply(interaction, { embeds: [embed] });
    logger.info(`Avatar command executed`, {
      userId: interaction.user.id,
      targetUserId: user.id,
      guildId: interaction.guildId
    });
  }
};