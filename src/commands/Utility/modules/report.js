import { createEmbed } from '../../../utils/embeds.js';
import { getGuildConfig } from '../../../services/config/guildConfig.js';
import { logEvent, EVENT_TYPES, resolveLogChannel } from '../../../services/loggingService.js';
import { formatLogLine, resolveUserAuthor } from '../../../utils/logging/logEmbeds.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../../utils/errorHandler.js';
import { logger } from '../../../utils/logger.js';

export default {
    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, { ephemeral: true });
        if (!deferSuccess) {
            logger.warn('Report interaction defer failed', { userId: interaction.user.id, guildId: interaction.guildId });
            return;
        }

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');
        const guildId = interaction.guildId;

        const guildConfig = await getGuildConfig(client, guildId);
        const reportChannelId = resolveLogChannel(guildConfig, 'reports');

        if (!reportChannelId) {
            return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'A jelentesi csatorna meg nincs beallitva. Kerj meg egy moderatort a `/logging dashboard` vagy `/logging channel` parancs hasznalatara.' });
        }

        const ownerMention = interaction.guild.ownerId
            ? `<@${interaction.guild.ownerId}> Uj jelentes!`
            : 'Uj jelentes!';

        await logEvent({
            client,
            guildId,
            eventType: EVENT_TYPES.REPORT_FILE,
            content: ownerMention,
            data: {
                title: 'Felhasznaloi Jelentes',
                lines: [
                    formatLogLine('Jelentett Felhasznalo', `${targetUser.tag} (\`${targetUser.id}\`)`),
                    formatLogLine('Jelentette', `${interaction.user.tag} (\`${interaction.user.id}\`)`),
                    formatLogLine('Csatorna', interaction.channel.toString()),
                ],
                blockFields: [{ name: 'Indok', value: reason }],
                author: await resolveUserAuthor(client, targetUser.id),
                thumbnail: targetUser.displayAvatarURL(),
            },
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [createEmbed({
                title: 'Jelentes Elkuldve',
                description: `A(z) **${targetUser.tag}** elleni jelentesed sikeresen elkuldve es tovabbitva a moderacios csapatnak. Koszonjuk!`,
            })],
        });

        logger.info('Report submitted', {
            userId: interaction.user.id,
            reportedUserId: targetUser.id,
            guildId,
            reasonLength: reason.length,
        });
    },
};
