import BotInteraction from '../../types/BotInteraction';
import { ChatInputCommandInteraction, SlashCommandBuilder, User, Role, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default class Trialed extends BotInteraction {
    get name() {
        return 'assign-trialed';
    }

    get description() {
        return 'Assigns a trialed role to a user';
    }

    get permissions() {
        return 'ELEVATED_ROLE';
    }

    get options() {
        const assignOptions: any = {
            'Magic Minion Tank': 'magicMT',
            'Magic Base': 'magicBase',
            'Range Minion Tank': 'rangeMT',
            'Range Base': 'rangeBase',
            'Range Hammer': 'chinner',
            'Magic/Range Minion Tank': 'mrMT',
            'Magic/Range Hammer': 'mrHammer',
            'Magic/Range Base': 'mrBase',
            'Necromancy Base': 'necroBase',
            'Necromancy Hammer': 'necroHammer',
            'Necromancy Minion Tank': 'necroMT',
            'Trial Team': 'trialTeam',
            'Trial Team Probation': 'trialTeamProbation',
        }
        const options: any = [];
        Object.keys(assignOptions).forEach((key: string) => {
            options.push({ name: key, value: assignOptions[key] })
        })
        return options;
    }

    get slashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addUserOption((option) => option.setName('user').setDescription('User').setRequired(true))
            .addStringOption((option) => option.setName('role').setDescription('Role').addChoices(
                ...this.options
            ).setRequired(true))
    }

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });
        const userResponse: User = interaction.options.getUser('user', true);
        const role: string = interaction.options.getString('role', true);

        const { roles, colours, channels, stripRole } = this.client.util;

        const channel = await this.client.channels.fetch(channels.achievementsAndLogs) as TextChannel;

        const user = await interaction.guild?.members.fetch(userResponse.id);
        const userRoles = await user?.roles.cache.map(role => role.id) || [];

        let sendMessage = false;
        let sendPublic = true;
        const roleObject = await interaction.guild?.roles.fetch(stripRole(roles[role])) as Role;
        let embedColour = colours.discord.green;

        const roleId = stripRole(roles[role]);
        await user?.roles.add(roleId);
        embedColour = roleObject.color;
        if (!(userRoles?.includes(roleId))) {
            sendMessage = true;
        }

        // Don't send in public achievement channel if tt probation
        if (roleId == stripRole(roles.trialTeamProbation)){
            sendPublic = false;
        }

        // Remove trialee
        if (userRoles?.includes(stripRole(roles.trialee))) {
            await user?.roles.remove(stripRole(roles.trialee));
        }

        // Add 7-Man tag
        if (!userRoles?.includes(stripRole(roles.sevenMan))) {
            await user?.roles.add(stripRole(roles.sevenMan));
        }

        // Remove tt probation if adding tt
        if (roleId == stripRole(roles.trialTeam)
            && userRoles?.includes(stripRole(roles.trialTeamProbation))) {
            await user?.roles.remove(stripRole(roles.trialTeamProbation));
        }

        let returnedMessage = {
            id: '',
            url: ''
        };

        const embed = new EmbedBuilder()
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() || this.client.user?.avatarURL() || 'https://cdn.discordapp.com/attachments/1027186342620299315/1054206984360050709/445px-Reeves_pet.png' })
            .setTimestamp()
            .setColor(embedColour)
            .setDescription(`Congratulations to <@${userResponse.id}> on achieving ${roles[role]}!`);
        if (sendMessage && channel && sendPublic) await channel.send({ embeds: [embed] }).then(message => {
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
            .setDescription(channel ? `
            ${roles[role]} was assigned to <@${userResponse.id}> by <@${interaction.user.id}>.
            **Message**: [${returnedMessage.id}](${returnedMessage.url})
            ` : `${roles[role]} was assigned to <@${userResponse.id}> by <@${interaction.user.id}>.`);
        if (sendMessage) await logChannel.send({ embeds: [logEmbed], components: [buttonRow] });

        const replyEmbed = new EmbedBuilder()
            .setTitle(sendMessage ? 'Role successfully assigned!' : 'Role assign failed.')
            .setColor(sendMessage ? colours.discord.green : colours.discord.red)
            .setDescription(sendMessage ? `
            **Member:** <@${userResponse.id}>
            **Role:** ${roles[role]}
            ` : `This user either has this role, or a higher level role.`);
        await interaction.editReply({ embeds: [replyEmbed] });
    }
}