import { PermissionsBitField } from 'discord.js';
import { successEmbed } from '../../../utils/embeds.js';
import { setLogChannel } from '../../../services/loggingService.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { logger } from '../../../utils/logger.js';

import { replyUserError, ErrorTypes } from '../../../utils/errorHandler.js';
export default {
    async execute(interaction, config, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'A jelentesi csatorna beallitasahoz **Szerver kezelese** jogosultsag szukseges.' });
        }

        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guildId;

        try {
            await setLogChannel(client, guildId, 'reports', channel.id);

            return InteractionHelper.safeReply(interaction, {
                embeds: [successEmbed(
                    'Jelentesi Csatorna Beallitva',
                    `Minden uj jelentes ezentul a(z) ${channel} csatornaba erkezik.\nEzt a \`/logging dashboard\` parancsbol is kezelheted.`,
                )],
                ephemeral: true,
            });
        } catch (error) {
            logger.error('report_setchannel error:', error);
            return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Nem sikerult menteni a csatorna beallitasat.' });
        }
    },
};
