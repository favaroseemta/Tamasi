import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } from 'discord.js';
import { getWelcomeConfig, updateWelcomeConfig } from '../../utils/database.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getGuildConfig } from '../../services/config/guildConfig.js';
import { ErrorTypes, replyUserError } from '../../utils/errorHandler.js';

function createAutoroleInfoEmbed(description) {
    return new EmbedBuilder()
        .setColor(getColor('primary'))
        .setDescription(description)
        .setFooter({ text: new Date().toLocaleString() });
}

export default {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Az uj tagoknak automatikusan kiosztott rangok kezelese')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Rang hozzaadasa az automatikusan kiosztando rangokhoz')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('A hozzaadando rang')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Rang eltavolitasa az automatikus kiosztasbol')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Az eltavolitando rang')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Minden automatikusan kiosztott rang listazasa')),

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Autorole interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'autorole'
            });
            return;
        }

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'Az `/autorole` parancs hasznalatahoz **Szerver kezelese** jogosultsag szukseges.' });
        }

    const { options, guild, client } = interaction;
        const subcommand = options.getSubcommand();

        if (subcommand === 'add') {
            const role = options.getRole('role');

            const guildConfig = await getGuildConfig(client, guild.id);
            const verificationEnabled = Boolean(guildConfig.verification?.enabled);
            const autoVerifyEnabled = Boolean(guildConfig.verification?.autoVerify?.enabled);

            if (verificationEnabled || autoVerifyEnabled) {
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Nem adhatsz hozza AutoRole-t, amig az igazolasi rendszer vagy az AutoVerify be van kapcsolva. Eloszor kapcsold ki azokat.' });
            }
            
            if (role.position >= guild.members.me.roles.highest.position) {
                logger.warn(`[Autorole] User ${interaction.user.tag} tried to add role ${role.name} (${role.id}) higher than bot's highest role in ${guild.name}`);
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Nem tudok olyan rangot kiosztani, amely magasabban van a legmagasabb rangomnal.' });
            }

            try {
                const config = await getWelcomeConfig(client, guild.id);
                const existingRoles = config.roleIds || [];
                const currentRoleId = existingRoles[0] || null;

                if (currentRoleId === role.id) {
                    logger.info(`[Autorole] User ${interaction.user.tag} tried to add duplicate role ${role.name} (${role.id}) in ${guild.name}`);
                    return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: `A(z) ${role} rang mar be van allitva automatikus kiosztasra.` });
                }

                await updateWelcomeConfig(client, guild.id, {
                    roleIds: [role.id]
                });

                logger.info(`[Autorole] Set single auto-role to ${role.name} (${role.id}) in ${guild.name} by ${interaction.user.tag}`);
                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [createAutoroleInfoEmbed(
                        currentRoleId
                            ? `✅ Az Auto-role frissitve a kovetkezore: ${role}. Csak egy auto-role engedelyezett.`
                            : `✅ Az Auto-role beallitva a kovetkezore: ${role}.`
                    )],
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                logger.error(`[Autorole] Failed to add role for guild ${guild.id}:`, error);
                await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Hiba tortent a rang hozzaadasa kozben. Kerlek probald ujra.' });
            }
        } 
        
        else if (subcommand === 'remove') {
            const role = options.getRole('role');

            try {
                const config = await getWelcomeConfig(client, guild.id);
                const existingRoles = config.roleIds || [];
                
                if (!existingRoles.includes(role.id)) {
                    logger.info(`[Autorole] User ${interaction.user.tag} tried to remove non-existent role ${role.name} (${role.id}) in ${guild.name}`);
                    return await replyUserError(interaction, { type: ErrorTypes.USER_INPUT, message: `A(z) ${role} rang nincs beallitva automatikus kiosztasra.` });
                }

                const updatedRoles = existingRoles.filter(id => id !== role.id);
                
                await updateWelcomeConfig(client, guild.id, {
                    roleIds: updatedRoles
                });

                logger.info(`[Autorole] Removed role ${role.name} (${role.id}) from auto-assign in ${guild.name} by ${interaction.user.tag}`);
                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [createAutoroleInfoEmbed(`✅ A(z) ${role} eltavolitva az automatikusan kiosztott rangok kozul.`)],
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                logger.error(`[Autorole] Failed to remove role for guild ${guild.id}:`, error);
                await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Hiba tortent a rang eltavolitasa kozben. Kerlek probald ujra.' });
            }
        }
        
        else if (subcommand === 'list') {
            try {
                const guildConfig = await getGuildConfig(client, guild.id);
                const verificationEnabled = Boolean(guildConfig.verification?.enabled);
                const autoVerifyEnabled = Boolean(guildConfig.verification?.autoVerify?.enabled);
                const conflictSummary = [
                    verificationEnabled ? 'Az igazolasi rendszer engedelyezve van' : null,
                    autoVerifyEnabled ? 'Az AutoVerify engedelyezve van' : null
                ].filter(Boolean).join('\n');

                const config = await getWelcomeConfig(client, guild.id);
                const autoRoles = Array.isArray(config.roleIds) ? config.roleIds : [];

                const singleRoleIds = autoRoles.length > 1 ? [autoRoles[0]] : autoRoles;
                if (singleRoleIds.length !== autoRoles.length) {
                    await updateWelcomeConfig(client, guild.id, {
                        roleIds: singleRoleIds
                    });
                    logger.info(`[Autorole] Trimmed auto-role list to one role in ${interaction.guild.name}`);
                }

                if (singleRoleIds.length === 0) {
                    return InteractionHelper.safeEditReply(interaction, {
                        embeds: [createAutoroleInfoEmbed(`ℹ️ Nincs automatikus kiosztasra beallitott rang.${conflictSummary ?`\n\n⚠️ Utkozesek a beallitasban:\n${conflictSummary}`: ''}`)],
                        flags: MessageFlags.Ephemeral
                    });
                }

                const roles = await guild.roles.fetch();
                const validRoles = [];
                const invalidRoleIds = [];
                
                for (const roleId of singleRoleIds) {
                    const role = roles.get(roleId);
                    if (role) {
                        validRoles.push(role);
                    } else {
                        invalidRoleIds.push(roleId);
                    }
                }

                if (invalidRoleIds.length > 0) {
                    logger.info(`[Autorole] Cleaning up ${invalidRoleIds.length} invalid role(s) from guild ${interaction.guild.name}`);
                    const updatedRoles = singleRoleIds.filter(id => !invalidRoleIds.includes(id));
                    await updateWelcomeConfig(client, guild.id, {
                        roleIds: updatedRoles
                    });
                }

                if (validRoles.length === 0) {
                    return InteractionHelper.safeEditReply(interaction, {
                        embeds: [createAutoroleInfoEmbed(`ℹ️ Nem talalhato ervenyes auto-role. Az ervenytelen rangok eltavolitasra kerultek.${conflictSummary ?`\n\n⚠️ Utkozesek a beallitasban:\n${conflictSummary}`: ''}`)],
                        flags: MessageFlags.Ephemeral
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor(getColor('info'))
                    .setTitle('Automatikusan Kiosztott Rang')
                    .setDescription(`${validRoles[0]}${conflictSummary ?`\n\n⚠️ Utkozesek a beallitasban:\n${conflictSummary}`: ''}`)
                    .setFooter({ text: 'Csak egyetlen auto-role konfiguralhato.' });

                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });

            } catch (error) {
                logger.error(`[Autorole] Failed to list roles for guild ${guild.id}:`, error);
                await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Hiba tortent az automatikusan kiosztott rangok listazasa kozben. Kerlek probald ujra.' });
            }
        }
    },
};