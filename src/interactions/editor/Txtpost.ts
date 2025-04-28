import BotInteraction from '../../types/BotInteraction';
import { Attachment, ChatInputCommandInteraction, SlashCommandBuilder, Message, TextChannel } from 'discord.js';

interface TxtpostMessage {
    content: string;
    isEmbed: boolean;
    tag: string | null;
    pin: boolean;
    url: string | null;
}

export default class Txtpost extends BotInteraction {
    get name() {
        return 'txtpost';
    }

    get description() {
        return 'Post a text file';
    }

    get permissions() {
        return 'EDITOR';
    }

    get slashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addAttachmentOption((option) => option.setName('file').setDescription('The txt-file attachment you want to send.').setRequired(true));
    }    

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });
        const attachment: Attachment = interaction.options.getAttachment('file', true);        
        const { fetchTextFile } = this.client.util;
        const channel = interaction.channel as TextChannel;
        
        const fileContent: string = await fetchTextFile(attachment.url);
        let taggedMessage = false;
        let tagName: string | null = null;

        if (fileContent){
            //Parse the file
            const expression: RegExp = /((\r?\n|^)[.].*?(\r?\n|$))/g;
            const tagExpression: RegExp = /[$]linkmsg_.*[$]/g;

            const txtpostMessages: TxtpostMessage[] = fileContent.split(expression).reduce((acc: TxtpostMessage[], part, index) => {
                part = part.trim();
                
                if (part == null || part == ""){
                    return acc;
                }

                if (part == "." || part == ".\r\n" || part == ".\n"){
                    //empty message                    
                    return acc;
                }

                if (part.startsWith(".\r\n") || part.startsWith(".\n")){
                    //empty message followed by more stuff
                    part = part.substring(1).trim();
                }

                if (part == ".embed:json"){
                    //previous message was an embed
                    acc.at(-1)!.isEmbed = true;
                    return acc;
                }

                if (part.startsWith(".tag:")){
                    //next message will be an tagged message
                    taggedMessage = true;
                    tagName = part.substring(5);
                    return acc;
                }

                if (part == ".pin:delete"){
                    //previous message needs to be pinned
                    acc.at(-1)!.pin = true;
                }

                if (part.startsWith(".img:")){
                    //this message contains an image-url
                    part = part.substring(5);                    
                }

                //create new message
                let msg: TxtpostMessage = {
                    content: part,
                    isEmbed: false,
                    tag: null,
                    pin: false,
                    url: null
                };

                //check if it has an tag
                if (taggedMessage && tagName != null){
                    msg.tag = tagName;
                    tagName = null;
                    taggedMessage = false;
                }

                acc.push(msg);
                return acc;
              }, []);;
            
            for (let messageIndex in txtpostMessages){
                let message: TxtpostMessage = txtpostMessages[messageIndex];
                let sentMessage: Message | undefined;
                
                //replace tag placeholders                
                if (message.content.match(tagExpression)){
                    txtpostMessages.forEach(msg => {
                        if (msg.tag != null && msg.url != null){
                            message.content = message.content.replace(`$linkmsg_${msg.tag}$`, msg.url);
                        }
                    });
                }

                //post message
                if (message.isEmbed){
                    //if message is an embed convert it
                    const jsonPost: any = JSON.parse(message.content);                    
                    sentMessage = await channel?.send({embeds: [jsonPost.embed]});                    
                }
                else{
                    sentMessage = await channel?.send(message.content);
                }

                //remember url of sent message in case toc is needed
                if (sentMessage){
                    message.url = sentMessage.url;
                }

                //pin message if needed
                if (message.pin){
                    await sentMessage?.pin();
                }
            }            
        }        

        await interaction.editReply(`Posted txt-file`);
    }
}
