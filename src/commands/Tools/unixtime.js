import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { getColor } from '../../config/bot.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
        .setName('unixtime')
        .setDescription('Jelenlegi Unix idobelyeg lekerese'),

    async execute(interaction) {
        await InteractionHelper.safeExecute(
            interaction,
            async () => {
                const now = new Date();
                const unixTimestamp = Math.floor(now.getTime() / 1000);

                const embed = successEmbed(
                    '⏱️ Jelenlegi Unix Idobelyeg',
                    `**Masodpercek a Unix Epoch ota:** \`${unixTimestamp}\`\n` +
                    `**Milimasodpercek a Unix Epoch ota:** \`${now.getTime()}\`\n\n` +
                    `**Emberi formatum (UTC):** ${now.toUTCString()}\n` +
                    `**ISO Karakterlanc:** ${now.toISOString()}`
                );
                embed.setColor(getColor('success'));

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [embed],
                });
            },
            'Nem sikerult lekerni a unix idobelyeget. Kerlek probald ujra.',
            {
                autoDefer: true,
                deferOptions: { flags: MessageFlags.Ephemeral }
            }
        );
    },
};