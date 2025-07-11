import { ActivityType, TextChannel, EmbedBuilder } from 'discord.js';
import Bot from '../Bot';
import BotEvent from '../types/BotEvent';
import { getChannels, getCommands } from '../GuildSpecifics';
import { guildId } from '../../config.json';

export default class Ready extends BotEvent {
    get name(): string {
        return 'ready';
    }

    get fireOnce(): boolean {
        return true;
    }

    get enabled(): boolean {
        return true;
    }

    private get statuses(): string[] {
        return ['Apply to trial today!'];
    }

    async run(client: Bot) {
        this.client.logger.log({ message: `[${this.client.user?.username}] Ready! Serving ${this.client.guilds.cache.size} guild(s) with ${this.client.users.cache.size} user(s)` }, true);
        this.client.logger.log({ message: `Running on the ${process.env.ENVIRONMENT} environment` }, true);
        this.client.user?.setPresence({
            activities: [{ name: `you kill Nex!`, type: ActivityType.Watching }]
        });
        const guild = await client.guilds.fetch(guildId);
        const channel = await guild.channels.fetch(getChannels(guild.id).mockInfo) as TextChannel;
        await channel.messages.fetch(this.client.util.messages.mockTrialReacts).then(() => {
            this.client.logger.log({ message: `Mock Trial Reacts Loaded` }, true);
        });

        setInterval((): void => {
            const current = this.statuses.shift() ?? '';
            this.client.user?.setPresence({
                activities: [{ name: current, type: ActivityType.Watching }]
            });
            this.statuses.push(current);
        }, 300000);

        //Info Message About Host-Command
        let advertiseHost = false;
        const nonTrialed7manChannel = await guild.channels.fetch(getChannels(guild.id).nonTrialed7man) as TextChannel;
        const trialed7manChannel = await guild.channels.fetch(getChannels(guild.id).trialed7man) as TextChannel;
        const hostCommandId = await getCommands(guild.id)['host'];
        const { colours } = this.client.util;
        if (advertiseHost) {
            setInterval((): void => {
                const replyEmbed = new EmbedBuilder()
                    .setTitle('Host your AoD Session!')
                    .setColor(colours.discord.green)
                    .setDescription(`You can use </host:${hostCommandId}> to create your own host card for AoD!`);
                nonTrialed7manChannel.send({ embeds: [replyEmbed] });
                trialed7manChannel.send({ embeds: [replyEmbed] });
            }, 86400000);
        }
    }
}
