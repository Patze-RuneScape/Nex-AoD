import BotInteraction from '../../types/BotInteraction';
import { ChatInputCommandInteraction, SlashCommandBuilder, ForumChannel, TextChannel, Attachment, ChannelType, MessageFlags } from 'discord.js';

export default class ForumCreate extends BotInteraction {
    get name() {
        return 'forum-create';
    }

    get description() {
        return 'Create a forum thread';
    }

    get permissions() {
        return 'EDITOR';
    }

    get slashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addChannelOption((option) => option.setName('channel').setDescription('Forum-Channel, in which the thread will be created.').setRequired(true).addChannelTypes(ChannelType.GuildForum))
            .addStringOption((option) => option.setName('name').setDescription('Thread name').setRequired(true))
            .addStringOption((option) => option.setName('message').setDescription('Initial message').setRequired(true))
            .addAttachmentOption((option) => option.setName('thumbnail').setDescription('Optional Thumbnail Image for the forum').setRequired(false));
    }    

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });        
        const channel: TextChannel = interaction.options.getChannel('channel', true);
        const threadName: String = interaction.options.getString('name', true);
        const threadMessage: String = interaction.options.getString('message', true);
        const thumbnail: Attachment | null = await interaction.options.getAttachment('thumbnail', false);

        if (channel instanceof ForumChannel){
            const forumChannel = channel as ForumChannel;
            let options;

            if (thumbnail){
                options = {
                    name: `${threadName}`,
                    message: {
                        content: `${threadMessage}`,
                        files: [{
                            attachment: thumbnail.url,
                            name: thumbnail.name,
                        }]                    
                    }
                };
            } else {
                options = {
                    name: `${threadName}`,
                    message: {
                        content: `${threadMessage}`
                    }
                };
            }

            forumChannel.threads.create(options);
        } else {
            return await interaction.editReply('Channel must be a ForumChannel!');
        }

        await interaction.editReply(`Forum-Thread created`);
    }
}
