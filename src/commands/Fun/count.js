import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import {
  getCountingGameConfig,
  activateCountingGame,
  disableCountingGame,
  resetCountingGame,
  buildCountingLeaderboard,
  getCountingSystemChoices,
  getCountingSystemLabel,
  getExpectedCountValue,
} from '../../services/countingGameService.js';
import { logger } from '../../utils/logger.js';

import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
export default {
  data: new SlashCommandBuilder()
    .setName('count')
    .setDescription('A szerveri szamolo jatek kezelese')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setup')
        .setDescription('Szamolo jatek inditasa egy szoveges csatornaban')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('A csatorna ahol a szamolas folyik')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addStringOption((option) =>
          option
            .setName('system')
            .setDescription('A hasznando szamolasi rendszer')
            .setRequired(true)
            .addChoices(...getCountingSystemChoices()),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('disable').setDescription('A szamolo jatek kikapcsolasa a szerveren'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('status').setDescription('Jelenlegi szamolo jatek statusz megtekintese'),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('reset')
        .setDescription('Jelenlegi szamolasi sorozat nullazasa')
        .addIntegerOption((option) =>
          option
            .setName('start')
            .setDescription('A szam amitol az ujrainditas utan indul a szamolas')
            .setMinValue(1),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('leaderboard').setDescription('Szamolo jatek ranglista megjelenitese'),
    ),
  category: 'Fun',

  async execute(interaction) {
    try {
      const deferSuccess = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
      if (!deferSuccess) {
        logger.warn('Count command defer failed', { userId: interaction.user.id, guildId: interaction.guildId });
        return;
      }

      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'A parancs hasznalatahoz **Szerver kezelese** jogosultsag szukseges.' });
      }

      const guildId = interaction.guildId;
      const subcommand = interaction.options.getSubcommand();
      const config = await getCountingGameConfig(interaction.client, guildId);

      if (subcommand === 'setup') {
        const channel = interaction.options.getChannel('channel');
        const system = interaction.options.getString('system');
        if (!channel || channel.type !== ChannelType.GuildText) {
          return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'Kerlek valassz egy szoveges csatornat a szamolo jatekhoz.' });
        }

        if (config.enabled && config.channelId && config.channelId !== channel.id) {
          return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: `Ez a szerver mar rendelkezik aktiv szamolo csatornaval: <#${config.channelId}>. Eloszor kapcsold ki a jelenlegit, vagy hasznald a meglevo csatornat.` });
        }

        await activateCountingGame(interaction.client, guildId, channel.id, system);
        return await InteractionHelper.safeEditReply(interaction, {
          embeds: [
            successEmbed(
              'Szamolo jatek engedelyezve',
              `A szamolo jatek mar aktiv a(z) ${channel} csatornaban a **${getCountingSystemLabel(system)}** rendszerrel. A jatekosoknak **1**-tol felfele kell szamolniuk es nem kuldhetnek ket szamot egymas utan.`,
            ),
          ],
        });
      }

      if (subcommand === 'disable') {
        if (!config.enabled) {
          return await InteractionHelper.safeEditReply(interaction, {
            embeds: [infoEmbed('Szamolo jatek kikapcsolva', 'A szamolo jatek mar ki van kapcsolva ezen a szerveren.')],
          });
        }

        await disableCountingGame(interaction.client, guildId);
        return await InteractionHelper.safeEditReply(interaction, {
          embeds: [successEmbed('Szamolo jatek kikapcsolva', 'A szamolo jatek sikeresen ki lett kapcsolva.')],
        });
      }

      if (subcommand === 'status') {
        const fields = [
          { name: 'Engedelyezve', value: config.enabled ? 'Igen' : 'Nem', inline: true },
          { name: 'Csatorna', value: config.channelId ? `<#${config.channelId}>` : 'Nincs beallitva', inline: true },
          { name: 'Rendszer', value: getCountingSystemLabel(config.system), inline: true },
          { name: 'Kovetkezo szam', value: getExpectedCountValue(config), inline: true },
          { name: 'Jelenlegi sorozat', value: `${config.currentStreak}`, inline: true },
          { name: 'Legjobb sorozat', value: `${config.bestStreak || 0}`, inline: true },
          { name: 'Utolso szamolo', value: config.lastUserId ? `<@${config.lastUserId}>` : 'Senki', inline: true },
        ];

        return await InteractionHelper.safeEditReply(interaction, {
          embeds: [
            createEmbed({
              title: 'Szamolo jatek statusza',
              description: 'A jelenleg beallitott szamolo jatek attekintese.',
              fields,
              color: 'primary',
            }),
          ],
        });
      }

      if (subcommand === 'reset') {
        if (!config.enabled) {
          return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Eloszor engedelyezd a szamolo jatekot a `/count setup` parancsal.' });
        }

        const startNumber = interaction.options.getInteger('start') || 1;
        await resetCountingGame(interaction.client, guildId, startNumber);

        return await InteractionHelper.safeEditReply(interaction, {
          embeds: [
            successEmbed(
              'Szamolo jatek nullazva',
              `A szamolasi sorozat nullazva lett. Kezdjetek ujra a **${startNumber}** szammal a(z) <#${config.channelId}> csatornaban.`,
            ),
          ],
        });
      }

      if (subcommand === 'leaderboard') {
        const leaderboard = buildCountingLeaderboard(config, interaction.guild);

        return await InteractionHelper.safeEditReply(interaction, {
          embeds: [
            createEmbed({
              title: 'Szamolo jatek ranglista',
              description: leaderboard.length > 0 ? leaderboard.join('\n') : 'Meg nem tortent szamolas.',
              color: 'primary',
            }),
          ],
        });
      }

      return await replyUserError(interaction, { type: ErrorTypes.VALIDATION, message: 'Kerlek valassz ervenyes szamolo jatek muveletet.' });
    } catch (error) {
      logger.error('Count command error:', error);
      return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Valami hiba tortent a szamolo jatek kezelese kozben.' });
    }
  },
};
