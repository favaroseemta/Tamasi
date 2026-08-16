import { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { getFromDb, setInDb } from '../../utils/database.js';
import { logger } from '../../utils/logger.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import crypto from 'crypto';

function generateShareId() {
    return crypto.randomBytes(16).toString('hex');
}

export default {
    data: new SlashCommandBuilder()
        .setName("todo")
        .setDescription("Sajat teendo lista kezelese")
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Teendo hozzaadasa a listahoz")
                .addStringOption(option =>
                    option
                        .setName("task")
                        .setDescription("A hozzaadando teendo")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("Teendo lista megtekintese")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("complete")
                .setDescription("Teendo megjelolese keszkent")
                .addIntegerOption(option =>
                    option
                        .setName("number")
                        .setDescription("A keszre allitando teendo szama")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Teendo eltavolitasa a listabol")
                .addIntegerOption(option =>
                    option
                        .setName("number")
                        .setDescription("Az eltavolitando teendo szama")
                        .setRequired(true)
                )
        )
        .addSubcommandGroup(group => 
            group
                .setName("share")
                .setDescription("Megosztott teendo listak kezelese")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("create")
                        .setDescription("Uj megosztott teendo lista letrehozasa")
                        .addStringOption(option =>
                            option
                                .setName("name")
                                .setDescription("A megosztott lista neve")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("add")
                        .setDescription("Tag hozzaadasa a megosztott listahoz")
                        .addStringOption(option =>
                            option
                                .setName("list_id")
                                .setDescription("A megosztott lista ID-ja")
                                .setRequired(true)
                        )
                        .addUserOption(option =>
                            option
                                .setName("user")
                                .setDescription("Hozzaadando felhasznalo")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("view")
                        .setDescription("Megosztott teendo lista megtekintese")
                        .addStringOption(option =>
                            option
                                .setName("list_id")
                                .setDescription("A megosztott lista ID-ja")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("addtask")
                        .setDescription("Teendo hozzaadasa a megosztott listahoz")
                        .addStringOption(option =>
                            option
                                .setName("list_id")
                                .setDescription("A megosztott lista ID-ja")
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName("task")
                                .setDescription("A hozzaadando teendo")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("remove")
                        .setDescription("Teendo eltavolitasa a megosztott listabol")
                        .addStringOption(option =>
                            option
                                .setName("list_id")
                                .setDescription("A megosztott lista ID-ja")
                                .setRequired(true)
                        )
                        .addIntegerOption(option =>
                            option
                                .setName("number")
                                .setDescription("Az eltavolitando teendo szama")
                                .setRequired(true)
                        )
                )
        )
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
    category: "Utility",

    async execute(interaction, config, client) {
        const userId = interaction.user.id;
                const subcommand = interaction.options.getSubcommand();
                const shareSubcommand = interaction.options.getSubcommandGroup() === 'share' ? interaction.options.getSubcommand() : null;

        async function getOrCreateSharedList(listId, creatorId = null, listName = null) {
            const listKey = `shared_todo_${listId}`;
            let listData = await getFromDb(listKey, null);
            
            if (!listData || (listData.ok === false && listData.error)) {
                if (creatorId) {
                    listData = {
                        id: listId,
                        name: listName,
                        creatorId,
                        members: [creatorId],
                        tasks: [],
                        nextId: 1,
                        createdAt: new Date().toISOString()
                    };
                    await setInDb(listKey, listData);
                } else {
                    return null;
                }
            }
            
            if (listData) {
                if (!Array.isArray(listData.tasks)) listData.tasks = [];
                if (!listData.nextId) listData.nextId = 1;
                if (!Array.isArray(listData.members)) listData.members = [];
            }
            
            return listData;
        }

        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Todo interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'todo'
            });
            return;
        }

        if (shareSubcommand) {
            switch (shareSubcommand) {
                case 'create': {
                    const listName = interaction.options.getString('name');
                    const listId = generateShareId();

                    await getOrCreateSharedList(listId, userId, listName);

                    const userSharedLists = await getFromDb(`user_shared_lists_${userId}`, []);
                    const sharedListsArray = Array.isArray(userSharedLists) ? userSharedLists : [];
                    if (!sharedListsArray.includes(listId)) {
                        sharedListsArray.push(listId);
                        await setInDb(`user_shared_lists_${userId}`, sharedListsArray);
                    }

                    return await InteractionHelper.safeEditReply(interaction, {
                        embeds: [
                            successEmbed(
                                "Megosztott Lista Letrehozva",
                                `Letrehozva a(z) "${listName}" megosztott lista ezzel az ID-val: \`${listId}\`\n` +
                                `Hasznald a \`/todo share add list_id:${listId} user:@username\` parancsot tagok hozzaadasahoz.`
                            )
                        ]
                    });
                }

                case 'add': {
                    const listId = interaction.options.getString('list_id');
                    const memberToAdd = interaction.options.getUser('user');

                    const listData = await getOrCreateSharedList(listId);
                    if (!listData) {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Megosztott lista nem talalhato.' });
                    }

                    if (listData.creatorId !== userId) {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Csak a lista letrehozoja adhat hozza tagokat.' });
                    }

                    if (!listData.members.includes(memberToAdd.id)) {
                        listData.members.push(memberToAdd.id);
                        await setInDb(`shared_todo_${listId}`, listData);

                        const memberLists = await getFromDb(`user_shared_lists_${memberToAdd.id}`, []);
                        const memberListsArray = Array.isArray(memberLists) ? memberLists : [];
                        if (!memberListsArray.includes(listId)) {
                            memberListsArray.push(listId);
                            await setInDb(`user_shared_lists_${memberToAdd.id}`, memberListsArray);
                        }

                        return await InteractionHelper.safeEditReply(interaction, {
                            embeds: [
                                successEmbed('Tag Hozzaadva', 
                                    `${memberToAdd.username} hozzaadva a(z) "${listData.name}" megosztott listahoz`
                                )
                            ]
                        });
                    } else {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'A felhasznalo mar tagja ennek a listanak.' });
                    }
                }

                case 'view': {
                    const listId = interaction.options.getString('list_id');
                    const listData = await getOrCreateSharedList(listId);

                    if (!listData) {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Megosztott lista nem talalhato.' });
                    }

                    if (!listData.members.includes(userId)) {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Nincs hozzaferesed ehhez a listahoz.' });
                    }

                    if (listData.tasks.length === 0) {
                        const memberList = listData.members.map(memberId => {
                            const member = interaction.guild.members.cache.get(memberId);
                            return member ? member.user.username : `<@${memberId}>`;
                        }).join(',');

                        const owner = interaction.guild.members.cache.get(listData.creatorId);
                        const ownerName = owner ? owner.user.username : `<@${listData.creatorId}>`;

                        return await InteractionHelper.safeEditReply(interaction, {
                                embeds: [
                                    successEmbed(
                                        `📋 **${listData.name}**\n\n` +
                                        `👑 **Tulajdonos:** ${ownerName}\n` +
                                        `👥 **Tagok:** ${memberList}\n\n` +
                                        `*Ez a lista jelenleg ures. Hasznald a "Teendo hozzaadasa" gombot teendok hozzaadasahoz!*`,
                                        `Megosztott Lista (ID: \`${listId}\`)`
                                    )
                                ],
                                components: [
                                    new ActionRowBuilder().addComponents(
                                        new ButtonBuilder()
                                            .setCustomId(`shared_todo_add_${listId}`)
                                            .setLabel('Teendo hozzaadasa')
                                            .setStyle(ButtonStyle.Primary),
                                        new ButtonBuilder()
                                            .setCustomId(`shared_todo_complete_${listId}`)
                                            .setLabel('Teendo kesz')
                                            .setStyle(ButtonStyle.Success),
                                        new ButtonBuilder()
                                            .setCustomId(`shared_todo_remove_${listId}`)
                                            .setLabel('Teendo eltavolitasa')
                                            .setStyle(ButtonStyle.Danger)
                                    )
                                ]
                            });
                    }

                    const taskList = listData.tasks
                        .map(task => 
                            `${task.completed ? '✅' : '📝'} #${task.id} ${task.text}` +
                            `\`[${new Date(task.createdAt).toLocaleDateString()}]` +
                            (task.completed ? `• Keszre allitotta: ${task.completedBy}` : '') + '`'
                        )
                        .join('\n');

                    const memberList = listData.members.map(memberId => {
                        const member = interaction.guild.members.cache.get(memberId);
                        return member ? member.user.username : `<@${memberId}>`;
                    }).join(',');

                    const owner = interaction.guild.members.cache.get(listData.creatorId);
                    const ownerName = owner ? owner.user.username : `<@${listData.creatorId}>`;

                    const fullListDisplay = `📋 **${listData.name}**\n\n` +
                        `👑 **Tulajdonos:** ${ownerName}\n` +
                        `👥 **Tagok:** ${memberList}\n\n` +
                        `**Teendok:**\n${taskList}`;

                    return await InteractionHelper.safeEditReply(interaction, {
                        embeds: [
                            successEmbed(`Megosztott Lista (ID: \`${listId}\`)`, fullListDisplay)
                        ],
                        components: [
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`shared_todo_add_${listId}`)
                                    .setLabel('Teendo hozzaadasa')
                                    .setStyle(ButtonStyle.Primary),
                                new ButtonBuilder()
                                    .setCustomId(`shared_todo_complete_${listId}`)
                                    .setLabel('Teendo kesz')
                                    .setStyle(ButtonStyle.Success),
                                new ButtonBuilder()
                                    .setCustomId(`shared_todo_remove_${listId}`)
                                    .setLabel('Teendo eltavolitasa')
                                    .setStyle(ButtonStyle.Danger)
                            )
                        ]
                    });
                }

                case 'addtask': {
                    const listId = interaction.options.getString('list_id');
                    const taskText = interaction.options.getString('task');

                    const listData = await getOrCreateSharedList(listId);

                    if (!listData) {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Megosztott lista nem talalhato.' });
                    }

                    if (!listData.members.includes(userId)) {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Nincs hozzaferesed ehhez a listahoz.' });
                    }

                    const newTask = {
                        id: listData.nextId++,
                        text: taskText,
                        completed: false,
                        createdAt: new Date().toISOString(),
                        createdBy: userId
                    };

                    listData.tasks.push(newTask);
                    await setInDb(`shared_todo_${listId}`, listData);

                    return await InteractionHelper.safeEditReply(interaction, {
                        embeds: [
                            successEmbed('Teendo Hozzaadva', `A(z) "${taskText}" felvetve a(z) "${listData.name}" megosztott listara.`)
                        ]
                    });
                }

                case 'remove': {
                    const listId = interaction.options.getString('list_id');
                    const taskNumber = interaction.options.getInteger('number');

                    const listData = await getOrCreateSharedList(listId);

                    if (!listData) {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Megosztott lista nem talalhato.' });
                    }

                    if (!listData.members.includes(userId)) {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Nincs hozzaferesed ehhez a listahoz.' });
                    }

                    const taskIndex = listData.tasks.findIndex(task => task.id === taskNumber);
                    if (taskIndex === -1) {
                        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Teendo nem talalhato.' });
                    }

                    const [removedTask] = listData.tasks.splice(taskIndex, 1);
                    await setInDb(`shared_todo_${listId}`, listData);

                    return await InteractionHelper.safeEditReply(interaction, {
                        embeds: [
                            successEmbed('Teendo Eltavolitva', `A(z) "${removedTask.text}" eltavolitva a(z) "${listData.name}" megosztott listarol.`)
                        ]
                    });
                }
            }
            return;
        }

        const dbKey = `todo_${userId}`;

        const userData = await getFromDb(dbKey, {
            tasks: [],
            nextId: 1
        });

        if (!userData.tasks) userData.tasks = [];
        if (!userData.nextId) userData.nextId = 1;

        switch (subcommand) {
            case 'add': {
                const taskText = interaction.options.getString('task');

                const newTask = {
                    id: userData.nextId++,
                    text: taskText,
                    completed: false,
                    createdAt: new Date().toISOString()
                };

                userData.tasks.push(newTask);
                await setInDb(dbKey, userData);

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed(
                            "Teendo Hozzaadva",
                            `"${taskText}" hozzaadva a teendo listadhoz.`
                        ),
                    ],
                });
            }

            case 'list': {
                if (userData.tasks.length === 0) {
                    return await InteractionHelper.safeEditReply(interaction, {
                        embeds: [successEmbed('A teendo listad ures!', "A Teendo Listad")],
                    });
                }

                const taskList = userData.tasks
                    .map(task => 
                        `${task.completed ? '✅' : '📝'} #${task.id} ${task.text}` +
                        `\`[${new Date(task.createdAt).toLocaleDateString()}\``
                    )
                    .join('\n');

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed('A Teendo Listad', taskList)
                    ],
                });
            }

            case 'complete': {
                const taskNumber = interaction.options.getInteger('number');
                const task = userData.tasks.find(t => t.id === taskNumber);

                if (!task) {
                    return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Teendo nem talalhato.' });
                }

                if (task.completed) {
                    return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: `A(z) #${task.id} teendo mar kesznek van jelolve.` });
                }

                task.completed = true;
                await setInDb(`todo_${userId}`, userData);

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed('Teendo Elintezve', `"${task.text}" kesznek jelolve!`)
                    ],
                });
            }

            case 'remove': {
                const taskNumber = interaction.options.getInteger('number');
                const taskIndex = userData.tasks.findIndex(t => t.id === taskNumber);

                if (taskIndex === -1) {
                    return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Teendo nem talalhato.' });
                }

                const [removedTask] = userData.tasks.splice(taskIndex, 1);
                await setInDb(`todo_${userId}`, userData);

                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed('Teendo Eltavolitva', `"${removedTask.text}" eltavolitva a teendo listadrol.`)
                    ],
                });
            }

            default:
                return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: 'Ervenytelen alparancs.' });
        }
    },
};