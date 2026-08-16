import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed, errorEmbed, warningEmbed } from '../../utils/embeds.js';
import { getConfirmationButtons } from '../../utils/components.js';
import { logger } from '../../utils/logger.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    slashOnly: true,
    data: new SlashCommandBuilder()
        .setName('wipedata')
        .setDescription('Minden szemelyes adatod torlese a botbol (visszavonhatatlan)'),

    async execute(interaction, guildConfig, client) {
        const warningMessage = 
            `⚠️ **EZ A MUVELET VISSZAVONHATATLAN!** ⚠️\n\n` +
            `Ez veglegesen torli **MINDEN** adatodat errol a szerverrol, beleertve:\n` +
            `• 💰 Egyenleg (tarca es bank)\n` +
            `• 📊 Szintek es XP\n` +
            `• 🎒 Leltar targyak\n` +
            `• 🛍️ Bolt vasarlasok\n` +
            `• 🎂 Szuletesnapi adatok\n` +
            `• 🔢 Szamlalo adatok\n` +
            `• 📋 Minden egyeb szemelyes adat\n\n` +
            `**Ez nem vonhato vissza. Teljesen biztos vagy benne?**`;

        const embed = warningEmbed('Minden Adat Torlese', warningMessage);

        const confirmButtons = getConfirmationButtons('wipedata');

        await InteractionHelper.safeReply(interaction, {
            embeds: [embed],
            components: [confirmButtons],
            flags: MessageFlags.Ephemeral
        });

        logger.info(`Wipedata command executed - confirmation prompt shown`, {
            userId: interaction.user.id,
            guildId: interaction.guildId
        });
    }
};