import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { getColor } from '../../config/bot.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('randomuser')
        .setDescription('Veletlenszeru felhasznalo valasztasa a szerverrol')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Valasztas korlatozasa az ezzel a ranggal rendelkezo felhasznalokra')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('bots')
                .setDescription('Botok belevetele a valasztasba (alapertelmezett: hamis)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('online')
                .setDescription('Csak online felhasznalokbol valasszon (alapertelmezett: hamis)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('mention')
                .setDescription('A kivalasztott felhasznalo megjelolese (alapertelmezett: hamis)')
                .setRequired(false)),

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`RandomUser interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'randomuser'
            });
            return;
        }

        if (!interaction.guild) {
            return replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: 'Ez a parancs csak szerveren hasznalhato.',
            });
        }

        const role = interaction.options.getRole('role');
        const includeBots = interaction.options.getBoolean('bots') || false;
        const onlineOnly = interaction.options.getBoolean('online') || false;
        const shouldMention = interaction.options.getBoolean('mention') || false;

        let members = interaction.guild.members.cache.filter(member => {
            if (member.user.bot && !includeBots) return false;

            if (onlineOnly && member.presence?.status === 'offline') return false;

            if (role && !member.roles.cache.has(role.id)) return false;

            return true;
        });

        let memberArray = Array.from(members.values());

        if (!includeBots) {
            memberArray = memberArray.filter(member => !member.user.bot);
        }

        if (memberArray.length === 0) {
            let errorMessage = 'Nem talalhato a szuroknek megfelelo felhasznalo:';
            if (role) errorMessage = `Egyetlen felhasznalo sem rendelkezik a(z) **${role.name}** ranggal.`;
            if (onlineOnly) errorMessage = 'Egyetlen felhasznalo sem online jelenleg.';
            if (role && onlineOnly) errorMessage = `Egyetlen **${role.name}** ranggal rendelkezo tag sem online.`;

            return replyUserError(interaction, {
                type: ErrorTypes.USER_INPUT,
                message: errorMessage + '\n\nProbald megmodositani a szuroket.',
            });
        }

        const randomIndex = Math.floor(Math.random() * memberArray.length);
        const selectedMember = memberArray[randomIndex];

        const user = selectedMember.user;
        const joinDate = selectedMember.joinedAt;
        const roles = selectedMember.roles.cache
            .filter(role => role.id !== interaction.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(role => role.toString())
            .slice(0, 10);

        const embed = successEmbed(
            '🎲 Veletlenszeru Felhasznalo Kivalasztva',
            shouldMention ? `${selectedMember}` : `**${user.username}**`
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: 'Felhasznalonev', value: user.username, inline: true },
            { name: 'Bot', value: user.bot ? 'Igen' : 'Nem', inline: true },
            { name: `Rangok (${roles.length})`, value: roles.length > 0 ? roles.slice(0, 5).join('') + (roles.length > 5 ? `+meg ${roles.length - 5}` : '') : 'Nincsenek rangok', inline: false }
        )
        .setColor('primary');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`randomuser_${interaction.user.id}_again`)
                    .setLabel('🎲 Masik Felhasznalo Valasztasa')
                    .setStyle(ButtonStyle.Primary)
            );

        const response = await interaction.editReply({
            content: shouldMention ? `${selectedMember}, te lettel kivalasztva!` : null,
            embeds: [embed],
            components: [row],
            allowedMentions: { users: shouldMention ? [user.id] : [] }
        });

        const filter = (i) => i.customId === `randomuser_${interaction.user.id}_again` && i.user.id === interaction.user.id;
        const collector = response.createMessageComponentCollector({ filter, time: 300000 });

        collector.on('collect', async (i) => {
            try {
                let newMembers = interaction.guild.members.cache.filter(member => {
                    if (member.user.bot && !includeBots) return false;

                    if (onlineOnly && member.presence?.status === 'offline') return false;

                    if (role && !member.roles.cache.has(role.id)) return false;

                    return true;
                });

                let newMemberArray = Array.from(newMembers.values());

                if (!includeBots) {
                    newMemberArray = newMemberArray.filter(member => !member.user.bot);
                }

                if (newMemberArray.length === 0) {
                    await replyUserError(i, {
                        type: ErrorTypes.USER_INPUT,
                        message: 'Nem talalhato a felteteleknek megfelelo felhasznalo.',
                    });
                    return;
                }

                const newRandomIndex = Math.floor(Math.random() * newMemberArray.length);
                const newSelectedMember = newMemberArray[newRandomIndex];
                const newUser = newSelectedMember.user;

                const newRoles = newSelectedMember.roles.cache
                    .filter(r => r.id !== interaction.guild.id)
                    .sort((a, b) => b.position - a.position)
                    .map(r => r.toString())
                    .slice(0, 10);

                const newEmbed = successEmbed(
                    '🎲 Veletlenszeru Felhasznalo Kivalasztva',
                    shouldMention ? `${newSelectedMember}` : `**${newUser.username}**`
                )
                .setThumbnail(newUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: 'Felhasznalonev', value: newUser.username, inline: true },
                    { name: 'Bot', value: newUser.bot ? 'Igen' : 'Nem', inline: true },
                    { name: `Rangok (${newRoles.length})`, value: newRoles.length > 0 ? newRoles.slice(0, 5).join('') + (newRoles.length > 5 ? `+meg ${newRoles.length - 5}` : '') : 'Nincsenek rangok', inline: false }
                )
                .setColor(newSelectedMember.displayHexColor || '#3498db');

                await i.update({
                    content: shouldMention ? `${newSelectedMember}, te lettel kivalasztva!` : null,
                    embeds: [newEmbed],
                    components: [row],
                    allowedMentions: { users: shouldMention ? [newUser.id] : [] }
                });

            } catch (error) {
                logger.error('Button interaction error:', error);
                await i.reply({
                    content: 'Hiba tortent egy masik felhasznalo kivalasztasa kozben.',
                    flags: ['Ephemeral']
                });
            }
        });

        collector.on('end', () => {
            const disabledRow = ActionRowBuilder.from(row).setComponents(
                ButtonBuilder.from(row.components[0]).setDisabled(true)
            );

            interaction.editReply({ components: [disabledRow] }).catch(console.error);
        });
    },
};