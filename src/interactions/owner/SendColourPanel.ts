import BotInteraction from '../../types/BotInteraction';
import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, TextChannel } from 'discord.js';

export default class SendColourPanel extends BotInteraction {
    get name() {
        return 'send-colour-panel';
    }

    get description() {
        return 'Sends the panel with Reactions for Colour-Overrides';
    }

    get permissions() {
        return 'ELEVATED_ROLE';
    }

    get panelOptions() {
        const timespanTypes: any = {
            'Default Panel': 'default',
            'Christmas Tags': 'christmas'
        }
        const options: any = [];
        Object.keys(timespanTypes).forEach((key: string) => {
            options.push({ name: key, value: timespanTypes[key] })
        })
        return options;
    }

    get slashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption((option) => option.setName('paneltype').setDescription('Panel Type').addChoices(
                ...this.panelOptions
            ));
    }

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });

        const { colours, getColourPanelComponents, getChristmasColourPanelComponents } = this.client.util;
        const channel = interaction.channel as TextChannel;
	const panelType: string  = interaction.options.getString('paneltype', true);
        let embed = new EmbedBuilder();

        if (panelType === 'default'){
            embed = new EmbedBuilder()
                .setTitle('Choose your own colour!')
                .setTimestamp()
                .setColor(colours.discord.green)
                .setDescription('Choose an colour-override from any cosmetic tag you have achieved!\r\nYou need to own the corresponding Tag to be able to select it\'s colour!');
            
            const getComps = getColourPanelComponents.bind(this.client.util)
            await channel.send(
                { embeds: [embed], components: await getComps(interaction)}
            )
        }
        else if (panelType === 'christmas'){
            embed = new EmbedBuilder()
                .setTitle('Choose your own festive colour and santa hat!')
                .setTimestamp()
                .setColor(colours.discord.green)
                .setThumbnail('https://runescape.wiki/images/Green_Santa_hat.png')
                .setDescription('Choose between 6 differen colour overrides and matching santa-hat role icons!');
            
            const getComps = getChristmasColourPanelComponents.bind(this.client.util)

            await channel.send(
                { embeds: [embed], components: await getComps(interaction)}
            )
        }

        const replyEmbed = new EmbedBuilder()
            .setTitle('Panel send!')
            .setColor(colours.discord.green)
            .setDescription(`Colour-Panel has successfully been created`);
        await interaction.editReply({ embeds: [replyEmbed] });
    }
}
