import BotInteraction from '../../types/BotInteraction';
import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, User, Role } from 'discord.js';

interface TrialledRole {
    key: string;
    role: Role;
}

export default class ChangeTrialCard extends BotInteraction {
    get name() {
        return 'change-trial-card';
    }

    get description() {
        return 'Change Time, Trialee Role or Host of a Trial Card';
    }

    get permissions() {
        return 'TRIAL_HOST';
    }

    get roleOptions() {
        const assignOptions: any = {
            'Magic Minion Tank': 'magicMT',
            'Magic Base': 'magicBase',
            'Range Minion Tank': 'rangeMT',
            'Range Base': 'rangeBase',
            'Range Hammer': 'chinner',
            'Magic/Range Minion Tank': 'mrMT',
            'Magic/Range Hammer': 'mrHammer',
            'Magic/Range Base': 'mrBase',
            'Necromancy Base': 'necroBase',
            'Necromancy Hammer': 'necroHammer',
            'Necromancy Minion Tank': 'necroMT',
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
            .addStringOption((option) => option.setName('message_id').setDescription('Trial Card message ID').setRequired(true))            
            .addStringOption((option) => option.setName('role').setDescription('Trialee Role').addChoices(
                ...this.roleOptions
            ).setRequired(false))
            .addUserOption((option) => option.setName('host').setDescription('Trial Host').setRequired(false))
            .addStringOption((option) => option.setName('time').setDescription('Time of trial. Must be in the format YYYY-MM-DD HH:MM in Gametime. e.g. 2022-11-05 06:00').setRequired(false));
    }

    public getTrialledRole = async (interaction: ChatInputCommandInteraction, roleKey: string): Promise<TrialledRole | undefined> => {
        const { roles, stripRole } = this.client.util;
        if (!roles[roleKey]) return;
        const roleObject = await interaction.guild?.roles.fetch(stripRole(roles[roleKey])) as Role;
        return {
            key: roles[roleKey],
            role: roleObject
        };
    }

    public parseTime = (timeString: string): string => {
        const [date, time] = timeString.split(' ');
        const [year, month, day] = date.split('-').map(Number);
        const [hours, minutes] = time.split(':').map(Number);
        const gametime = new Date(Date.UTC(year, month - 1, day, hours, minutes))
        return `<t:${Math.round(gametime.getTime() / 1000)}:f>`;
    }

    public parseRelativeTime = (timeString: string): string => {
        const [date, time] = timeString.split(' ');
        const [year, month, day] = date.split('-').map(Number);
        const [hours, minutes] = time.split(':').map(Number);
        const gametime = new Date(Date.UTC(year, month - 1, day, hours, minutes))
        return `<t:${Math.round(gametime.getTime() / 1000)}:R>`;
    }

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });
        const role: string | null = interaction.options.getString('role', false);
        const user: User | null = interaction.options.getUser('host', false);        
        const messageId: string = interaction.options.getString('message_id', true);
        const time: string | null = interaction.options.getString('time', false);

        const { colours } = this.client.util;

        const message = await interaction.channel?.messages.fetch(messageId);

        let errorEmbed = new EmbedBuilder()
            .setTitle('Something went wrong!')
            .setColor(colours.discord.red);

        if (!message || !message.embeds[0]) {
            errorEmbed.setDescription('Message with given ID could not be found.');
            return await interaction.editReply({ embeds: [errorEmbed] });
        }

        if (message.embeds[0].description?.includes('started')) {
            errorEmbed.setDescription('This trial has already started.')
            return await interaction.editReply({ embeds: [errorEmbed] });
        }

        if (time) {
            const timeExpression = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;
            const isValid = timeExpression.test(time);
            if (!isValid) {
                errorEmbed.setDescription('The trial `time` was not in the expected format.');
                return await interaction.editReply({ embeds: [errorEmbed] });
            }
        }

        // Errors passed, now assign to the correct role as override.
        // Clone the embed completely

        let description: string = message.embeds[0].description ? message.embeds[0].description : '';

        //check if host changed
        if (user){
            let userId: string = '';
            const expression: RegExp = /\`Host:\` <@(\d+)>/;
            if (description){
                const matches = description.match(expression);
                userId = matches ? matches[1] : '';
                if (userId != user.id){
                    description = description.replace(`\`Host:\` <@${userId}>`, `\`Host:\` <@${user.id}>`);                    
                }
            }
        }

        //check if trialee role changed
        if (role){
            const roleInfo = await this.getTrialledRole(interaction, role);

            let roleId: string = '';
            const expression: RegExp = /\`Tag:\` <@&(\d+)>/;
            if (description){
                const matches = description.match(expression);
                roleId = matches ? matches[1] : '';
                if (roleId != roleInfo?.role.id){
                    description = description.replace(`\`Tag:\` <@&${roleId}>`, `\`Tag:\` <@&${roleInfo?.role.id}>`)
                }
            }
        }

        //check if time changed
        if (time){
            let parsedTime: string = '';
            let parsedLocalTime: string = '';
            let parsedRelativeTime: string = '';
            const timeExpression: RegExp = /\`Game Time:\` \`((\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}))\`/;
            const localTimeExpression: RegExp = /\`Local Time:\` <t:(\d+):f>/;
            const relativeTimeExpression: RegExp = /\`Relative Time:\` <t:(\d+):R>/;
            if (description){
                const matchesTime = description.match(timeExpression);
                parsedTime = matchesTime ? `${matchesTime[1]}-${matchesTime[2]}-${matchesTime[3]} ${matchesTime[4]}:${matchesTime[5]}` : '';
                if (parsedTime != time){
                    description = description.replace(`\`Game Time:\` \`${parsedTime}\``, `\`Game Time:\` \`${time}\``);
                }

                const matchesLocalTime = description.match(localTimeExpression);
                parsedLocalTime = matchesLocalTime ? matchesLocalTime[1] : '';
                if (`<t:${parsedLocalTime}:f>` != this.parseTime(time)){
                    description = description.replace(`\`Local Time:\` <t:${parsedLocalTime}:f>`, `\`Local Time:\` ${this.parseTime(time)}`);
                }
                
                const matchesRelativeTime = description.match(relativeTimeExpression);
                parsedRelativeTime = matchesRelativeTime ? matchesRelativeTime[1] : '';
                if (`<t:${parsedRelativeTime}:R>` != this.parseRelativeTime(time)){
                    description = description.replace(`\`Relative Time:\` <t:${parsedRelativeTime}:R>`, `\`Relative Time:\` ${this.parseRelativeTime(time)}`);
                }
            }
        }

        const newEmbed = new EmbedBuilder()
            .setColor(message.embeds[0].color)
            .setDescription(description);

        const currentFields = message.embeds[0].fields;

        newEmbed.setFields(currentFields);

        await message.edit({embeds: [newEmbed]});

        const replyEmbed = new EmbedBuilder()
            .setTitle(`Trial Card successfully changed`)
            .setColor(colours.discord.green)
            .setDescription(`Trial Card successfully changed`);
        await interaction.editReply({ embeds: [replyEmbed] });
    }
}
