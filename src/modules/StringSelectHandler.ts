import { StringSelectMenuInteraction, InteractionResponse, Message, EmbedBuilder, Role, MessageFlags } from 'discord.js';
import Bot from '../Bot';
import { getRoles } from '../GuildSpecifics';

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
}
