import BotInteraction from '../../types/BotInteraction';
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Trial } from '../../entity/Trial';
import { TrialParticipation } from '../../entity/TrialParticipation';
import { getRoles } from '../../GuildSpecifics';

export default class TrialLeaderboard extends BotInteraction {
    get name() {
        return 'trial-leaderboard';
    }

    get description() {
        return 'Trial Team Leaderboards';
    }

    get permissions() {
        return 'TRIAL_TEAM';
    }

    get timespanOptions() {
        const timespanTypes: any = {
            'Current Month': 'currentMonth',
            'Last Month': 'lastMonth',
            'Last 3 Months': 'lastThreeMonths',
            'Current Year': 'currentYear',
            'Last Year': 'lastYear',
            'All Time': 'allTime',
        }
        const options: any = [];
        Object.keys(timespanTypes).forEach((key: string) => {
            options.push({ name: key, value: timespanTypes[key] })
        })
        return options;
    }

    get regionOptions() {
        const assignOptions: any = {
            'North America': 'North America',
            'Europe': 'German',
        }
        const options: any = [];
        Object.keys(assignOptions).forEach((key: string) => {
            options.push({ name: key, value: assignOptions[key] })
        })
        return options;
    }

    get slashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption((option) => option.setName('timespan').setDescription('Time Span').addChoices(
                ...this.timespanOptions
            ).setRequired(false))
            .addStringOption((option) => option.setName('region').setDescription('EU or NA, both if empty').addChoices(
                ...this.regionOptions
            ).setRequired(false));
    }

    public createFieldFromArray = (array: any[]) => {
        const { gem1, gem2, gem3 } = this.client.util.emojis;
        let field = '';
        if (array.length === 0) return 'None';
        array.forEach((item, index) => {
            let prefix: string;
            switch(index){
                case 0:
                    prefix = gem1;
                    break;
                case 1:
                    prefix = gem2
                    break;
                case 2:
                    prefix = gem3
                    break;
                default:
                    prefix = '⬥'
                    break;
            }
            field += `${prefix} <@${item.user}> - **${item.count}**\n`
        })
        return field;
    }

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();
        const { dataSource } = this.client;
        const { colours } = this.client.util;
        let timespan: string | null = interaction.options.getString('timespan', false);
        const region: string | null = interaction.options.getString('region', false);

        if (timespan == null){
            timespan = 'currentMonth';
        }

        let dateFrom: Date;
        let dateTo: Date;
        let timestamp: Date = new Date();
        let description: String;

        switch(timespan){
            case 'currentMonth':{
                dateFrom = new Date(timestamp.getFullYear(), timestamp.getMonth(), 1, 0, 0, 0);
                dateTo = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 23, 59, 59);
                description = 'Current Month';
                break;
            }
            case 'lastMonth':{
                timestamp.setDate(0);
                dateFrom = new Date(timestamp.getFullYear(), timestamp.getMonth(), 1, 0, 0, 0);
                dateTo = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 23, 59, 59);
                description = 'Last Month';
                break;
            }
            case 'lastThreeMonths':{
                dateTo = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 23, 59, 59);
                timestamp.setMonth(timestamp.getMonth() - 3);
                dateFrom = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate(), 0, 0, 0);
                description = 'Last 3 Months';
                break;
            }
            case 'currentYear':{
                dateFrom = new Date(timestamp.getFullYear(), 1, 1, 0, 0, 0);
                dateTo = new Date(timestamp.getFullYear(), 12, 31, 23, 59, 59);
                description = 'Current Year';
                break;
            }
            case 'lastYear':{
                dateFrom = new Date(timestamp.getFullYear() - 1, 1, 1, 0, 0, 0);
                dateTo = new Date(timestamp.getFullYear() - 1, 12, 31, 23, 59, 59);
                description = 'Last Year';
                break;
            }
            default:{
                dateFrom = new Date(2000, 1, 1, 0, 0, 0);
                dateTo = new Date(2099, 31, 12, 23, 59, 59);
                description = 'All Time';
                break;
            }
        }

        let whereRegion = '';

        if (region === 'North America') {
            whereRegion = `trial.link like '%954775172609630218%'`;
            description += " - NA only";
        }
        else if (region === 'German') {
            whereRegion = `trial.link like '%765479967114919937%'`;
            description += " - EU only";
        }
        else {
            whereRegion = `trial.link = trial.link`;
        }

        // Get top 10 Trials hosted members
        const trialsHosted = await dataSource.createQueryBuilder()
            .select('trial.host', 'user')
            .addSelect('COUNT(*)', 'count')
            .from(Trial, 'trial')
            .groupBy('trial.host')
            .where(`trial.createdAt BETWEEN :dateFrom AND :dateTo`, {dateFrom, dateTo})
            .andWhere(whereRegion)
            .orderBy('count', 'DESC')
            .getRawMany();

        // Get top 10 Trials participated members
        const trialsParticipated = await dataSource.createQueryBuilder(TrialParticipation, 'trialParticipation')
        .innerJoinAndSelect('trialParticipation.trial', 'trial')
        .addSelect('trialParticipation.participant', 'user')
        .addSelect('COUNT(*)', 'count')
        .where(`trial.createdAt BETWEEN :dateFrom AND :dateTo`, {dateFrom, dateTo})
        .andWhere(whereRegion)
        .groupBy('trialParticipation.participant')
        .orderBy('count', 'DESC')
        .getRawMany();

        // Get total trials without making another database call
        let totalTrials = 0;
        trialsHosted.forEach(trial => {
            totalTrials += trial.count;
        })

        const embed = new EmbedBuilder()
            .setTimestamp()
            .setTitle(`Trial Team Leaderboard (${description})`)
            .setColor(colours.gold)
            .setDescription(`> There has been **${totalTrials}** trial${totalTrials !== 1 ? 's' : ''} recorded and **${trialsParticipated.length}** unique ${getRoles(interaction?.guild?.id).trialTeam} members!`)
            .addFields(
                { name: 'Trials Hosted', value: this.createFieldFromArray(trialsHosted.slice(0,10)), inline: true },
                { name: 'Trials Participated', value: this.createFieldFromArray(trialsParticipated.slice(0,10)), inline: true }
            )

        await interaction.editReply({ embeds: [embed] });
    }
}
