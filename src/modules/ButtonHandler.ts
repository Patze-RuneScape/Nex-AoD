import { ActionRowBuilder, APIEmbedField, ButtonBuilder, ButtonInteraction, ButtonStyle, Embed, EmbedBuilder, InteractionResponse, Message, ModalActionRowComponentBuilder, ModalBuilder, TextChannel, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Trial } from '../entity/Trial';
import { TrialParticipation } from '../entity/TrialParticipation';
import Bot from '../Bot';
import { getRoles } from '../GuildSpecifics';

export default interface ButtonHandler { client: Bot; id: string; interaction: ButtonInteraction }

export default class ButtonHandler {
    constructor(client: Bot, id: string, interaction: ButtonInteraction<'cached'>) {
        this.client = client;
        this.id = id;
        this.interaction = interaction;
        switch (id) {
            case 'rejectRoleAssign': this.rejectRoleAssign(interaction); break;
            case 'passTrialee': this.passTrialee(interaction); break;
            case 'failTrialee': this.failTrialee(interaction); break;
            case 'selectBase': this.selectBase(interaction); break;
            case 'selectHammer': this.selectHammer(interaction); break;
            case 'selectFree': this.selectFree(interaction); break;
            case 'selectUmbra': this.selectUmbra(interaction); break;
            case 'selectGlacies': this.selectGlacies(interaction); break;
            case 'selectCruor': this.selectCruor(interaction); break;
            case 'selectFumus': this.selectFumus(interaction); break;
            case 'disbandTrial': this.disbandTrial(interaction); break;
            case 'startTrial': this.startTrial(interaction); break;
            case 'removeColour': this.removeColour(interaction); break;
	        case 'removeChristmasColour': this.removeChristmasColour(interaction); break;
            default: break;
        }
    }

    get userId(): string {
        return this.interaction.user.id;
    }

    get currentTime(): number {
        return Math.round(Date.now() / 1000)
    }

