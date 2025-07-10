import BotInteraction from '../../types/BotInteraction';
import { ChatInputCommandInteraction, SlashCommandBuilder, User, Role, MessageFlags, APIRole, EmbedBuilder } from 'discord.js';
import { getRoles } from '../../GuildSpecifics';
import { MvpContributor } from '../../entity/MvpContributor';

export default class SetMvp extends BotInteraction {
    get name() {
        return 'set-mvp';
    }

    get description() {
        return 'Add a user to the MvP-List';
    }

    get permissions() {
        return 'ELEVATED_ROLE';
    }

    get addOrRemove() {
        const vals: any = {
            'Add': 'add',
            'Remove': 'remove',
        }
        const options: any = [];
        Object.keys(vals).forEach((key: string) => {
            options.push({ name: key, value: vals[key] })
        })
        return options;
    }

    get slashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addUserOption((option) => option.setName('user').setDescription('User').setRequired(true))
            .addRoleOption((option) => option.setName('role').setDescription('Their personal Vanity-Role').setRequired(true))
            .addStringOption((option) => option.setName('addremove').setDescription('Add or Remove this user from Mvps').addChoices(
                ...this.addOrRemove)
                .setRequired(true));
    }

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const userResponse: User = interaction.options.getUser('user', true);
        const role: APIRole | Role = interaction.options.getRole('role', true);
        const add = interaction.options.getString('addremove', true) === 'add';

        const { stripRole, colours } = this.client.util;
        const { dataSource } = this.client;
        const repository = dataSource.getRepository(MvpContributor);

        const mvpRole = stripRole(getRoles(interaction.guild?.id).mvp);
        const user = await interaction.guild?.members.fetch(userResponse.id);
        const userRoles = await user?.roles.cache.map(role => role.id) || [];

        const existingEntry = await repository.findOne({
            where: {
                guild: interaction.guild?.id,
                user: userResponse.id,
                role: role.id
            }
        });

        if (add) {
            //assign roles to user if not already
            if (!userRoles?.includes(role.id)) {
                user?.roles.add(role.id);
            }

            //check for base mvp role
            if (!userRoles?.includes(mvpRole)) {
                user?.roles.add(mvpRole);
            }

            //add to database
            if (!existingEntry) {
                const mvpContributor = new MvpContributor();
                mvpContributor.guild = interaction.guild!.id;
                mvpContributor.user = userResponse.id;
                mvpContributor.role = role.id;
                await repository.save(mvpContributor);
            }

            const response = new EmbedBuilder()
                .setTitle('Added successfully')
                .setColor(colours.discord.green)
                .setDescription(`<@${userResponse.id}> successfully added to MvP-Contributors.`);
            return await interaction.editReply({ embeds: [response] });
        } else {
            //remove roles from user if not already
            if (userRoles?.includes(role.id)) {
                user?.roles.remove(role.id);
            }

            if (userRoles?.includes(mvpRole)) {
                user?.roles.remove(mvpRole);
            }

            //remove from database
            if (existingEntry) {
                await repository.remove(existingEntry);
            }

            const response = new EmbedBuilder()
                .setTitle('Removed successfully')
                .setColor(colours.discord.green)
                .setDescription(`<@${userResponse.id}> successfully removed from MvP-Contributors.`);
            return await interaction.editReply({ embeds: [response] });
        }
    }
}
