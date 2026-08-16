import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

import report from './modules/report.js';
import reportSetchannel from './modules/report_setchannel.js';

export default {
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('Felhasznalo jelentese a moderatoroknak, vagy a jelentesi csatorna beallitasa.')
        .setDMPermission(false)
        .addSubcommand(subcommand =>
            subcommand
                .setName('file')
                .setDescription('Felhasznalo jelentese a szerver moderacios csapatanak.')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('A jelenteni kivant felhasznalo.')
                        .setRequired(true),
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('A jelentes indoka (reszletesen).')
                        .setRequired(true)
                        .setMaxLength(500),
                ),
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setchannel')
                .setDescription('A jelentesi csatorna beallitasa. (Szerver kezelese jogosultsag szukseges)')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('A szoveges csatorna, amely megkapja a jelenteseket.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                ),
        ),
    category: 'Utility',

    async execute(interaction, config, client) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'file') {
            return await report.execute(interaction, config, client);
        }

        if (subcommand === 'setchannel') {
            return await reportSetchannel.execute(interaction, config, client);
        }

        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Unknown subcommand.' });
    },
};