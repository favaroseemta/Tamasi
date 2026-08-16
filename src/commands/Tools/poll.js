import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { getColor } from '../../config/bot.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
const EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const MAX_OPTIONS = 10;
export default {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Egyszeru szavazas letrehozasa akar 10 opcioval')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('A szavazas kerdese')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option1')
                .setDescription('Elso opcio')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option2')
                .setDescription('Masodik opcio')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('option3')
                .setDescription('Harmadik opcio (opcionalis)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option4')
                .setDescription('Negyedik opcio (opcionalis)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option5')
                .setDescription('Otodik opcio (opcionalis)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option6')
                .setDescription('Hatodik opcio (opcionalis)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option7')
                .setDescription('Hetedik opcio (opcionalis)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option8')
                .setDescription('Nyolcadik opcio (opcionalis)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option9')
                .setDescription('Kilencedik opcio (opcionalis)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('option10')
                .setDescription('Tizedik opcio (opcionalis)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('anonymous')
                .setDescription('Anonim szavazas (alapertelmezett: hamis)')
                .setRequired(false)),

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferSuccess) {
            logger.warn(`Poll interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'poll'
            });
            return;
        }

        const question = interaction.options.getString('question');
        const isAnonymous = interaction.options.getBoolean('anonymous') || false;

        const options = [];
        for (let i = 1; i <= MAX_OPTIONS; i++) {
            const option = interaction.options.getString(`option${i}`);
            if (option) options.push(option);
        }

        if (options.length < 2) {
            throw new Error("A szavazashoz legalabb 2 opciot meg kell adnod.");
        }

        let description = `**${question}**\n\n`;
        options.forEach((option, index) => {
            description += `${EMOJIS[index]} ${option}\n`;
        });

        if (isAnonymous) {
            description += '\n*Ez egy anonim szavazas. A szavazatok nincsenek felhasznalokhoz rendelve.*';
        } else {
            description += '\n*Reagalj az emojival a szavazashoz!*';
        }

        const embed = successEmbed(
            `📊 ${isAnonymous ? 'Anonim ' : ''}Szavazas`,
            description
        );

        const message = await interaction.channel.send({ embeds: [embed] });

        for (let i = 0; i < options.length; i++) {
            await message.react(EMOJIS[i]);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        await InteractionHelper.safeEditReply(interaction, {
            content: '✅ Szavazas sikeresen letrehozva!',
        });
    },
};