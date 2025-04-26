import BotInteraction from '../../types/BotInteraction';
import { ChatInputCommandInteraction, SlashCommandBuilder, Role, EmbedBuilder } from 'discord.js';
export default class SetColour extends BotInteraction {

    get name() {
        return 'set-colour';
    }

    get description() {
        return 'Sets a colour for MVP Contributors';
    }

    get slashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption((option) => option.setName('colour').setDescription('Hex Colour i.e. #000000').setRequired(true))
    }

    public userToRoleId = (userId: string): string | undefined => {
        const data: any = {
            // Rocket
            '259011909976719360': '1121741706765795440',
            // Marwood
            '512006696005140492': '1121739075662139403',
            // Jamie
            '128454764345294848': '1121741768145248326',
            // Patze
            '581918864296771595': '1121741858536697897',
            // Grico
            '470333202616025090': '1121742022777249883',
            // geherman
            '197736922725089280': '1121742064518955088',
            // Seispip
            '257467891090325506': '1121742127496441936',
            // Friendliness
            '116331205653299201': '1121742484192645120',
            // Veggie
            '185208032605503488': '1121755553547427852',
            // Hells
            '406876547283157004': '1063311303478878318',
            // Germa
            '287634146010988544': '1063310756650680321',
            // Mike
            '238477706214244352': '1063310962419048458',
            // Logging in/Riley
            '205529505421328385': '905494614025326672',
            // Fate
            '258055326215962626': '1121748189876334612',
        }
        return data[userId];
    }

    public isValidHexCode(color: string): boolean {
        const regex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return regex.test(color);
    }

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });
        const colour: string = interaction.options.getString('colour', true);

        const { roles, colours, stripRole } = this.client.util;

        const user = await interaction.guild?.members.fetch(interaction.user.id);
        const userRoles = await user?.roles.cache.map(role => role.id) || [];

        if (!userRoles.includes(stripRole(roles['mvp']))) {
            const errorEmbed = new EmbedBuilder()
                .setColor(colours.discord.red)
                .setDescription('You are not a MVP Contributor. Contribute to the discord and get recognized!');
            return await interaction.editReply({ embeds: [errorEmbed] });
        }

        if (!this.isValidHexCode(colour)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(colours.discord.red)
                .setDescription('Colour is not a valid Hex code.');
            return await interaction.editReply({ embeds: [errorEmbed] });
        }

        try {
            const roleId = this.userToRoleId(interaction.user.id);
            if (roleId) {
                const roleObject = await interaction.guild?.roles.fetch(roleId) as Role;
                console.log(roleObject);
                roleObject.setColor(colour as any);
            } else {
                throw new Error('No role exists.')
            }
            const replyEmbed = new EmbedBuilder()
                .setColor(colour || (colours.gold as any))
                .setDescription(`Colour set to **${colour}**!`);
            return await interaction.editReply({ embeds: [replyEmbed] });
        } catch {
            const errorEmbed = new EmbedBuilder()
                .setColor(colours.discord.red)
                .setDescription('Something went wrong!');
            return await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
}