import BotInteraction from '../../types/BotInteraction';
import { ChatInputCommandInteraction, SlashCommandBuilder, Role, MessageFlags, APIRole, GuildMember } from 'discord.js';

export default class RoleToRole extends BotInteraction {
    get name() {
        return 'role-to-role';
    }

    get description() {
        return 'Assigns everyone with a specific role a new role and removes the old one';
    }

    get permissions() {
        return 'ORGANIZER';
    }

    get slashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addRoleOption((option) => option.setName('sourcerole').setDescription('Source Role').setRequired(true))
            .addRoleOption((option) => option.setName('targetrole').setDescription('Target Role').setRequired(true));
    }

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const sourceRole: APIRole | Role = interaction.options.getRole('sourcerole', true);
        const targetRole: APIRole | Role = interaction.options.getRole('targetrole', true);

        await interaction.guild?.roles.fetch();
        await interaction.guild?.members.fetch();

        const role = await interaction.guild?.roles.cache.get(sourceRole.id);

        const membersWithRole: GuildMember[] = role?.members.map(member => member) ?? [];

        for (let index = 0; index < membersWithRole.length; index++) {
            const user = membersWithRole[index];
            const userRoles = await user?.roles.cache.map(role => role.id) || [];

            if (!userRoles?.includes(targetRole.id)) {
                await user.roles.add(targetRole.id);
            }

            await user.roles.remove(sourceRole.id);
        }

        await interaction.editReply(`Assigned <@&${targetRole.id}> to ${membersWithRole.length} Users and removed <@&${sourceRole.id}>`);
    }
}
