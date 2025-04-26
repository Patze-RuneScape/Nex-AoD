import BotInteraction from '../../types/BotInteraction';
import { ChatInputCommandInteraction, SlashCommandBuilder, User, Role, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

interface RemoveHierarchy {
    [key: string]: string[];
}
export default class Cosmetic extends BotInteraction {
    get name() {
        return 'assign-cosmetic';
    }

    get description() {
        return 'Assigns a Cosmetic role to a user';
    }

    get permissions() {
        return 'ELEVATED_ROLE';
    }

    get removeHierarchy(): RemoveHierarchy {
        return {
            'kc20k': ['kc10k'],
            'kc30k': ['kc10k', 'kc20k'],
            'kc40k': ['kc10k', 'kc20k', 'kc30k'],
            'kc50k': ['kc10k', 'kc20k', 'kc30k', 'kc40k'],
            'kc60k': ['kc10k', 'kc20k', 'kc30k', 'kc40k', 'kc50k'],
            'kc70k': ['kc10k', 'kc20k', 'kc30k', 'kc40k', 'kc50k', 'kc60k'],
            'kc80k': ['kc10k', 'kc20k', 'kc30k', 'kc40k', 'kc50k', 'kc60k', 'kc70k'],
            'kc90k': ['kc10k', 'kc20k', 'kc30k', 'kc40k', 'kc50k', 'kc60k', 'kc70k', 'kc80k'],
            'kc100k': ['kc10k', 'kc20k', 'kc30k', 'kc40k', 'kc50k', 'kc60k', 'kc70k', 'kc80k', 'kc90k'],
            'goldenPraesul': ['ofThePraesul']
        }
    }

    get options() {
        const assignOptions: any = {
            'of the Praesul': 'ofThePraesul',
            'Golden Praesul': 'goldenPraesul',
            '10k KC': 'kc10k',
            '20k KC': 'kc20k',
            '30k KC': 'kc30k',
            '40k KC': 'kc40k',
            '50k KC': 'kc50k',
            '60k KC': 'kc60k',
            '70k KC': 'kc70k',
            '80k KC': 'kc80k',
            '90k KC': 'kc90k',
            '100k KC': 'kc100k',
            'Nex AoD FC Member': 'nexAodFCMember',
            'Fallen Angel': 'fallenAngel',
            'Nightmare of Nihils': 'nightmareOfNihils',
            'The Elementalist': 'elementalist',
            'Sage of the Elements': 'sageOfElements',
            'Master of the Elements': 'masterOfElements',
            'Smoke Demon': 'smokeDemon',
            'Shadow Cackler': 'shadowCackler',
            'Trueborn Vampyre': 'truebornVampyre',
            'Glacyte of Leng': 'glacyteOfLeng',
            'Praetorian Librarian': 'praetorianLibrarian',
            'Core-rupted': 'coreRupted',
            'Ollivander\'s Supplier': 'ollivandersSupplier',
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

        const { roles, colours, channels, stripRole, categorizeChannel, categorize, hierarchy } = this.client.util;

        const outputChannelId = categorizeChannel(role) ? channels[categorizeChannel(role)] : '';
        let channel;
        if (outputChannelId) {
            channel = await this.client.channels.fetch(outputChannelId) as TextChannel;
        }

        const user = await interaction.guild?.members.fetch(userResponse.id);
        const userRoles = await user?.roles.cache.map(role => role.id) || [];

        let sendMessage = false;
        const roleObject = await interaction.guild?.roles.fetch(stripRole(roles[role])) as Role;
        let embedColour = colours.discord.green;

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

        const roleId = stripRole(roles[role]);
        if (!hasHigherRole(role)) await user?.roles.add(roleId);
        embedColour = roleObject.color;
        
        if (!(userRoles?.includes(roleId)) && !hasHigherRole(role)) {
            sendMessage = true;
        }
        if (role in this.removeHierarchy) {
            for await (const roleToRemove of this.removeHierarchy[role]) {
                const removeRoleId = stripRole(roles[roleToRemove]);
                if (userRoles?.includes(removeRoleId)) await user?.roles.remove(removeRoleId);
            };
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
        if (sendMessage && channel) await channel.send({ embeds: [embed] }).then(message => {
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