import { Message, MessageFlags, SlashCommandBuilder, TextChannel } from 'discord.js';
import BotEvent from '../types/BotEvent';
import { readdirSync } from 'fs';
import BotInteraction from '../types/BotInteraction';
import { MessageShortcut } from '../entity/MessageShortcut';

export default class MessageCreate extends BotEvent {
    get name() {
        return 'messageCreate';
    }

    get fireOnce() {
        return false;
    }

    get enabled() {
        return true;
    }

    static ryChooseMatch = new RegExp(/(?:[^\s('|")]+|(?:'|")[^('|")]*(?:'|"))+/g);

    async run(message: Message): Promise<any> {
        if (message.author.bot) return;
        if (!message.inGuild()) return;
        if (this.client.util.config.guildMessageDisabled.includes(message.guild.id)) return;

        //if in develop mode, ignore all commands from main server
        if (process.env.ENVIRONMENT === 'DEVELOPMENT' && (message.guildId === '315710189762248705' || message.guildId === '742114133117501570')){
            return;
        }

        //prod mode ignores dev server
        if (process.env.ENVIRONMENT === 'PRODUCTION' && message.guildId === '1370324695324561439'){
            return;
        }

        if (await this.handleShortcuts(message)) {
            return;
        }

        if (!await this.handleYoink(message)) {
            return;
        }

        // boop message
        if (message.content.startsWith(`<@${this.client.user?.id}> boop`)) {
            this.client.commandsRun++;
            this.client.logger.log({ message: `${message.author.username} booped the bot.`, uid: `(@${this.uid})` }, true);
            return message.reply({ content: '<a:majjnow:1006284731928805496>' });
        }

        // slash command handler
        if (this.client.util.config.owners.includes(message.author.id) && message.content.startsWith(`<@${this.client.user?.id}> build`)) {
            if (message.content.match(/help/gi)) {
                const buildUsage = [
                    '`build` - Build Server Commands',
                    '`build help` - Shows this message',
                    '`build global` - Build Global Commands',
                    '`build removeall` - Remove Global Commands',
                    '`build guild removeall` - Remove Server Commands',
                ];
                return message.reply({ content: buildUsage.join('\n') });
            }

            if (message.content.match(/removeall/gi)) {
                // remove only the guilds commands
                if (message.content.match(/guild/gi))
                    await message.guild?.commands.set([]).catch((err) => {
                        this.client.logger.error({ error: err.stack, handler: this.constructor.name });
                        message.react('❎');
                    });
                // remove all slash commands globally
                else
                    await this.client.application?.commands.set([]).catch((err) => {
                        this.client.logger.error({ error: err.stack, handler: this.constructor.name });
                        message.react('❎');
                    });
                return message.reply({ content: 'Done' });
            }

            let data: SlashCommandBuilder[] = [];
            await this.buildCommands(data, message.guild.id);

            // global commands
            if (message.content.match(/global/gi)) {
                if (!this.client.application) return message.reply({ content: `There is no client.application?` }).catch(() => { });
                let res = await this.client.application.commands.set(data).catch((e) => e);
                if (res instanceof Error) return this.client.logger.error({ error: res.stack, handler: this.constructor.name });
                return message
                    .reply({
                        content: `Deploying (**${data.length.toLocaleString()}**) slash commands, This could take up to 1 hour.\n\`\`\`diff\n${data
                            .map((command) => `${command.default_member_permissions === '0' ? '-' : '+'} ${command.name} - '${command.description}'`)
                            .join('\n')}\n\`\`\``,
                    })
                    .catch(() => { });
            }

            // guild commands
            let res = await message.guild.commands.set(data).catch((e) => e);
            if (res instanceof Error) return this.client.logger.error({ error: res.stack, handler: this.constructor.name });
            const header = `Deploying (**${data.length.toLocaleString()}**) guild slash commands.`;
            const outputLines = data.map((command) => `${command.default_member_permissions === '0' ? '-' : '+'} ${command.name} - '${command.description}'`);
            return this.sendSplitResponse(message.channel, header, outputLines);
        }
    }

    private async sendSplitResponse(channel: any, header: string, lines: string[]) {
        await channel.send({ content: header });
        const messages = [];
        let currentMessage = '';
        for (const line of lines) {
            // 2000 limit - ```diff\n (7) - ``` (3) = 1990
            if (currentMessage.length + line.length + 1 > 1990) {
                messages.push(`\`\`\`diff\n${currentMessage}\`\`\``);
                currentMessage = '';
            }
            currentMessage += line + '\n';
        }
        if (currentMessage) {
            messages.push(`\`\`\`diff\n${currentMessage}\`\`\``);
        }
        for (const msg of messages) {
            await channel.send({ content: msg }).catch((err: Error) => {
                this.client.logger.error({ error: err.stack, handler: this.constructor.name });
            });
        }
    }

    private async buildCommands(data: any[], guildId: string) {
        for await (const directory of readdirSync(`${this.client.location}/src/interactions`, { withFileTypes: true })) {
            if (!directory.isDirectory()) continue;
            for await (const command of readdirSync(`${this.client.location}/src/interactions/${directory.name}`, { withFileTypes: true })) {
                if (!command.isFile()) continue;

                //FC only gets Txtpost Command
                if (guildId === '742114133117501570' && !command.name.startsWith('Txtpost')) continue;

                if (command.name.endsWith('.ts')) {
                    import(`${this.client.location}/src/interactions/${directory.name}/${command.name}`).then((interaction) => {
                        const Command: BotInteraction = new interaction.default(this.client);
                        Command.slashData ? data.push(Command.slashData) : void 0;
                    });
                }
            }
        }
    }

    private async handleYoink(message: Message): Promise<boolean> {
        // only react to yoink
        if (!message.content.toLowerCase().includes('yoink')) {
            return true;
        }

        const messageMatch = message.content.match(/(?<=yoink\s).*/g);

        // yoink
        if (message.content.startsWith(`<@${this.client.user?.id}> yoink `) && message.member!.permissions.has('ManageEmojisAndStickers')) {
            let emojiMentionMatch = message.content.match(/<a?:\w+:\d+>/g);

            // if yoink is not directly an emoji but only its name lookup the last 20 messages for someone to post the emoji
            if (!emojiMentionMatch) {
                const messages = await message.channel.messages.fetch( { limit: 20 });


                if (messageMatch) {
                    const regex = new RegExp(`<a?:${messageMatch[0]}:\\d+>`);
                    messages.some(msg => {
                        emojiMentionMatch = msg.content.match(regex);

                        if (emojiMentionMatch) {
                            return true;
                        }
                        return false;
                    });
                }
            }

            if (emojiMentionMatch) {
                const isGif = emojiMentionMatch[0].startsWith('<a:');
                const emojiNameMatch = emojiMentionMatch ? emojiMentionMatch[0].match(/:(\w+):/) : '';
                const emojiIdMatch = emojiMentionMatch ? emojiMentionMatch[0].match(/:(\d+)>/) : '';

                if (emojiNameMatch && emojiIdMatch) {
                    const emojiName = emojiNameMatch[1];
                    const emojiId = emojiIdMatch[1];
                    const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isGif ? 'gif' : 'png'}`;

                    await message.guild!.emojis.create({
                        name: emojiName,
                        attachment: emojiUrl
                    });

                    await message.reply(`yoinked!`);
                    return false;
                }
            }

            // if user provided an url with an image / gif, upload from that url
            if (!emojiMentionMatch && messageMatch) {
                const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/;
                if (urlRegex.test(messageMatch[0])) {
                    const emoji = await message.guild!.emojis.create({
                        name: 'upload_emoji',
                        attachment: messageMatch[0]
                    });

                    await message.reply(`uploaded <${emoji.animated ? 'a' : ''}:upload_emoji:${emoji.id}>!`);
                    return false;
                }
            }
        }

        return true;
    }

    private async handleShortcuts(message: Message): Promise<boolean> {
        const { dataSource } = this.client;
        const repository = dataSource.getRepository(MessageShortcut);
        //TODO: make global caching

        const match = message.content.match(/^[^\s\r\n]+/gm);

        if (match) {
            const existingEntry = await repository.findOne({
                where: {
                    guildId: message.guild!.id,
                    shortcut: match[0]
                }
            });

            if (existingEntry) {
                try {
                    const guild = await this.client.guilds.fetch(existingEntry.message_guildId);

                    if (guild) {
                        const channel = await guild.channels.fetch(existingEntry.message_channelId) as TextChannel;

                        if (channel) {
                            const messageToSend = await channel.messages.fetch(existingEntry.message_messageId);

                            if (messageToSend) {
                                await (message.channel as TextChannel).send({
                                    content: messageToSend.content,
                                    embeds: messageToSend.embeds,
                                    components: messageToSend.components,
                                    flags: messageToSend.flags.has(MessageFlags.IsComponentsV2) ? MessageFlags.IsComponentsV2 : undefined,
                                    allowedMentions: { "parse" : [] }
                                });
                                return true;
                            } else {
                                this.client.logger.log({ message: `Could not find message with id: ${existingEntry.message_messageId} in channel with id: ${existingEntry.message_channelId} in guild with id: ${existingEntry.message_guildId}.`, handler: 'AutoTriggerHandler'}, true);
                            }
                        } else {
                            this.client.logger.log({ message: `Could not find channel with id: ${existingEntry.message_channelId} in guild with id: ${existingEntry.message_guildId}.`, handler: 'AutoTriggerHandler'}, true);
                        }
                    } else {
                        this.client.logger.log({ message: `Could not find guild with id: ${existingEntry.message_guildId}.`, handler: 'AutoTriggerHandler'}, true);
                    }
                } catch (error) {
                    this.client.logger.log({ message: 'Error retrieving shortcut data', error: error, handler: 'AutoTriggerHandler' }, true);
                }
            }
        }

        return false;
    }
}
