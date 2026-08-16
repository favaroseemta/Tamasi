import { SlashCommandBuilder } from 'discord.js';
import { successEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const EMBED_DESCRIPTION_LIMIT = 4096;

export default {
    data: new SlashCommandBuilder()
    .setName("fight")
    .setDescription("1v1 szimulalt harc inditasa.")
    .addUserOption((option) =>
      option
        .setName("opponent")
        .setDescription("A felhasznalo akivel megkuzdesz.")
        .setRequired(true),
    ),
  category: 'Fun',

  async execute(interaction, config, client) {
    await InteractionHelper.safeDefer(interaction);

    const challenger = interaction.user;
    const opponent = interaction.options.getUser("opponent");

    if (challenger.id === opponent.id) {
      const embed = warningEmbed(
        "⚔️ Ervenytelen kihivas",
        `**${challenger.username}**, nem kuzdhetsz sajat magad ellen! Azelott dontetlen lenne, mielott elkezdodne.`
      );
      return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }

    if (opponent.bot) {
      const embed = warningEmbed(
        "⚔️ Ervenytelen ellenfel",
        "Nem kuzdhetsz botok ellen! Hivj ki egy valodi embert."
      );
      return await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }

    const winner = rand(0, 1) === 0 ? challenger : opponent;
    const loser = winner.id === challenger.id ? opponent : challenger;
    const rounds = rand(3, 7);
    const damage = rand(10, 50);

    const log = [];
    log.push(
      `💥 **${challenger.username}** kihivta **${opponent.username}**-t egy parharcra! (${rounds} menetig tart)`,
    );

    for (let i = 1; i <= rounds; i++) {
      const attacker = rand(0, 1) === 0 ? challenger : opponent;
      const target = attacker.id === challenger.id ? opponent : challenger;
      const action = [
        "bevisz egy vad utest",
        "kritikus talalatot er el",
        "gyenge varazslatot vet be",
        "harit es visszatamad",
      ][rand(0, 3)];
      log.push(
        `\n**${i}. menet:** ${attacker.username} ${action} ${target.username} ellen, ${rand(1, damage)} sebzest okozva!`,
      );
    }

    const outcomeText = log.join("\n");
    const winnerText = `👑 **${winner.username}** legyozte ${loser.username} felhasznalot es megnyerte a csatat!`;
    const fullDescription = `${outcomeText}\n\n${winnerText}`;

    const description = fullDescription.length <= EMBED_DESCRIPTION_LIMIT
      ? fullDescription
      : `${fullDescription.slice(0, EMBED_DESCRIPTION_LIMIT - 15)}\n\n...`;

    const embed = successEmbed(
      "🏆 Parharc vege!",
      description
    );

    await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    logger.debug(`Fight command executed between ${challenger.id} and ${opponent.id} in guild ${interaction.guildId}`);
  },
};