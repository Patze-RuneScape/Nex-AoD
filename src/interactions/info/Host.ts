import BotInteraction from '../../types/BotInteraction';
import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, TextChannel, MessageFlags } from 'discord.js';

export default class Host extends BotInteraction {
    get name() {
        return 'host';
    }

    get description() {
        return 'Set up a AoD Host Card';
    }

    get hostTypes() {
        const hostTypes: any = {
            '7-Man': '7man',
            //'4-Man': '4man',
        }
        const options: any = [];
        Object.keys(hostTypes).forEach((key: string) => {
            options.push({ name: key, value: hostTypes[key] })
        })
        return options;
    }

    get slashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            /*.addStringOption((option) => option.setName('type').setDescription('7- or 4-Man').addChoices(
                ...this.hostTypes
            ).setRequired(false))*/
            .addStringOption((option) => option.setName('message').setDescription('Add a Message').setRequired(false))
    }

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        //const type: string = interaction.options.getString('type', false) ?? '7man';
        const is7man = true;//type === '7man';
        const message: string | null = interaction.options.getString('message', false);

        const { colours, emojis } = this.client.util;

        const firstRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('selectUmbra')
                    .setEmoji(emojis.umbra)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('selectGlacies')
                    .setEmoji(emojis.glacies)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('selectCruor')
                    .setEmoji(emojis.cruor)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('selectFumus')
                    .setEmoji(emojis.fumus)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('selectHammer')
                    .setEmoji(emojis.hammer)
                    .setStyle(ButtonStyle.Secondary),
            );

        const secondRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('selectBase')
                    .setLabel('Base')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('selectFree')
                    .setLabel('Free')
                    .setStyle(ButtonStyle.Secondary),
            );

        let fields;

        fields = [
            { name: `${emojis.voke} Base`, value: '`Empty`', inline: true },
            { name: `${emojis.umbra} Umbra`, value: '`Empty`', inline: true },
            { name: `${emojis.glacies} Glacies`, value: '`Empty`', inline: true },
            { name: `${emojis.cruor} Cruor`, value: '`Empty`', inline: true },
            { name: `${emojis.fumus} Fumus`, value: '`Empty`', inline: true },
            { name: `${emojis.hammer} Hammer`, value: '`Empty`', inline: true },
            { name: `${emojis.freedom} Free`, value: '`Empty`', inline: true },
        ]

        let embed = new EmbedBuilder()
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() || this.client.user?.avatarURL() || 'https://media.discordapp.net/attachments/1027186342620299315/1047598720834875422/618px-Solly_pet_1.png' })
            .setColor(colours.lightblue)
            .addFields(
                fields
            )
            .setFooter({ text: `0/${is7man ? '7' : '4'} Players` });

        if (message) {
            embed.setDescription(message);
        }

        const channel = interaction.channel as TextChannel;
        await channel.send(
            { embeds: [embed], components: [firstRow, secondRow] }
        )

        const replyEmbed = new EmbedBuilder()
            .setTitle('Host card created!')
            .setColor(colours.discord.green)
            .setDescription(`Host card has been posted`);
        await interaction.editReply({ embeds: [replyEmbed] });
    }
}
