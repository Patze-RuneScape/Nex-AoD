import { ModalSubmitInteraction, InteractionResponse, Message, APIEmbedField, EmbedBuilder, TextChannel, Role, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Trial } from '../entity/Trial';
import { TrialParticipation } from '../entity/TrialParticipation';
import Bot from '../Bot';

export default interface ModalHandler { client: Bot; id: string; interaction: ModalSubmitInteraction }

export default class ModalHandler {
    constructor(client: Bot, id: string, interaction: ModalSubmitInteraction<'cached'>) {
        this.client = client;
        this.id = id;
        this.interaction = interaction;
        switch (id) {
            case 'passTrialee': this.passTrialee(interaction); break;
            case 'failTrialee': this.failTrialee(interaction); break;
            default: break;
        }
    }

    get userId(): string {
        return this.interaction.user.id;
    }

    get currentTime(): number {
        return Math.round(Date.now() / 1000)
    }

    public assignRole = async (interaction: ModalSubmitInteraction<'cached'>, roleId: string, trialeeId: string) => {

        const { roles, colours, channels, stripRole } = this.client.util;

        const trialee = await interaction.guild?.members.fetch(trialeeId);
        const trialeeRoles = await trialee?.roles.cache.map(role => role.id) || [];

        // Remove trialee
        if (trialeeRoles?.includes(stripRole(roles.trialee))) {
            await trialee?.roles.remove(stripRole(roles.trialee));
        }

        // Add 7-Man tag
        if (!trialeeRoles?.includes(stripRole(roles.sevenMan))) {
            await trialee?.roles.add(stripRole(roles.sevenMan));
        }

        await trialee?.roles.add(roleId);

        let embedColour = colours.discord.green;
        const roleObject = await interaction.guild?.roles.fetch(roleId) as Role;
        embedColour = roleObject.color;

        let returnedMessage = {
            id: '',
            url: ''
        };

        const channel = await this.client.channels.fetch(channels.achievementsAndLogs) as TextChannel;

        const embed = new EmbedBuilder()
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() || this.client.user?.avatarURL() || 'https://cdn.discordapp.com/attachments/1027186342620299315/1054206984360050709/445px-Reeves_pet.png' })
            .setTimestamp()
            .setColor(embedColour)
            .setDescription(`Congratulations to <@${trialeeId}> on achieving <@&${roleId}>!`);
        if (channel) await channel.send({ embeds: [embed] }).then(message => {
            returnedMessage.id = message.id;
            returnedMessage.url = message.url;
        });

        const logChannel = await this.client.channels.fetch(channels.botRoleLog) as TextChannel;
        const buttonRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('rejectRoleAssign')
                    .setLabel('Reject Approval')
                    .setStyle(ButtonStyle.Danger),
            );
        const logEmbed = new EmbedBuilder()
            .setTimestamp()
            .setColor(embedColour)
            .setDescription(`
            <@&${roleId}> was assigned to <@${trialeeId}> by <@${interaction.user.id}>.
            **Message**: [${returnedMessage.id}](${returnedMessage.url})
            `);
        await logChannel.send({ embeds: [logEmbed], components: [buttonRow] });
    }

    public async saveTrial(interaction: ModalSubmitInteraction<'cached'>, trialeeId: string, roleId: string, userId: string, fields: APIEmbedField[]): Promise<void> {
        // Create new Trial.
        const { dataSource } = this.client;
        const trialRepository = dataSource.getRepository(Trial);
        const trialObject = new Trial();
        trialObject.trialee = trialeeId;
        trialObject.host = userId;
        trialObject.role = roleId;
        trialObject.link = interaction.message?.url || '';
        const trial = await trialRepository.save(trialObject);

        // Update Trial Attendees

        const trialParticipants: TrialParticipation[] = [];
        fields.forEach((member: APIEmbedField) => {
            if (member.value !== '`Empty`' && !member.value.includes('Trialee')) {
                const userIdRegex = /<@(\d+)>/;
                const userIdMatch = member.value.match(userIdRegex);
                if (userIdMatch) {
                    const participant = new TrialParticipation();
                    participant.participant = userIdMatch[1];;
                    participant.role = member.name;
                    participant.trial = trial;
                    trialParticipants.push(participant);
                }
            }
        })

        // Save trial attendees

        const participantReposittory = dataSource.getRepository(TrialParticipation);
        await participantReposittory.save(trialParticipants);
    }

    private async passTrialee(interaction: ModalSubmitInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void> {
        const { colours, channels } = this.client.util;
        await interaction.deferReply({ ephemeral: true });
        const hasRolePermissions: boolean | undefined = await this.client.util.hasRolePermissions(this.client, ['trialeeTeacher', 'trialHost', 'organizer', 'admin', 'owner'], interaction);
        const messageEmbed = interaction.message?.embeds[0];
        const replyEmbed: EmbedBuilder = new EmbedBuilder();
        if (!messageEmbed) {
            replyEmbed.setColor(colours.discord.red)
            replyEmbed.setDescription('No embed message detected.')
            return await interaction.editReply({ embeds: [replyEmbed] });
        }
        const messageContent: string | undefined = messageEmbed.data.description;
        const fields: APIEmbedField[] = messageEmbed.fields;
        const hostExpression: RegExp = /\`Host:\` <@(\d+)>/;
        const trialTypeExpression: RegExp = /\`Type:\` (.+) Trial/;
        const trialeeExpression: RegExp = /\`Discord:\` <@(\d+)>/;
        const roleExpression: RegExp = /\`Tag:\` <@&(\d+)>/;
        let userId: string = '';
        let trialeeId: string = '';
        let trialType: string = '';
        let roleId: string = '';
        if (messageContent) {
            const hostMatches = messageContent.match(hostExpression);
            const trialeeMatches = messageContent.match(trialeeExpression);
            const trialTypeMatches = messageContent.match(trialTypeExpression);
            const roleMatches = messageContent.match(roleExpression);
            userId = hostMatches ? hostMatches[1] : '';
            trialeeId = trialeeMatches ? trialeeMatches[1] : '';
            trialType = trialTypeMatches ? trialTypeMatches[1] : '';
            roleId = roleMatches ? roleMatches[1] : '';
            if (!userId || !trialeeId || !roleId || !trialType) {
                // Should never really make it to this.
                replyEmbed.setColor(colours.discord.red)
                replyEmbed.setDescription('Host, Trialee, Trial Type or Tag could not be detected.')
                return await interaction.editReply({ embeds: [replyEmbed] });
            }
        }
        if (hasRolePermissions) {
            const hasElevatedRole = await this.client.util.hasRolePermissions(this.client, ['trialeeTeacher', 'trialHost', 'organizer', 'admin', 'owner'], interaction);
            if ((interaction.user.id === userId) || hasElevatedRole) {
                const splitResults = messageContent?.split('⬥');
                if (!splitResults) {
                    replyEmbed.setColor(colours.discord.red)
                    replyEmbed.setDescription(`Message could not be parsed correctly.`)
                    return await interaction.editReply({ embeds: [replyEmbed] });
                }
                const messageContentWithoutStarted = splitResults[0];
                const dirtyStarted = splitResults[1];
                const started = dirtyStarted?.replace('> **Team**', '').trim();
                const newMessageContent = `${messageContentWithoutStarted}⬥ ${started}\n⬥ <@${trialeeId}> ${trialType.includes('Mock') ? 'is ready for trial' : 'successfully passed'} <t:${this.currentTime}:R>!\n\n> **Team**`;

                // Save trial to database.
                await this.saveTrial(interaction, trialeeId, roleId, userId, fields);

                // Give the trialee the correct role if real trial.
                if (trialType.includes('Real')) {
                    await this.assignRole(interaction, roleId, trialeeId);
                }

                const resultChannelId = channels.mockResult;

                const resultChannel = await this.client.channels.fetch(resultChannelId) as TextChannel;


                const gemURL = interaction.fields.getTextInputValue('gemURL');
                const comments = interaction.fields.getTextInputValue('comments');

                const resultEmbed: EmbedBuilder = new EmbedBuilder();
                resultEmbed.setColor(colours.discord.green)
                resultEmbed.setDescription(`
                > **General**\n
                **Discord:** <@${trialeeId}>
                **Tag:** <@&${roleId}>
                ${trialType.includes('Mock') ? '**Ready for Trial:**' : '**Passed:**'} ✅\n
                ${comments ? `> **Notes**\n\n${comments}\n` : ''}
                > **Team**
                `)
                resultEmbed.setFields(fields)

                await resultChannel.send({
                    content: `> **${trialType.includes('Mock') ? 'Mock Trial' : 'Trial'} hosted by <@${userId}>** on <t:${this.currentTime}:D>`,
                    embeds: [resultEmbed],
                    allowedMentions: {
                        users: [],
                        roles: []
                    }
                });

                if (gemURL) {
                    await resultChannel.send({
                        content: gemURL,
                        allowedMentions: {
                            users: [],
                            roles: []
                        }
                    });
                };

                const newEmbed = new EmbedBuilder()
                    .setColor(colours.discord.green)
                    .setFields(fields)
                    .setDescription(`${newMessageContent}`);
                await interaction.message?.edit({ content: '', embeds: [newEmbed], components: [] });
                replyEmbed.setColor(colours.discord.green);
                replyEmbed.setDescription(`Trialee successfully passed!`);
                return await interaction.editReply({ embeds: [replyEmbed] });
            } else {
                replyEmbed.setColor(colours.discord.red)
                replyEmbed.setDescription(`Only <@${userId}> or an elevated role can pass this trialee.`)
                return await interaction.editReply({ embeds: [replyEmbed] });
            }
        } else {
            this.client.logger.log(
                {
                    message: `Attempted restricted permissions. { command: Pass Trialee, user: ${interaction.user.username}, channel: ${interaction.channel} }`,
                    handler: this.constructor.name,
                },
                true
            );
            return await interaction.editReply({ content: 'You do not have permissions to run this command. This incident has been logged.' });
        }
        // console.log(interaction.message?.content)
        // await interaction.reply({ content: 'Your submission was received successfully!' });
    }

    private async failTrialee(interaction: ModalSubmitInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void> {
        const { colours, channels } = this.client.util;
        await interaction.deferReply({ ephemeral: true });
        const hasRolePermissions: boolean | undefined = await this.client.util.hasRolePermissions(this.client, ['trialeeTeacher', 'trialHost', 'organizer', 'admin', 'owner'], interaction);
        const messageEmbed = interaction.message?.embeds[0];
        const replyEmbed: EmbedBuilder = new EmbedBuilder();
        if (!messageEmbed) {
            replyEmbed.setColor(colours.discord.red)
            replyEmbed.setDescription('No embed message detected.')
            return await interaction.editReply({ embeds: [replyEmbed] });
        }
        const messageContent: string | undefined = messageEmbed.data.description;
        const fields: APIEmbedField[] = messageEmbed.fields;
        const hostExpression: RegExp = /\`Host:\` <@(\d+)>/;
        const trialTypeExpression: RegExp = /\`Type:\` (.+) Trial/;
        const trialeeExpression: RegExp = /\`Discord:\` <@(\d+)>/;
        const roleExpression: RegExp = /\`Tag:\` <@&(\d+)>/;
        let userId: string = '';
        let trialeeId: string = '';
        let trialType: string = '';
        let roleId: string = '';
        if (messageContent) {
            const hostMatches = messageContent.match(hostExpression);
            const trialeeMatches = messageContent.match(trialeeExpression);
            const trialTypeMatches = messageContent.match(trialTypeExpression);
            const roleMatches = messageContent.match(roleExpression);
            userId = hostMatches ? hostMatches[1] : '';
            trialeeId = trialeeMatches ? trialeeMatches[1] : '';
            trialType = trialTypeMatches ? trialTypeMatches[1] : '';
            roleId = roleMatches ? roleMatches[1] : '';
            if (!userId || !trialeeId || !roleId || !trialType) {
                // Should never really make it to this.
                replyEmbed.setColor(colours.discord.red)
                replyEmbed.setDescription('Host, Trialee, Trial Type or Tag could not be detected.')
                return await interaction.editReply({ embeds: [replyEmbed] });
            }
        }
        if (hasRolePermissions) {
            const hasElevatedRole = await this.client.util.hasRolePermissions(this.client, ['trialeeTeacher', 'trialHost', 'organizer', 'admin', 'owner'], interaction);
            if ((interaction.user.id === userId) || hasElevatedRole) {
                const splitResults = messageContent?.split('⬥');
                if (!splitResults) {
                    replyEmbed.setColor(colours.discord.red)
                    replyEmbed.setDescription(`Message could not be parsed correctly.`)
                    return await interaction.editReply({ embeds: [replyEmbed] });
                }
                const messageContentWithoutStarted = splitResults[0];
                const dirtyStarted = splitResults[1];
                const started = dirtyStarted?.replace('> **Team**', '').trim();
                const newMessageContent = `${messageContentWithoutStarted}⬥ ${started}\n⬥ <@${trialeeId}> ${trialType.includes('Mock') ? 'is not ready for trial' : 'failed'} <t:${this.currentTime}:R>!\n\n> **Team**`;

                // Save trial to database.
                await this.saveTrial(interaction, trialeeId, roleId, userId, fields);

                const resultChannelId = channels.mockResult;

                const resultChannel = await this.client.channels.fetch(resultChannelId) as TextChannel;

                const gemURL = interaction.fields.getTextInputValue('gemURL');
                const comments = interaction.fields.getTextInputValue('comments');

                const resultEmbed: EmbedBuilder = new EmbedBuilder();
                resultEmbed.setColor(colours.discord.red)
                resultEmbed.setDescription(`
                > **General**\n
                **Discord:** <@${trialeeId}>
                **Tag:** <@&${roleId}>
                ${trialType.includes('Mock') ? '**Ready for Trial:**' : '**Passed:**'} ❌\n
                ${comments ? `> **Notes**\n\n${comments}\n` : ''}
                > **Team**
                `)
                resultEmbed.setFields(fields)

                await resultChannel.send({
                    content: `> **${trialType.includes('Mock') ? 'Mock Trial' : 'Trial'} hosted by <@${userId}>** on <t:${this.currentTime}:D>`,
                    embeds: [resultEmbed],
                    allowedMentions: {
                        users: [],
                        roles: []
                    }
                });

                if (gemURL) {
                    await resultChannel.send({
                        content: gemURL,
                        allowedMentions: {
                            users: [],
                            roles: []
                        }
                    });
                };

                const newEmbed = new EmbedBuilder()
                    .setColor(colours.discord.red)
                    .setFields(fields)
                    .setDescription(`${newMessageContent}`);
                await interaction.message?.edit({ content: '', embeds: [newEmbed], components: [] });
                replyEmbed.setColor(colours.discord.green);
                replyEmbed.setDescription(`Trialee failed!`);
                return await interaction.editReply({ embeds: [replyEmbed] });
            } else {
                replyEmbed.setColor(colours.discord.red)
                replyEmbed.setDescription(`Only <@${userId}> or an elevated role can pass this trialee.`)
                return await interaction.editReply({ embeds: [replyEmbed] });
            }
        } else {
            this.client.logger.log(
                {
                    message: `Attempted restricted permissions. { command: Fail Trialee, user: ${interaction.user.username}, channel: ${interaction.channel} }`,
                    handler: this.constructor.name,
                },
                true
            );
            return await interaction.editReply({ content: 'You do not have permissions to run this command. This incident has been logged.' });
        }
    }
}