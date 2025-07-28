import BotInteraction from '../../types/BotInteraction';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { MvpContributor } from '../../entity/MvpContributor';

export default class ListMvp extends BotInteraction {
    get name() {
        return 'list-mvp';
    }

    get description() {
        return 'Lists all MvP-Contributors and their Vanity-Tag';
    }

    get permissions() {
        return 'ORGANIZER';
    }

    get slashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description);
    }

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        const { dataSource } = this.client;

        const mvps : MvpContributor[] = await dataSource.getRepository(MvpContributor).find();

        let response: string = '> ## MvP User List:';

        mvps.forEach(mvp => {
            response += `\n<@${mvp.user}> with role <@&${mvp.role}>`;
        });

        return await interaction.editReply({ content: response, allowedMentions: { "parse": [] }});
    }
}
