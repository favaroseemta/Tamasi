import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } from 'discord.js';
import { getWelcomeConfig, updateWelcomeConfig } from '../../utils/database.js';
import { formatWelcomeMessage, truncateForEmbedField } from '../../utils/welcome.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ErrorTypes, replyUserError } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('goodbye')
        .setDescription('A bucsuzo uzenet rendszer konfiguralasa')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('A bucsuzo uzenet beallitasa')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('A csatorna, ahova a bucsuzo uzenetek erkeznek')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Bucsuzo uzenet. Valtozok: {user}, {username}, {server}, {memberCount}')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('image')
                        .setDescription('A bucsuzo uzenetben megjelenitendo kep URL-je')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('ping')
                        .setDescription('Meg legyen-e emlitve a felhasznalo a bucsuzo uzenetben')
                        .setRequired(false))),

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Goodbye interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'goodbye'
            });
            return;
        }

        const { options, guild, client } = interaction;

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'A `/goodbye` parancs hasznalatahoz **Szerver kezelese** jogosultsag szukseges.' });
        }

        const subcommand = options.getSubcommand();

        if (subcommand === 'setup') {
            const channel = options.getChannel('channel');
            const message = options.getString('message');
            const image = options.getString('image');
            const ping = options.getBoolean('ping') ?? false;

            const existingConfig = await getWelcomeConfig(client, guild.id);
            if (existingConfig?.goodbyeChannelId) {
                logger.info(`[Goodbye] Setup blocked because config already exists in channel ${existingConfig.goodbyeChannelId} for guild ${guild.id}`);
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: `A bucsuzas mar be van allitva a(z) <#${existingConfig.goodbyeChannelId}> csatornaban. Hasznald a **/greet dashboard** parancsot a beallitasok testreszabasahoz.` });
            }

            if (!message || message.trim().length === 0) {
                logger.warn(`[Goodbye] Empty message provided by ${interaction.user.tag} in ${guild.name}`);
                return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'A bucsuzo uzenet nem lehet ures' });
            }

            if (image) {
                try {
                    new URL(image);
                } catch (e) {
                    logger.warn(`[Goodbye] Invalid image URL provided by ${interaction.user.tag}: ${image}`);
                    return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'Kerlek adj meg egy ervenyes kep URL-t (http:// vagy https:// szoveggel kell kezdodnie)' });
                }
            }

            try {
                await updateWelcomeConfig(client, guild.id, {
                    goodbyeEnabled: true,
                    goodbyeChannelId: channel.id,
                    leaveMessage: message,
                    goodbyePing: ping,
                    leaveEmbed: {
                        title: "Viszontlatasra {user.tag}",
                        description: message,
                        color: getColor('error'),
                        footer: `Bucsu a(z) ${guild.name} szerverrol!`,
                        ...(image && { image: { url: image } })
                    }
                });

                logger.info(`[Goodbye] Setup configured by ${interaction.user.tag} for guild ${guild.name} (${guild.id})`);

                const previewMessage = formatWelcomeMessage(message, {
                    user: interaction.user,
                    guild
                });

                const embed = new EmbedBuilder()
                    .setColor(getColor('success'))
                    .setTitle('Bucsuzo Rendszer Beallitva')
                    .setDescription(`A bucsuzo uzenetek ezentul a(z) ${channel} csatornaba erkeznek`)
                    .addFields(
                        { name: 'Uzenet elonezet', value: truncateForEmbedField(previewMessage) },
                        { name: 'Felhasznalo megemlitese', value: ping ? 'Igen' : 'Nem' },
                        { name: 'Statusz', value: 'Engedelyezve' }
                    )
                    .setFooter({ text: 'Tipp: Hasznald a /greet dashboard parancsot a bucsuzasi beallitasok testreszabasahoz' });

                if (image) {
                    embed.setImage(image);
                }

                await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
            } catch (error) {
                logger.error(`[Goodbye] Failed to setup goodbye system for guild ${guild.id}:`, error);
                await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Hiba tortent a bucsuzo rendszer konfiguralasa kozben. Kerlek probald ujra.' });
            }
        }
    },
};