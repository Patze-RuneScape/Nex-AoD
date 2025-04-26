import { StringSelectMenuInteraction, InteractionResponse, Message, EmbedBuilder, Role } from 'discord.js';
import Bot from '../Bot';

export default interface StringSelectHandler { client: Bot; id: string; interaction: StringSelectMenuInteraction }

export default class ModalHandler {
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
            default: break;
        }
    }

    get userId(): string {
        return this.interaction.user.id;
    }

    get currentTime(): number {
        return Math.round(Date.now() / 1000)
    }

    private async overrideColour(interaction: StringSelectMenuInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void>{
        await interaction.deferReply({ ephemeral: true });
        const selectedRole: string = interaction.values[0];
        const newColourRole: string = `colour_${selectedRole}`;
        const { roles, cosmeticCollectionRoleNames, cosmeticKcRoleNames, cosmeticTrialedRoleNames, colours, stripRole, categorize, hierarchy, getColourPanelComponents } = this.client.util;
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
                const hierarchyIdList = hierarchyList.map((item: string) => stripRole(roles[item]));
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
        if (!userRoles.includes(stripRole(roles[selectedRole])) && !hasHigherRole(selectedRole)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(colours.discord.red)
                .setDescription(`You need the ${roles[selectedRole]}-Tag to set this colour!`);
            return await interaction.editReply({ embeds: [errorEmbed] });
        }

        //remove all other colour-roles
        for (const cosmeticRole of cosmeticTrialedRoleNames){
            const colourRole = `colour_${cosmeticRole}`;
            if (colourRole === newColourRole){
                continue;
            }
            if (userRoles.includes(stripRole(roles[colourRole]))) {
                await user.roles.remove(stripRole(roles[colourRole]));
            }
        }

        for (const cosmeticRole of cosmeticCollectionRoleNames){
            const colourRole = `colour_${cosmeticRole}`;
            if (colourRole === newColourRole){
                continue;
            }
            if (userRoles.includes(stripRole(roles[colourRole]))) {
                await user.roles.remove(stripRole(roles[colourRole]));
            }
        }

        for (const cosmeticRole of cosmeticKcRoleNames){
            const colourRole = `colour_${cosmeticRole}`;
            if (colourRole === newColourRole){
                continue;
            }
            if (userRoles.includes(stripRole(roles[colourRole]))) {
                await user.roles.remove(stripRole(roles[colourRole]));
            }
        }

        //check if the role exists
        if (roles[newColourRole] == null){
            const errorEmbed = new EmbedBuilder()
                .setColor(colours.discord.red)
                .setDescription('The selected role does not exist!');
            return await interaction.editReply({ embeds: [errorEmbed] });
        }
        
        const colourRoleObject = await interaction.guild?.roles.fetch(stripRole(roles[newColourRole])) as Role;      

        //assign the colour-role to the user
        if (!userRoles.includes(stripRole(roles[newColourRole]))) {
            await user.roles.add(stripRole(roles[newColourRole]));
        }

        const resultEmbed = new EmbedBuilder()
            .setColor(colourRoleObject != null ? colourRoleObject?.color : colours.discord.green)
            .setDescription(`${roles[selectedRole]}-Colour successfully applied!`);
        return await interaction.editReply({ embeds: [resultEmbed] });
    }

    private async setChristmasOverrideSelect(interaction: StringSelectMenuInteraction<'cached'>): Promise<Message<true> | InteractionResponse<true> | void>{
        await interaction.deferReply({ ephemeral: true });
        const selectedRole: string = interaction.values[0];
        const { roles, christmasSantaRolesNames, colours, stripRole, getChristmasColourPanelComponents } = this.client.util;
        const user = await interaction.guild?.members.fetch(interaction.user.id);
        const userRoles = await user?.roles.cache.map(role => role.id) || [];

        //reset the StringSelectionMenu
        const getComps = getChristmasColourPanelComponents.bind(this.client.util)
        if (interaction.isMessageComponent()){
            await interaction.message.edit({ components: await getComps(interaction)});
        }
        //remove all other colour-roles
        for (const cosmeticRole of christmasSantaRolesNames){
            if (userRoles.includes(stripRole(roles[cosmeticRole]))) {
                await user.roles.remove(stripRole(roles[cosmeticRole]));
            }
        }
        //check if the role exists
        if (roles[selectedRole] == null){
            const errorEmbed = new EmbedBuilder()
                .setColor(colours.discord.red)
                .setDescription('The selected role does not exist!');
            return await interaction.editReply({ embeds: [errorEmbed] });
        }

        const colourRoleObject = await interaction.guild?.roles.fetch(stripRole(roles[selectedRole])) as Role;
        //assign the colour-role to the user
        if (!userRoles.includes(stripRole(roles[selectedRole]))) {
            await user.roles.add(stripRole(roles[selectedRole]));
        }
        const resultEmbed = new EmbedBuilder()
            .setColor(colourRoleObject != null ? colourRoleObject?.color : colours.discord.green)
            .setDescription(`${roles[selectedRole]}-Colour successfully applied!`);
        return await interaction.editReply({ embeds: [resultEmbed] });
    }
}
