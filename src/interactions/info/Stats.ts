import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import BotInteraction from '../../types/BotInteraction';
import { ChatInputCommandInteraction } from 'discord.js';

export default class Stats extends BotInteraction {
    get name() {
        return 'stats';
    }

    get description() {
        return 'My current info!';
    }

    get slashData() {
        return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
    }

    get memory() {
        const _result = [];
        for (const [key, value] of Object.entries(process.memoryUsage())) {
            _result.push(`${key}: ${value / 1000000}MB`);
        }
        return _result;
    }

    async run(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();

        const embed = new EmbedBuilder()
            .setColor(this.client.color ?? 0x00000)
            .setTitle('Status')
            .setDescription(
                `\`\`\`ml\n
Guilds      :: ${this.client.guilds.cache.size}
User Count  :: ${this.client.guilds.cache.map((g) => g.memberCount).reduce((a, c) => a + c)}
Channels    :: ${this.client.channels.cache.size}
Ping       :: ${this.client.ws.ping} MS
Uptime      :: ${this.client.util.convertMS(this.client.uptime)}
CMDs Run    :: ${this.client.commandsRun}
Memory      :: ${JSON.stringify(this.memory, null, 2)}
\`\`\``
            )
            .setTimestamp()
            .setFooter({ text: this.client.user?.username ?? 'AoD', iconURL: this.client.user?.displayAvatarURL() });
        await interaction.editReply({ embeds: [embed], components: [] });
    }
}
