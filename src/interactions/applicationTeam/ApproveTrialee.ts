import BotInteraction from '../../types/BotInteraction';
import { ChatInputCommandInteraction, SlashCommandBuilder, User, Role, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default class ApproveTrialee extends BotInteraction {
    get name() {
        return 'approve-trialee';
    }

    get description() {
        return 'Grants the Trialee role to an applicant.';
    }

    get permissions() {
        return 'APPLICATION_TEAM';
    }

    get slashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addUserOption((option) => option.setName('user').setDescription('User').setRequired(true))
    }

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });
        const userResponse: User = interaction.options.getUser('user', true);

        const { roles, colours, channels, stripRole } = this.client.util;

        const user = await interaction.guild?.members.fetch(userResponse.id);
        const userRoles = await user?.roles.cache.map(role => role.id) || [];

        const trialeeId = stripRole(roles.trialee);

        const roleObject = await interaction.guild?.roles.fetch(trialeeId) as Role;

        let sendMessage = false;
        if (!(userRoles?.includes(trialeeId))) {
            await user?.roles.add(trialeeId);
            sendMessage = true;
        }

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
            .setColor(roleObject.color || colours.discord.green)
            .setDescription(`
            ${roles.trialee} was assigned to <@${userResponse.id}> by <@${interaction.user.id}>.
            `);
        if (sendMessage) await logChannel.send({ embeds: [logEmbed], components: [buttonRow] });

        const replyEmbed = new EmbedBuilder()
            .setTitle(sendMessage ? 'Application successfully approved!' : 'Application approval failed.')
            .setColor(sendMessage ? colours.discord.green : colours.discord.red)
            .setDescription(sendMessage ? `
            **Member:** <@${userResponse.id}>
            ` : `This user already has this role.`);
        await interaction.editReply({ embeds: [replyEmbed] });
    }
}