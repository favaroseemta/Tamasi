import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { getColor } from '../../config/bot.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName("shorten")
        .setDescription("URL rovidites is.gd segitsegevel")
        .addStringOption(option =>
            option
                .setName("url")
                .setDescription("A roviditendo URL")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("custom")
                .setDescription("Egyedi URL vegzodes (opcionalis)")
                .setRequired(false)
        )
        .setDMPermission(false),
    category: "Tools",

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral
        });
        if (!deferSuccess) {
            logger.warn(`Shorten interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'shorten'
            });
            return;
        }

        const url = interaction.options.getString("url");
        const custom = interaction.options.getString("custom");

        try {
            new URL(url);
        } catch (e) {
            return replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: 'Ervenytelen URL formatum. Tartalmaznia kell a http:// vagy https:// elotagokat.',
            });
        }

        if (custom && !/^[a-zA-Z0-9_-]+$/.test(custom)) {
            return replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: 'Az egyedi URL csak betuket, szamokat, alulvonasokat es kotojeleket tartalmazhat.',
            });
        }

        let apiUrl = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`;
        if (custom) {
            apiUrl += `&shorturl=${encodeURIComponent(custom)}`;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        let response;
        try {
            response = await fetch(apiUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'TitanBot URL Shortener/1.0'
                }
            });
        } catch (networkError) {
            const message = networkError?.name === 'AbortError'
                ? 'A linkrovidito idotullepest erte el. Kerlek probald ujra egy pillanat mulva.'
                : 'Jelenleg nem erheto el a linkrovidito szolgaltatas. Kerlek probald ujra kesobb.';
            return replyUserError(interaction, {
                type: ErrorTypes.NETWORK,
                message,
            });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            return replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: `A linkrovidito szolgaltatas HTTP ${response.status} hibat kuldott. Kerlek probald ujra kesobb.`,
            });
        }

        const shortUrl = await response.text();

        try {
            new URL(shortUrl);
        } catch (e) {
            if (shortUrl.includes("already exists")) {
                return replyUserError(interaction, {
                    type: ErrorTypes.VALIDATION,
                    message: 'Ez az egyedi URL mar foglalt. Probalj egy masikat.',
                });
            } else if (shortUrl.includes("invalid")) {
                return replyUserError(interaction, {
                    type: ErrorTypes.VALIDATION,
                    message: 'Ervenytelen URL. Tartalmaznia kell a http:// vagy https:// elotagokat.',
                });
            }
            return replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: `URL rovidites sikertelen: ${shortUrl}`,
            });
        }

        const embed = successEmbed('URL Leroviditve', `Ime a leroviditett URL: ${shortUrl}`);
        embed.setColor(getColor('success'));
        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed],
        });
    },
};