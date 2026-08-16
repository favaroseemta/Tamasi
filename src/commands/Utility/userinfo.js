import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
    data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Reszletes informaciok egy felhasznalorol")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("A megtekintendo felhasznalo (alapertelmezett: te)"),
    ),

  async execute(interaction) {
    const deferSuccess = await InteractionHelper.safeDefer(interaction);
    if (!deferSuccess) {
      logger.warn(`UserInfo interaction defer failed`, {
        userId: interaction.user.id,
        guildId: interaction.guildId,
        commandName: 'userinfo'
      });
      return;
    }

    const user = interaction.options.getUser("target") || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);

    const createdTimestamp = Math.floor(user.createdAt.getTime() / 1000);
    const joinedTimestamp = member?.joinedAt ? Math.floor(member.joinedAt.getTime() / 1000) : null;

    const embed = createEmbed({ title: `Felhasznaloi info: ${user.username}` })
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: "ID", value: user.id, inline: true },
        { name: "Bot", value: user.bot ? "Igen" : "Nem", inline: true },
        {
          name: "Rangok",
          value:
            member && member.roles.cache.size > 1
              ? member.roles.cache
                  .map((r) => r.name)
                  .slice(0, 5)
                  .join(",")
              : "Nincsenek",
          inline: true,
        },
        {
          name: "Fiok letrehozva",
          value: `<t:${createdTimestamp}:R>`,
          inline: false,
        },
        {
          name: "Csatlakozott a szerverhez",
          value: joinedTimestamp ? `<t:${joinedTimestamp}:R>` : "Nincs a szerveren",
          inline: false,
        },
        {
          name: "Legmagasabb rang",
          value: member?.roles?.highest?.name || "Nincsenek",
          inline: true,
        },
      );

    await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    logger.info(`UserInfo command executed`, {
      userId: interaction.user.id,
      targetUserId: user.id,
      guildId: interaction.guildId
    });
  },
};