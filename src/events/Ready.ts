import { ActivityType, TextChannel } from 'discord.js';
import Bot from '../Bot';
import BotEvent from '../types/BotEvent';
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
        const guild = await client.guilds.fetch(this.client.util.guildId);
        const channel = await guild.channels.fetch(this.client.util.channels.mockInfo) as TextChannel;
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
    }
}
