import { SlashCommandBuilder } from 'discord.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

import searchDefine from './modules/search_define.js';
import searchGoogle from './modules/search_google.js';
import searchUrban from './modules/search_urban.js';

export default {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Kereses a weben es szotarakban')
        .addSubcommand(subcommand =>
            subcommand
                .setName('define')
                .setDescription('Szo jelentesenek keresese')
                .addStringOption(option =>
                    option.setName('word')
                        .setDescription('A keresendo szo')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('google')
                .setDescription('Kereses a Google-on')
                .addStringOption(option =>
                    option.setName('query')
                        .setDescription('Mit szeretnel keresni?')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('urban')
                .setDescription('Kereses az Urban Dictionary szotarban')
                .addStringOption(option =>
                    option.setName('term')
                        .setDescription('A keresendo kifejezes az Urban Dictionary-ben')
                        .setRequired(true))
        ),

    async execute(interaction, config, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'define':
                return await searchDefine.execute(interaction, config, client);
            case 'google':
                return await searchGoogle.execute(interaction, config, client);
            case 'urban':
                return await searchUrban.execute(interaction, config, client);
            default:
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Unknown subcommand' });
        }
    }
};
