import BotInteraction from '../../types/BotInteraction';
import { Attachment, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, TextChannel } from 'discord.js';

export default class Say extends BotInteraction {
    get name() {
        return 'say';
    }

    get description() {
        return 'Talk as the bot';
    }

    get permissions() {
        return 'ELEVATED_ROLE';
    }

    get slashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption((option) => option.setName('message').setDescription('The message you want to send.').setRequired(true))
            .addAttachmentOption((option) => option.setName('image').setDescription('The image attachment you want to send.').setRequired(false));
    }

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });
        const message: string = interaction.options.getString('message', true);
        const attachment: Attachment | null = interaction.options.getAttachment('image', false);
	const channel = interaction.channel as TextChannel;

        const errorEmbed = new EmbedBuilder()
            .setColor(this.client.util.colours.discord.red)
            .setDescription('No mass mentions!');

        if (message.includes('@everyone') || message.includes('@here')) {
            return await interaction.editReply({ embeds: [errorEmbed] });
        }
        // const role: Role | APIRole | null = interaction.options.getRole('role_search', false);
        // const _role_members = interaction.guild?.roles.cache.get(role?.id)?.members.size;
        await channel?.send(attachment ? { content: message, files: [attachment] } : { content: message });
        await interaction.editReply(`Sent Message: \`\`\`\n${message}\n\`\`\``);
    }
}
