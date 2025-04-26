import BotInteraction from '../../types/BotInteraction';
import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel, APIEmbedField, Message } from 'discord.js';
import { TrialParticipation } from '../../entity/TrialParticipation';
import { Trial } from '../../entity/Trial';

export default class MigrateDb extends BotInteraction {
    get name() {
        return 'migrate-db';
    }

    get description() {
        return 'Writes all trials into the database';
    }

    get permissions() {
        return 'OWNER';
    }

    get slashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description);
    }

    public parseTime = (timeString: string): Date => {
        const [date, time] = timeString.split(' ');
        const [year, month, day] = date.split('-').map(Number);
        const [hours, minutes] = time.split(':').map(Number);
        return new Date(Date.UTC(year, month - 1, day, hours, minutes));
    }

    private async saveIfTrial(message: Message){
        const { dataSource } = this.client;

        const hostExpression: RegExp = /\`Host:\` <@(\d+)>/;                
        const localtimeExpression: RegExp = /\`Local Time:\` <t:(\d+):f>/;
        const timeExpression: RegExp = /\`Time:\` <t:(\d+):f>/;
        const trialeeExpression: RegExp = /\`Discord:\` <@(\d+)>/;
        const roleExpression: RegExp = /\`Tag:\` <@&(\d+)>/;

        if (!(message.author.id === '1040250917674569790')){
        //if (!(message.author.id === '1204871827407642635')){                
            return;
        }

        const messageEmbed = message.embeds[0];
        const messageContent: string | undefined = messageEmbed?.data.description;

        //check if the trial happened
        if (!messageContent?.includes('Trial started')){
            return;
        }
        //parse the data
        const fields: APIEmbedField[] = messageEmbed.fields;

        if (messageContent) {
            const hostMatches = messageContent.match(hostExpression);
            const localtimeMatches = messageContent.match(localtimeExpression);
            const timeMatches = messageContent.match(timeExpression);
            const trialeeMatches = messageContent.match(trialeeExpression);
            
            const roleMatches = messageContent.match(roleExpression);

            let userId = hostMatches ? hostMatches[1] : '';
            let trialeeId = trialeeMatches ? trialeeMatches[1] : '';
            
            let roleId = roleMatches ? roleMatches[1] : '';
            let time = localtimeMatches ? localtimeMatches[1] : '';
            if (time == ''){
                time = timeMatches ? timeMatches[1] : '';
            }
            let date: Date = new Date(Number(`${time}000`));
            
            if (!userId || !trialeeId || !roleId || !time) {
                //shouldn't happen
                return;
            }

            const trialRepository = dataSource.getRepository(Trial);
            const trialObject = new Trial();
            trialObject.trialee = trialeeId;
            trialObject.host = userId;
            trialObject.role = roleId;
            trialObject.link = message?.url || '';
            trialObject.createdAt = date;
            const trial = await trialRepository.save(trialObject);

            const trialParticipants: TrialParticipation[] = [];
            fields.forEach((member: APIEmbedField) => {
                if (member.value != '`Empty`' && !member.value.includes('Trialee')) {
                    const userIdRegex = /<@(\d+)>/;
                    const userIdMatch = member.value.match(userIdRegex);
                    if (userIdMatch) {
                        const participant = new TrialParticipation();
                        participant.participant = userIdMatch[1];;
                        participant.role = member.name;
                        participant.trial = trial;
                        participant.createdAt = date;
                        trialParticipants.push(participant);
                    }
                }
            });

            const participantReposittory = dataSource.getRepository(TrialParticipation);
            await participantReposittory.save(trialParticipants);
        }
        
        return;
    }

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });
        
        const naChannel = await this.client.channels.fetch('954775172609630218') as TextChannel;
        const euChannel = await this.client.channels.fetch('765479967114919937') as TextChannel;        
        const oldEuChannel = await this.client.channels.fetch('1053834651791265792') as TextChannel;
        const oldNaChannel = await this.client.channels.fetch('1053834698654224474') as TextChannel;

        // Create message pointer
        let message = await naChannel.messages
          .fetch({ limit: 1 })
          .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));
      
        while (message) {
          await naChannel.messages
            .fetch({ limit: 100, before: message.id })
            .then(messagePage => {
              messagePage.forEach(msg => 
                //messages.push(msg)
                this.saveIfTrial(msg)
            );
      
              // Update our message pointer to be the last message on the page of messages
              message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
            });
        }

        message = await euChannel.messages
          .fetch({ limit: 1 })
          .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));
      
        while (message) {
          await euChannel.messages
            .fetch({ limit: 100, before: message.id })
            .then(messagePage => {
              messagePage.forEach(msg => 
                //messages.push(msg)
                this.saveIfTrial(msg)
            );
      
              // Update our message pointer to be the last message on the page of messages
              message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
            });
        }

        message = await oldEuChannel.messages
          .fetch({ limit: 1 })
          .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));
      
        while (message) {
          await oldEuChannel.messages
            .fetch({ limit: 100, before: message.id })
            .then(messagePage => {
              messagePage.forEach(msg => 
                //messages.push(msg)
                this.saveIfTrial(msg)
            );
      
              // Update our message pointer to be the last message on the page of messages
              message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
            });
        }

        message = await oldNaChannel.messages
          .fetch({ limit: 1 })
          .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));
      
        while (message) {
          await oldNaChannel.messages
            .fetch({ limit: 100, before: message.id })
            .then(messagePage => {
              messagePage.forEach(msg => 
                //messages.push(msg)
                this.saveIfTrial(msg)
            );
      
              // Update our message pointer to be the last message on the page of messages
              message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
            });
        }

        await interaction.editReply('done');
    }
}

