import { MessageReaction, User } from 'discord.js';
import BotEvent from '../types/BotEvent';

export default class MessageReactionAdd extends BotEvent {
    get name() {
        return 'messageReactionAdd';
    }

    get fireOnce() {
        return false;
    }

    get enabled() {
        return true;
    }

    async run(reaction: MessageReaction, user: User): Promise<void> {
        if (user.bot) return;
        if (!reaction.emoji.name) return;
        if (!reaction.message.inGuild()) return;
        if (this.client.util.config.guildMessageDisabled.includes(reaction.message.guild.id)) return;

        const { messages, roles, stripRole } = this.client.util;

        switch (reaction.message.id) {
            case messages.mockTrialReacts:
                if (['🇺🇸', '🇪🇺', '🌍'].includes(reaction.emoji.name)) {
                    const userObject = await reaction.message.guild?.members.fetch(user.id);
                    if (reaction.emoji.name === '🇺🇸') {
                        await userObject?.roles.add(stripRole(roles.pingNA))
                    }
                    if (reaction.emoji.name === '🇪🇺') {
                        await userObject?.roles.add(stripRole(roles.pingEU))
                    }
                    if (reaction.emoji.name === '🌍') {
                        await userObject?.roles.add(stripRole(roles.pingOffHour))
                    }
                }
                break;
            default:
                break;
        }
    }
}
