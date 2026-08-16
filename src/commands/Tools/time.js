import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
        .setName('time')
        .setDescription('Jelenlegi ido lekerese kulonbozo idozonakban')
        .addStringOption(option =>
            option.setName('timezone')
                .setDescription('A megjelenitendo idozona (pl. UTC, Europe/Budapest)')
                .setRequired(false)),

    async execute(interaction) {
        await InteractionHelper.safeExecute(
            interaction,
            async () => {
                const timezone = interaction.options.getString('timezone') || 'UTC';

                let timeString;
                try {
                    timeString = new Date().toLocaleString('en-US', {
                        timeZone: timezone,
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        timeZoneName: 'short'
                    });
                } catch (error) {
                    logger.warn(`Invalid timezone requested: ${timezone}`);
                    await replyUserError(interaction, {
                        type: ErrorTypes.VALIDATION,
                        message: 'Ervenytelen idozona. Kerlek ervenyes idozona azonositot hasznalj (pl. UTC, Europe/Budapest, America/New_York)',
                    });
                    return;
                }

                const now = new Date();
                const unixTimestamp = Math.floor(now.getTime() / 1000);

                const embed = successEmbed(
                    '🕒 Jelenlegi Ido',
                    `**${timezone}:** ${timeString}\n` +
                    `**Unix Idobelyeg:** \`${unixTimestamp}\`\n` +
                    `**ISO Karakterlanc:** \`${now.toISOString()}\``
                );

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
            },
            'Nem sikerult lekerni a jelenlegi idot. Kerlek probald ujra.',
            {
                autoDefer: true,
                deferOptions: { flags: MessageFlags.Ephemeral }
            }
        );
    },
};