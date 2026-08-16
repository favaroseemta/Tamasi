import { EmbedBuilder } from 'discord.js';
import { getUpcomingBirthdays } from '../../../services/birthdayService.js';
import { deleteBirthday } from '../../../utils/database.js';
import { logger } from '../../../utils/logger.js';

import { InteractionHelper } from '../../../utils/interactionHelper.js';
export default {
    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);

        const next5 = await getUpcomingBirthdays(client, interaction.guildId, 5);

        if (next5.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Nem talalhato szuletesnap')
                .setDescription('Meg nem allitottak be szuletesnapot ezen a szerveren. Hasznald a `/birthday set` parancsot!');
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed]
            });
        }

        let displayIndex = 0;
        for (const birthday of next5) {
            const member = await interaction.guild.members.fetch(birthday.userId).catch(() => null);
            if (!member) {
                deleteBirthday(client, interaction.guildId, birthday.userId).catch(() => null);
                continue;
            }
            displayIndex++;

            let timeUntil = '';
            if (birthday.daysUntil === 0) {
                timeUntil = '🎉 **Ma!**';
            } else if (birthday.daysUntil === 1) {
                timeUntil = '📅 **Holnap!**';
            } else {
                timeUntil = `${birthday.daysUntil} nap mulva`;
            }
        }

        if (displayIndex === 0) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Nincsenek szuletesnapok')
                .setDescription('Nincsenek szuletesnapok a szerver jelenlegi tagjai kozott.');
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed]
            });
        }

        let birthdayList = `🎂 **Kovetkezo 5 szuletesnap**\n\nIme a kovetkezo 5 szuletesnap a(z) ${interaction.guild.name} szerveren:\n\n`;
        displayIndex = 0;
        for (const birthday of next5) {
            const member = await interaction.guild.members.fetch(birthday.userId).catch(() => null);
            if (!member) {
                continue;
            }
            displayIndex++;

            let timeUntil = '';
            if (birthday.daysUntil === 0) {
                timeUntil = '🎉 **Ma!**';
            } else if (birthday.daysUntil === 1) {
                timeUntil = '📅 **Holnap!**';
            } else {
                timeUntil = `${birthday.daysUntil} nap mulva`;
            }

            birthdayList += `${displayIndex}. **${member.displayName}**\n<@${birthday.userId}>\n📅 **Datum:** ${birthday.monthName} ${birthday.day}\n⏰ **Idopont:** ${timeUntil}\n\n`;
        }

        birthdayList += `Hasznald a /birthday set parancsot a szuletesnapod megadasahoz!`;

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Kovetkezo 5 szuletesnap')
            .setDescription(birthdayList);

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed]
        });

        logger.info('Next birthdays retrieved successfully', {
            userId: interaction.user.id,
            guildId: interaction.guildId,
            upcomingCount: displayIndex,
            commandName: 'next_birthdays'
        });
    }
};