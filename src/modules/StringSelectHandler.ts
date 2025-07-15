import { StringSelectMenuInteraction, InteractionResponse, Message, EmbedBuilder, Role, MessageFlags } from 'discord.js';
import Bot from '../Bot';
import { getRoles } from '../GuildSpecifics';

export default interface StringSelectHandler { client: Bot; id: string; interaction: StringSelectMenuInteraction }

export default class StringSelectHandler {
    constructor(client: Bot, id: string, interaction: StringSelectMenuInteraction<'cached'>) {
        this.client = client;
        this.id = id;
        this.interaction = interaction;
        switch (id) {
            case 'colourOverrideSelect':
            case 'colourOverrideSelect2':
            case 'colourOverrideSelect3':
                this.overrideColour(interaction); break;
	        case 'christmasColourOverrideSelect':
                this.setChristmasOverrideSelect(interaction); break;
            default:
                if (id.startsWith('selfassign')) {
                    this.handleSelfAssign(interaction);
                }
                break;
        }
    }

    get userId(): string {
        return this.interaction.user.id;
    }

    get currentTime(): number {
        return Math.round(Date.now() / 1000)
    }

    private async overrideColour(interaction: StringSelectMenuInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void>{
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const selectedRole: string = interaction.values[0];
        const newColourRole: string = `colour_${selectedRole}`;
        const { cosmeticCollectionRoleNames, cosmeticKcRoleNames, cosmeticTrialedRoleNames, colours, stripRole, categorize, hierarchy, getColourPanelComponents } = this.client.util;
        const user = await interaction.guild?.members.fetch(interaction.user.id);
        const userRoles = await user?.roles.cache.map(role => role.id) || [];

        //reset the StringSelectionMenu
        const getComps = getColourPanelComponents.bind(this.client.util)
        if (interaction.isMessageComponent()){
            await interaction.message.edit({ components: await getComps(interaction)});
        }

        //if user has not the tag but tag belongs to hierarchy tags check for an higher hierarchy tag
        const hasHigherRole = (role: string) => {
            try {
                if (!categorize(role) || categorize(role) === 'vanity' || categorize(role) === '') return false;
                const categorizedHierarchy = hierarchy[categorize(role)];
                const sliceFromIndex: number = categorizedHierarchy.indexOf(role) + 1;
                const hierarchyList = categorizedHierarchy.slice(sliceFromIndex);
                const hierarchyIdList = hierarchyList.map((item: string) => stripRole(getRoles(interaction.guild.id)[item]));
                const intersection = hierarchyIdList.filter((roleId: string) => userRoles.includes(roleId));
                if (intersection.length === 0) {
                    return false
                } else {
                    return true
                };
            }
            catch (err) { return false }
        }

        //check if the user has the needed tag
        if (!userRoles.includes(stripRole(getRoles(interaction.guild.id)[selectedRole])) && !hasHigherRole(selectedRole)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(colours.discord.red)
                .setDescription(`You need the ${getRoles(interaction.guild.id)[selectedRole]}-Tag to set this colour!`);
            return await interaction.editReply({ embeds: [errorEmbed] });
        }

        //remove all other colour-roles
        for (const cosmeticRole of cosmeticTrialedRoleNames){
            const colourRole = `colour_${cosmeticRole}`;
            if (colourRole === newColourRole){
                continue;
            }
            if (userRoles.includes(stripRole(getRoles(interaction.guild.id)[colourRole]))) {
                await user.roles.remove(stripRole(getRoles(interaction.guild.id)[colourRole]));
            }
        }

        for (const cosmeticRole of cosmeticCollectionRoleNames){
            const colourRole = `colour_${cosmeticRole}`;
            if (colourRole === newColourRole){
                continue;
            }
            if (userRoles.includes(stripRole(getRoles(interaction.guild.id)[colourRole]))) {
                await user.roles.remove(stripRole(getRoles(interaction.guild.id)[colourRole]));
            }
        }

        for (const cosmeticRole of cosmeticKcRoleNames){
            const colourRole = `colour_${cosmeticRole}`;
            if (colourRole === newColourRole){
                continue;
            }
            if (userRoles.includes(stripRole(getRoles(interaction.guild.id)[colourRole]))) {
                await user.roles.remove(stripRole(getRoles(interaction.guild.id)[colourRole]));
            }
        }

        //check if the role exists
        if (getRoles(interaction.guild.id)[newColourRole] == null){
            const errorEmbed = new EmbedBuilder()
                .setColor(colours.discord.red)
                .setDescription('The selected role does not exist!');
            return await interaction.editReply({ embeds: [errorEmbed] });
        }

        const colourRoleObject = await interaction.guild?.roles.fetch(stripRole(getRoles(interaction.guild.id)[newColourRole])) as Role;

        //assign the colour-role to the user
        if (!userRoles.includes(stripRole(getRoles(interaction.guild.id)[newColourRole]))) {
            await user.roles.add(stripRole(getRoles(interaction.guild.id)[newColourRole]));
        }

        const resultEmbed = new EmbedBuilder()
            .setColor(colourRoleObject != null ? colourRoleObject?.color : colours.discord.green)
            .setDescription(`${getRoles(interaction.guild.id)[selectedRole]}-Colour successfully applied!`);
        return await interaction.editReply({ embeds: [resultEmbed] });
    }

    private async setChristmasOverrideSelect(interaction: StringSelectMenuInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void>{
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const selectedRole: string = interaction.values[0];
        const { christmasSantaRolesNames, colours, stripRole, getChristmasColourPanelComponents } = this.client.util;
        const user = await interaction.guild?.members.fetch(interaction.user.id);
        const userRoles = await user?.roles.cache.map(role => role.id) || [];

        //reset the StringSelectionMenu
        const getComps = getChristmasColourPanelComponents.bind(this.client.util)
        if (interaction.isMessageComponent()){
            await interaction.message.edit({ components: await getComps(interaction)});
        }
        //remove all other colour-roles
        for (const cosmeticRole of christmasSantaRolesNames){
            if (userRoles.includes(stripRole(getRoles(interaction.guild.id)[cosmeticRole]))) {
                await user.roles.remove(stripRole(getRoles(interaction.guild.id)[cosmeticRole]));
            }
        }
        //check if the role exists
        if (getRoles(interaction.guild.id)[selectedRole] == null){
            const errorEmbed = new EmbedBuilder()
                .setColor(colours.discord.red)
                .setDescription('The selected role does not exist!');
            return await interaction.editReply({ embeds: [errorEmbed] });
        }

        const colourRoleObject = await interaction.guild?.roles.fetch(stripRole(getRoles(interaction.guild.id)[selectedRole])) as Role;
        //assign the colour-role to the user
        if (!userRoles.includes(stripRole(getRoles(interaction.guild.id)[selectedRole]))) {
            await user.roles.add(stripRole(getRoles(interaction.guild.id)[selectedRole]));
        }
        const resultEmbed = new EmbedBuilder()
            .setColor(colourRoleObject != null ? colourRoleObject?.color : colours.discord.green)
            .setDescription(`${getRoles(interaction.guild.id)[selectedRole]}-Colour successfully applied!`);
        return await interaction.editReply({ embeds: [resultEmbed] });
    }

    private async handleSelfAssign(interaction: StringSelectMenuInteraction<'cached'>) : Promise<Message<true> | InteractionResponse<true> | void> {
        interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const { colours, categorize, stripRole, hierarchy } = this.client.util;
        const user = await interaction.guild?.members.fetch(interaction.user.id);
        const userRoles = await user?.roles.cache.map(role => role.id) || [];

        const selectedRole: string = interaction.values[0];

        //reset the StringSelectionMenu
        const container = interaction.message.components;
        if (interaction.isMessageComponent()){
            await interaction.message.edit({ components: container});
        }

        //parse the id <role>{;<neededRole>;<neededRole>}
        //first id has always the 'to-be-assigned'-Role, ids after are check-roles if user has sufficient tag
        const roleIds: string[] = selectedRole.split(";");
        let roleReqError: string = "";
        const addResultEmbed = new EmbedBuilder()
            .setColor(colours.discord.green)
            .setDescription(`<@&${roleIds[0]}> successfully applied.`);

        const removeResultEmbed = new EmbedBuilder()
            .setColor(colours.discord.green)
            .setDescription(`<@&${roleIds[0]}> successfully removed.`);

        //Blacklist tags that are able to change roles
        const roleObject = interaction.guild.roles.cache.get(roleIds[0]);

        if (roleObject?.permissions.has('ManageRoles')) {
            return await interaction.editReply({embeds: [new EmbedBuilder()
                .setColor(colours.discord.red)
                .setDescription(`Unallowed Role-Assign!`)]});
        }

        //todo - cleanup all other cosmetic tags

        //remove should always work
        if (userRoles.includes(roleIds[0])) {
            await user.roles.remove(roleIds[0]);
            return await interaction.editReply({embeds: [removeResultEmbed]});
        } else if (roleIds.length == 1) {
            //if it's only assign, just do it
            if (!userRoles.includes(roleIds[0])) {
                await user.roles.add(roleIds[0]);
                return await interaction.editReply({embeds: [addResultEmbed]});
            }
        } else if (roleIds.length > 1) {
            //special logic for hierarchy tags
            const hasRoleOrHigher = (role: string) => {
                try {
                    if (!categorize(role) || categorize(role) === 'vanity' || categorize(role) === '') return false;
                    const categorizedHierarchy = hierarchy[categorize(role)];
                    const sliceFromIndex: number = categorizedHierarchy.indexOf(role);
                    const hierarchyList = categorizedHierarchy.slice(sliceFromIndex);
                    const hierarchyIdList = hierarchyList.map((item: string) => stripRole(getRoles(interaction.guild.id)[item]));
                    const intersection = hierarchyIdList.filter((roleId: string) => userRoles.includes(roleId));
                    if (intersection.length === 0) {
                        return false
                    } else {
                        return true
                    };
                }
                catch (err) { return false }
            }

            //check for required tags
            for (let i = 1; i < roleIds.length; i++) {
                if (!/^[+-]?\d+(\.\d+)?$/.test(roleIds[i])) {
                    if (hasRoleOrHigher(roleIds[i])) {
                        await user.roles.add(roleIds[0]);
                        return await interaction.editReply({embeds: [addResultEmbed]});
                    } else {
                        if (i > 1) {
                            roleReqError += ", ";
                        }

                        roleReqError += getRoles(interaction.guild.id)[roleIds[i]];
                    }
                } else {
                    if (userRoles.includes(roleIds[i])) {
                        await user.roles.add(roleIds[0]);
                        return await interaction.editReply({embeds: [addResultEmbed]});
                    }
                    if (i > 1) {
                        roleReqError += ", ";
                    }

                    roleReqError += `<@&${roleIds[i]}>`;
                    }
            }

            const errorEmbed = new EmbedBuilder()
                .setColor(colours.discord.red)
                .setDescription(`You need any of the following tags to set this colour!\nTags:${roleReqError}`);
            return await interaction.editReply({ embeds: [errorEmbed] });
        }

        return interaction.editReply("somehow i did nothing?");
    }
}
