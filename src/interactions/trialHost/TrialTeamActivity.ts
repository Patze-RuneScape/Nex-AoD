import BotInteraction from '../../types/BotInteraction';
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, User } from 'discord.js';
import { TrialParticipation } from '../../entity/TrialParticipation';

export default class TrialTeamActivity extends BotInteraction {
    get name() {
        return 'trial-team-activity';
    }

    get description() {
        return 'Shows Trial Team Members who didn\'t attend a trial since a given date';
    }

    get permissions() {
        return 'TRIAL_HOST';
    }

    get slashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption((option) => option.setName('time').setDescription('Time since last trial. Must be in the format YYYY-MM-DD HH:MM in Gametime. e.g. 2022-11-05 06:00').setRequired(false))
            .addUserOption((option) => option.setName('user').setDescription('User').setRequired(false));
    }

    public parseTime = (timeString: string): Date => {
        const [date, time] = timeString.split(' ');
        const [year, month, day] = date.split('-').map(Number);
        const [hours, minutes] = time.split(':').map(Number);
        return new Date(Date.UTC(year, month - 1, day, hours, minutes));
    }

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: false });
        const { dataSource } = this.client;
        const { roles, colours, stripRole } = this.client.util;
        const time: string | null = interaction.options.getString('time', false);
        const userResponse: User | null = interaction.options.getUser('user', false);
	let user = null;
	if (userResponse != null){
	    user = await interaction.guild?.members.fetch(userResponse?.id);
	}

        // By default check for older than 3 months
        let date: Date = new Date(new Date().setMonth(new Date().getMonth() - 3));
        if (time != null){
            date = this.parseTime(time);
        }        
        
        let embed = new EmbedBuilder();
        if (user == null){
            // Get all trial team members who haven't attended a trial since the date
            const trialParticipants = await dataSource.createQueryBuilder()
                .select('trialParticipation.participant', 'user')            
                .addSelect('COUNT(*)', 'count')
                .addSelect('MAX(trialParticipation.createdAt)', 'lastTrial')
                .from(TrialParticipation, 'trialParticipation')
                .groupBy('user')
                .having(`lastTrial < :dat`, {dat: date})
                .orderBy('lastTrial', 'ASC')
                .getRawMany();
            
            let nameList: any[] = [];
            let dateList: any[] = [];
            let countList: any[] = [];
            
            if (trialParticipants.length > 0){
                for (const trialParticipant of trialParticipants){
		    let user = null;
		    try{
			user = await interaction.guild?.members.fetch(trialParticipant.user);
		    }
		    catch{
			//user is not in the server anymore
		    }
                    const userRoles = await user?.roles.cache.map(role => role.id) || [];
                    
                    // Don't list if user has no longer Trial Team or Trial Team - Probation
                    if (userRoles?.includes(stripRole(roles.trialTeam)) || userRoles?.includes(stripRole(roles.trialTeamProbation)) || userRoles?.includes(stripRole(roles.trialHost))){
                        nameList.push(`⬥ <@${trialParticipant.user}>`);
                        dateList.push(trialParticipant.lastTrial);
                        countList.push(trialParticipant.count);
                    }
                }            
            }        

            embed = new EmbedBuilder()
                .setTimestamp()
                .setTitle('Trial Team Inactivity List')
                .setColor(colours.gold)
                .setDescription(`The following members haven't attented a trial since <t:${Math.round(date.getTime() / 1000)}:f>:`);
            
            const size: number = 10;
            if (nameList.length > 0){
                for (let i = 0; i < Math.floor(nameList.length / size) + 1; i++) {
                    embed.addFields( 
                        { name: 'Member', value: nameList.slice(size * i, (size * i) + size).join(`\n`), inline: true } ,
                        { name: 'Last Trial', value: dateList.slice(size * i, (size * i) + size).join(`\n`), inline: true } ,
                        { name: 'Total Trials', value: countList.slice(size * i, (size * i) + size).join(`\n`), inline: true }                    
                    );
                }
            }
            
        } else{
            const userid: string = userResponse?.id ?? '';
            
            //Query trials of given user
            const trials = await dataSource.createQueryBuilder(TrialParticipation, 'trialParticipation')                
                .innerJoinAndSelect('trialParticipation.trial', 'trial')
                .addSelect('trialParticipation.participant', 'user')
                .addSelect('trial.link', 'link')
                .addSelect('trial.createdAt', 'date')
                .where('trial.createdAt > :date', {date})
                .andWhere(`trialParticipation.participant = :user`, { user: userid})
                .orderBy('date', 'DESC')
                .getRawMany();

            const count = trials.length;
            let linkList: any[] = [];
            let dateList: any[] = [];

            if (count > 0){
                for (const trial of trials){
                    linkList.push(trial.link);
                    dateList.push(trial.date);
                }
            }

            embed = new EmbedBuilder()
                .setTimestamp()
                .setTitle('Trial Team Inactivity List')
                .setColor(colours.gold)
                .setDescription(`Attended Trials from <@${userResponse?.id}> since <t:${Math.round(date.getTime() / 1000)}:f>:`);
		
            const size: number = 10;
            if (linkList.length > 0){
                for (let i = 0; i < Math.floor(linkList.length / size) + 1; i++) {
		    if (i > 0){
			embed.addFields( { name: '\u200B', value: '\u200B', inline: false });
		    }
                    embed.addFields( 
                        { name: 'Trial Card Link', value: linkList.slice(size * i, (size * i) + size).join(`\n`), inline: true } ,
                        { name: 'Trial Date', value: dateList.slice(size * i, (size * i) + size).join(`\n`), inline: true } ,
                    );
                }
            }
        }

        await interaction.editReply({ embeds: [embed] });
    }
}
