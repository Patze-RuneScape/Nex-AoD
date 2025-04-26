import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, TextChannel } from 'discord.js';
// import { ApplicationCommandOptionType } from 'discord-api-types/v9';
import BotInteraction from '../../types/BotInteraction';

export default class Eval extends BotInteraction {
    get name() {
        return 'generate-message';
    }

    get description() {
        return 'Generates any required message';
    }

    get permissions() {
        return 'OWNER';
    }

    get messageOptions() {
        const assignOptions: any = {
            'Trial Reacts': 'mockReacts'
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
            .addStringOption((option) => option.setName('message').setDescription('Message to Generate').addChoices(
                ...this.messageOptions
            ).setRequired(true))
    }

    async run(interaction: ChatInputCommandInteraction<any>) {
        await interaction.deferReply({ ephemeral: true });

        const { colours, roles, channels } = this.client.util;

        const feature: string = interaction.options.getString('message', true);

        const embed = new EmbedBuilder()

        switch (feature) {
            case 'mockReacts':
                const infoEmbed = new EmbedBuilder()
                    .setTitle('Trial Reaction Pings')
                    .setColor(colours.gold)
                    .setDescription(`
                        > React to the roles below to add or remove the following roles:\n
                        ⬥ 🇺🇸 - ${roles.pingNA}
                        ⬥ 🇪🇺 - ${roles.pingEU}
                        ⬥ 🌍 - ${roles.pingOffHour}
                    `)
                const channel = await interaction.guild.channels.fetch(channels.mockInfo) as TextChannel;
                const message = await channel.send({ embeds: [infoEmbed] });
                await message.react('🇺🇸');
                await message.react('🇪🇺');
                await message.react('🌍');
                embed.setColor(colours.discord.green)
                    .setTitle('**Message successful!**')
                    .setDescription('**Mock reacts** message created.')
                break;
            default:
                embed.setColor(colours.discord.red)
                    .setTitle('Something went wrong.')
                    .setDescription('The feature you have selected has no message.')
                await interaction.editReply({ embeds: [embed] });
                break;
        }
        await interaction.editReply({ embeds: [embed] });
    }
}
