import BotInteraction from '../../types/BotInteraction';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export default class Boop extends BotInteraction {
    get name() {
        return 'boop';
    }

    get description() {
        return 'Boop the bot.';
    }

    get slashData() {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    }

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        await interaction.editReply('🐊 🦘');
    }
}
