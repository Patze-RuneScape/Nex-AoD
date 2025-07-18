import BotInteraction from '../../types/BotInteraction';
import { ChatInputCommandInteraction, SlashCommandBuilder, Role, EmbedBuilder, MessageFlags } from 'discord.js';
import { getRoles } from '../../GuildSpecifics';
import { MvpContributor } from '../../entity/MvpContributor';

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

    public isValidHexCode(color: string): boolean {
        const regex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return regex.test(color);
    }

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const colour: string = interaction.options.getString('colour', true);

        const { colours, stripRole } = this.client.util;

        const user = await interaction.guild?.members.fetch(interaction.user.id);
        const userRoles = await user?.roles.cache.map(role => role.id) || [];

        const { dataSource } = this.client;
        const repository = dataSource.getRepository(MvpContributor);

        const existingEntry = await repository.findOne({
            where: {
                guild: interaction.guild?.id,
                user: interaction.user.id,
            }
        });

        //check if user is a mvp
        if (existingEntry && userRoles.includes(stripRole(getRoles(interaction?.guild?.id).mvp))) {
            //check value
            if (!this.isValidHexCode(colour)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(colours.discord.red)
                    .setDescription('Colour is not a valid Hex code.');
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            //assign colour
            const roleObject = await interaction.guild?.roles.fetch(existingEntry.role) as Role;
            roleObject.setColor(colour as any);

            const replyEmbed = new EmbedBuilder()
                .setColor(colour || (colours.gold as any))
                .setDescription(`Colour set to **${colour}**!`);
            return await interaction.editReply({ embeds: [replyEmbed] });
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor(colours.discord.red)
                .setDescription('You are not a MVP Contributor. Contribute to the discord and get recognized!');
            return await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
}
