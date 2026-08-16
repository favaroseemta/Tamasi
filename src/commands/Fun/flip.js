import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
    .setName("flip")
    .setDescription("Feldob egy ermet (Fej vagy Iras)."),
  category: 'Fun',

  async execute(interaction, config, client) {
    const result = Math.random() < 0.5 ? "Fej" : "Iras";
    const emoji = result === "Fej" ? "🪙" : "🔮";

    const embed = successEmbed(
      "Fej vagy Iras?",
      `A bot feldobta az ermet, az eredmeny: **${result}** ${emoji}!`,
    );

    await InteractionHelper.safeReply(interaction, { embeds: [embed] });
    logger.debug(`Flip command executed by user ${interaction.user.id} in guild ${interaction.guildId}`);
  },
};