    public async saveTrial(interaction: ButtonInteraction<'cached'>, trialeeId: string, roleId: string, userId: string, fields: APIEmbedField[]): Promise<void> {
        // Create new Trial.
        const { dataSource } = this.client;
        const trialRepository = dataSource.getRepository(Trial);
        const trialObject = new Trial();
        trialObject.trialee = trialeeId;
        trialObject.host = userId;
        trialObject.role = roleId;
        trialObject.link = interaction.message.url;
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

    public async handleRoleSelection(interaction: ButtonInteraction<'cached'>, roleString: string): Promise<Message<true> | InteractionResponse<true> | void> {

        const { colours, checkForUserId, getEmptyObject, getTeamCount } = this.client.util;

        await interaction.deferReply({ ephemeral: true });
        const hasRolePermissions = await this.client.util.hasRolePermissions(this.client, ['trialTeamProbation', 'trialTeam', 'organizer', 'admin'], interaction);
        if (hasRolePermissions) {
            const messageEmbed = interaction.message.embeds[0];
            const messageContent = messageEmbed.data.description;
            const fields = messageEmbed.fields;
            const existingRole = checkForUserId(`<@${interaction.user.id}>`, fields);
            const replyEmbed = new EmbedBuilder();
            if (existingRole) {
                const { obj: role, index } = existingRole;
                if (role.name.includes(roleString)) {
                    fields[index].value = '`Empty`';
                    replyEmbed.setColor(colours.discord.green).setDescription(`Successfully unassigned from **${roleString}**.`);
                } else {
                    replyEmbed.setColor(colours.discord.red).setDescription('You are signed up as a different role. Unassign from that role first.');
                }
            } else {
                const firstEmptyObject = getEmptyObject(roleString, fields);
                if (firstEmptyObject) {
                    const { index } = firstEmptyObject;
                    const isProbation = await this.client.util.hasRolePermissions(this.client, ['trialTeamProbation'], interaction)

                    if (isProbation){
                        fields[index].value = `<@${interaction.user.id}> (Probation)`;
                    } else {
                        fields[index].value = `<@${interaction.user.id}>`;
                    }

                    replyEmbed.setColor(colours.discord.green).setDescription(`Successfully assigned to **${roleString}**.`);
                } else {
                    replyEmbed.setColor(colours.discord.red).setDescription(`**${roleString}** is already taken.`);
                }
            }
            const newEmbed = new EmbedBuilder()
                .setColor(messageEmbed.color)
                .setDescription(`${messageContent}`)
                .setFields(fields)
                .setFooter({ text: `${getTeamCount(fields)}/7 Players` });
            await interaction.message.edit({ embeds: [newEmbed] })
            return await interaction.editReply({ embeds: [replyEmbed] });
        } else {
            this.client.logger.log(
                {
                    message: `Attempted restricted permissions. { command: Select ${roleString} Role, user: ${interaction.user.username}, channel: ${interaction.channel} }`,
                    handler: this.constructor.name,
                },
                true
            );
            return await interaction.editReply({ content: 'You do not have permissions to run this command. This incident has been logged.' });
        }
    }

    private async selectBase(interaction: ButtonInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void> {
        await this.handleRoleSelection(interaction, 'Base');
    }

    private async selectHammer(interaction: ButtonInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void> {
        await this.handleRoleSelection(interaction, 'Hammer');
    }

    private async selectFree(interaction: ButtonInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void> {
        await this.handleRoleSelection(interaction, 'Free');
    }

    private async selectUmbra(interaction: ButtonInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void> {
        await this.handleRoleSelection(interaction, 'Umbra');
    }

    private async selectGlacies(interaction: ButtonInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void> {
        await this.handleRoleSelection(interaction, 'Glacies');
    }

    private async selectCruor(interaction: ButtonInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void> {
        await this.handleRoleSelection(interaction, 'Cruor');
    }

    private async selectFumus(interaction: ButtonInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void> {
        await this.handleRoleSelection(interaction, 'Fumus');
    }

    private async rejectRoleAssign(interaction: ButtonInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void> {
        await interaction.deferReply({ ephemeral: true });

        const { hasOverridePermissions, hasRolePermissions } = this.client.util;

        const rolePermissions = await hasRolePermissions(this.client, ['organizer', 'admin', 'owner'], interaction);
        const overridePermissions = await hasOverridePermissions(interaction, 'assign');

        if (rolePermissions || overridePermissions) {
            const messageEmbed = interaction.message.embeds[0];
            const messageContent = messageEmbed.data.description;
            const oldTimestamp = messageEmbed.timestamp ? new Date(messageEmbed.timestamp) : new Date();
            const newEmbed = new EmbedBuilder()
                .setTimestamp(oldTimestamp)
                .setColor(messageEmbed.color)
                .setDescription(`${messageContent}\n\n> Role Rejected by <@${this.userId}> <t:${this.currentTime}:R>.`);
            const assignedRoles = messageContent?.match(/<@&\d*\>/gm)?.map(unstrippedRole => this.client.util.stripRole(unstrippedRole));
            const userIdRegex = messageContent?.match(/to <@\d*\>/gm);
            const messageIdRegex = messageContent?.match(/\[\d*\]/gm)
            let dirtyUserId;
            let dirtyMessageId;
            if (!assignedRoles) return;
            if (userIdRegex) dirtyUserId = userIdRegex[0];
            if (messageIdRegex) dirtyMessageId = messageIdRegex[0];
            if (dirtyUserId) {
                const userId = dirtyUserId.slice(5, -1);
                const user = await interaction.guild?.members.fetch(userId);
                for await (const assignedId of assignedRoles) {
                    await user.roles.remove(assignedId);
                };
            }
            if (dirtyMessageId && messageContent) {
                try {
                    const messageId = dirtyMessageId.slice(1, -1);
                    const channelId = messageContent.split('/channels/')[1].split('/')[1];
                    const channel = await interaction.guild.channels.fetch(channelId) as TextChannel;
                    const message = await channel.messages.fetch(messageId);
                    await message.delete();
                }
                catch (err) { }
            }
            await interaction.message.edit({ embeds: [newEmbed], components: [] })
            const replyEmbed = new EmbedBuilder()
                .setColor(this.client.util.colours.discord.green)
                .setDescription('Role successfully rejected!');
            return await interaction.editReply({ embeds: [replyEmbed] });
        } else {
            this.client.logger.log(
                {
                    message: `Attempted restricted permissions. { command: Reject Role Assign, user: ${interaction.user.username}, channel: ${interaction.channel} }`,
                    handler: this.constructor.name,
                },
                true
            );
            return await interaction.editReply({ content: 'You do not have permissions to run this command. This incident has been logged.' });
        }
    }

    private async passTrialee(interaction: ButtonInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void> {

        const { hasOverridePermissions, hasRolePermissions } = this.client.util;

        const rolePermissions = await hasRolePermissions(this.client, ['trialHost', 'organizer', 'admin', 'owner'], interaction);
        const overridePermissions = await hasOverridePermissions(interaction, 'assign');

        if (rolePermissions || overridePermissions) {
            const modal = new ModalBuilder()
                .setCustomId('passTrialee')
                .setTitle('Pass Trialee');

            // Create the text input components
            const gemURL = new TextInputBuilder()
                .setCustomId('gemURL')
                .setLabel("Challenge Gem URL")
                .setStyle(TextInputStyle.Short)
                .setRequired(false);

            const comments = new TextInputBuilder()
                .setCustomId('comments')
                .setLabel("Comments")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false);

            const firstActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(gemURL);
            const secondActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(comments);

            // Add inputs to the modal
            modal.addComponents(firstActionRow, secondActionRow);

            // Show the modal to the user
            await interaction.showModal(modal);
        } else {
            await interaction.deferReply({ ephemeral: true });
            this.client.logger.log(
                {
                    message: `Attempted restricted permissions. { command: Pass Trialee, user: ${interaction.user.username}, channel: ${interaction.channel} }`,
                    handler: this.constructor.name,
                },
                true
            );
            return await interaction.editReply({ content: 'You do not have permissions to run this command. This incident has been logged.' });
        }
    }

    private async disbandTrial(interaction: ButtonInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void> {
        const { colours } = this.client.util;
        await interaction.deferReply({ ephemeral: true });
        const hasRolePermissions: boolean | undefined = await this.client.util.hasRolePermissions(this.client, ['trialHost', 'organizer', 'admin', 'owner'], interaction);
        const messageEmbed: Embed = interaction.message.embeds[0];
        const messageContent: string | undefined = messageEmbed.data.description;
        const expression: RegExp = /\`Host:\` <@(\d+)>/;
        const replyEmbed: EmbedBuilder = new EmbedBuilder();
        let userId: string = '';
        if (messageContent) {
            const matches = messageContent.match(expression);
            userId = matches ? matches[1] : '';
            if (!userId) {
                // Should never really make it to this.
                replyEmbed.setColor(colours.discord.red)
                replyEmbed.setDescription('Host could not be detected.')
                return await interaction.editReply({ embeds: [replyEmbed] });
            }
        }
        if (hasRolePermissions) {
            const hasElevatedRole = await this.client.util.hasRolePermissions(this.client, ['trialHost', 'organizer', 'admin', 'owner'], interaction);
            if ((interaction.user.id === userId) || hasElevatedRole) {
                const newMessageContent = messageContent?.replace('> **Team**', '');
                const newEmbed = new EmbedBuilder()
                    .setColor(messageEmbed.color)
                    .setDescription(`${newMessageContent}> Trial disbanded <t:${this.currentTime}:R>.`);
                await interaction.message.edit({ content: '', embeds: [newEmbed], components: [] });
                replyEmbed.setColor(colours.discord.green);
                replyEmbed.setDescription(`Trial successfully disbanded!`);
                return await interaction.editReply({ embeds: [replyEmbed] });
            } else {
                replyEmbed.setColor(colours.discord.red)
                replyEmbed.setDescription(`Only <@${userId}> or an elevated role can disband this trial.`)
                return await interaction.editReply({ embeds: [replyEmbed] });
            }
        } else {
            this.client.logger.log(
                {
                    message: `Attempted restricted permissions. { command: Disband Trial, user: ${interaction.user.username}, channel: ${interaction.channel} }`,
                    handler: this.constructor.name,
                },
                true
            );
            return await interaction.editReply({ content: 'You do not have permissions to run this command. This incident has been logged.' });
        }
    }

    private async startTrial(interaction: ButtonInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void> {
        const { colours, isTeamFull } = this.client.util; // Add isTeamFull if team full is required again.
        await interaction.deferReply({ ephemeral: true });
        const hasRolePermissions: boolean | undefined = await this.client.util.hasRolePermissions(this.client, ['trialHost', 'organizer', 'admin', 'owner'], interaction);
        const messageEmbed: Embed = interaction.message.embeds[0];
        const messageContent: string | undefined = messageEmbed.data.description;
        const fields: APIEmbedField[] = messageEmbed.fields;
        const expression: RegExp = /\`Host:\` <@(\d+)>/;
        const replyEmbed: EmbedBuilder = new EmbedBuilder();
        let userId: string = '';
        if (messageContent) {
            const matches = messageContent.match(expression);
            userId = matches ? matches[1] : '';
            if (!userId) {
                // Should never really make it to this.
                replyEmbed.setColor(colours.discord.red)
                replyEmbed.setDescription('Host could not be detected.')
                return await interaction.editReply({ embeds: [replyEmbed] });
            }
        }
        if (hasRolePermissions) {
            const hasElevatedRole = await this.client.util.hasRolePermissions(this.client, ['trialHost', 'organizer', 'admin', 'owner'], interaction);
            if ((interaction.user.id === userId) || hasElevatedRole) {
                if (isTeamFull(fields)) {
                    const trialStarted = `> **Moderation**\n\n ⬥ Trial started <t:${this.currentTime}:R>.\n\n> **Team**`;
                    const newMessageContent = messageContent?.replace('> **Team**', trialStarted);
                    const newEmbed = new EmbedBuilder()
                        .setColor(messageEmbed.color)
                        .setFields(fields)
                        .setDescription(`${newMessageContent}`);
                    const controlPanel = new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('passTrialee')
                                .setLabel('Pass')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId('failTrialee')
                                .setLabel('Fail')
                                .setStyle(ButtonStyle.Danger)
                        );
                    await interaction.message.edit({ content: '', embeds: [newEmbed], components: [controlPanel] });
                    replyEmbed.setColor(colours.discord.green);
                    replyEmbed.setDescription(`Trial successfully started!`);
                    return await interaction.editReply({ embeds: [replyEmbed] });
                } else {
                    replyEmbed.setColor(colours.discord.red)
                    replyEmbed.setDescription(`The team is not full yet.`)
                    return await interaction.editReply({ embeds: [replyEmbed] });
                }
            } else {
                replyEmbed.setColor(colours.discord.red)
                replyEmbed.setDescription(`Only <@${userId}> or an elevated role can start this trial.`)
                return await interaction.editReply({ embeds: [replyEmbed] });
            }
        } else {
            this.client.logger.log(
                {
                    message: `Attempted restricted permissions. { command: Start Trial, user: ${interaction.user.username}, channel: ${interaction.channel} }`,
                    handler: this.constructor.name,
                },
                true
            );
            return await interaction.editReply({ content: 'You do not have permissions to run this command. This incident has been logged.' });
        }
    }

    private async failTrialee(interaction: ButtonInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void> {
        const { hasOverridePermissions, hasRolePermissions } = this.client.util;

        const rolePermissions = await hasRolePermissions(this.client, ['trialHost', 'organizer', 'admin', 'owner'], interaction);
        const overridePermissions = await hasOverridePermissions(interaction, 'assign');

        if (rolePermissions || overridePermissions) {
            const modal = new ModalBuilder()
                .setCustomId('failTrialee')
                .setTitle('Fail Trialee');

            // Create the text input components
            const gemURL = new TextInputBuilder()
                .setCustomId('gemURL')
                .setLabel("Challenge Gem URL")
                .setStyle(TextInputStyle.Short)
                .setRequired(false);

            const comments = new TextInputBuilder()
                .setCustomId('comments')
                .setLabel("Comments")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false);

            const firstActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(gemURL);
            const secondActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(comments);

            // Add inputs to the modal
            modal.addComponents(firstActionRow, secondActionRow);

            // Show the modal to the user
            await interaction.showModal(modal);
        } else {
            await interaction.deferReply({ ephemeral: true });
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

    private async removeColour(interaction: ButtonInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void> {
        await interaction.deferReply({ ephemeral: true });

        const { cosmeticCollectionRoleNames, cosmeticKcRoleNames, cosmeticTrialedRoleNames, colours, stripRole } = this.client.util;
        const user = await interaction.guild?.members.fetch(interaction.user.id);
        const userRoles = await user?.roles.cache.map(role => role.id) || [];

        //remove all other colour-roles
        for (const cosmeticRole of cosmeticTrialedRoleNames){
            const colourRole = `colour_${cosmeticRole}`;
            
            if (userRoles.includes(stripRole(getRoles(interaction.guild.id)[colourRole]))) {
                await user.roles.remove(stripRole(getRoles(interaction.guild.id)[colourRole]));
            }
        }

        for (const cosmeticRole of cosmeticCollectionRoleNames){
            const colourRole = `colour_${cosmeticRole}`;
            
            if (userRoles.includes(stripRole(getRoles(interaction.guild.id)[colourRole]))) {
                await user.roles.remove(stripRole(getRoles(interaction.guild.id)[colourRole]));
            }
        }

        for (const cosmeticRole of cosmeticKcRoleNames){
            const colourRole = `colour_${cosmeticRole}`;
            
            if (userRoles.includes(stripRole(getRoles(interaction.guild.id)[colourRole]))) {
                await user.roles.remove(stripRole(getRoles(interaction.guild.id)[colourRole]));
            }
        }

        const resultEmbed = new EmbedBuilder()
            .setColor(colours.discord.green)
            .setDescription('Roles successfully removed!');
        return await interaction.editReply({ embeds: [resultEmbed] });
    }

    private async removeChristmasColour(interaction: ButtonInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void> {
        await interaction.deferReply({ ephemeral: true });
        const { christmasSantaRolesNames, colours, stripRole } = this.client.util;
        const user = await interaction.guild?.members.fetch(interaction.user.id);
        const userRoles = await user?.roles.cache.map(role => role.id) || [];
        //remove all other colour-roles
        for (const cosmeticRole of christmasSantaRolesNames){
            if (userRoles.includes(stripRole(getRoles(interaction.guild.id)[cosmeticRole]))) {
                await user.roles.remove(stripRole(getRoles(interaction.guild.id)[cosmeticRole]));
            }
        }
        const resultEmbed = new EmbedBuilder()
            .setColor(colours.discord.green)
            .setDescription('Roles successfully removed!');
        return await interaction.editReply({ embeds: [resultEmbed] });
    }
}
