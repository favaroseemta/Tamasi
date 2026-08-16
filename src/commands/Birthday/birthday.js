import { SlashCommandBuilder, MessageFlags, ChannelType } from 'discord.js';
import { createEmbed, successEmbed } from '../../utils/embeds.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

import birthdaySet from './modules/birthday_set.js';
import birthdayInfo from './modules/birthday_info.js';
import birthdayList from './modules/birthday_list.js';
import birthdayRemove from './modules/birthday_remove.js';
import nextBirthdays from './modules/next_birthdays.js';
import birthdaySetchannel from './modules/birthday_setchannel.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
        .setName('birthday')
        .setDescription('Szuletesnapi rendszer parancsai')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Szuletesnapod beallitasa')
                .addIntegerOption(option =>
                    option
                        .setName('month')
                        .setDescription('Szuletesi honap (1-12)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(12)
                )
                .addIntegerOption(option =>
                    option
                        .setName('day')
                        .setDescription('Szuletesi nap (1-31)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(31)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Szuletesnapi informaciok megtekintese')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('A felhasznalo akinek a szuletesnapjat ellenorizni akarod')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Szerver szuletesnapjainak listazasa')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Szuletesnapod eltavolitasa')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('next')
                .setDescription('Kovetkezo szuletesnapok megjelenitese')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setchannel')
                .setDescription('Szuletesnapi bejelentesek csatornjanak beallitasa (Szerver kezelese joga szukseges)')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Szoveges csatorna a bejelentesekhez. Hagyja uresen a kikapcsolashoz.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
        ),

    async execute(interaction, config, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'set':
                return await birthdaySet.execute(interaction, config, client);
            case 'info':
                return await birthdayInfo.execute(interaction, config, client);
            case 'list':
                return await birthdayList.execute(interaction, config, client);
            case 'remove':
                return await birthdayRemove.execute(interaction, config, client);
            case 'next':
                return await nextBirthdays.execute(interaction, config, client);
            case 'setchannel':
                return await birthdaySetchannel.execute(interaction, config, client);
            default:
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Unknown subcommand' });
        }
    }
};