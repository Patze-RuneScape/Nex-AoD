import BotInteraction from '../../types/BotInteraction';
import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, Role, TextChannel, User } from 'discord.js';

interface Categories {
    [category: string]: string[];
}

interface TrialledRole {
    key: string;
    role: Role;
}

export default class Pass extends BotInteraction {
    get name() {
        return 'start-trial';
    }

    get description() {
        return 'Starts a Trial';
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

    get trialOptions() {
        const trialTypes: any = {
            'Mock': 'mock',
            'Real': 'real',
        }
        const options: any = [];
        Object.keys(trialTypes).forEach((key: string) => {
            options.push({ name: key, value: trialTypes[key] })
        })
        return options;
    }

    get categories(): Categories {
        return {
            base: ['magicBase', 'mrBase', 'necroBase'],
            glacies: ['mrMT', 'necroMT', 'rangeMT', 'magicMT'],
            hammer: ['chinner', 'mrHammer', 'necroHammer'],
        }
    }

    get slashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addUserOption((option) => option.setName('user').setDescription('Trialee').setRequired(true))
            .addStringOption((option) => option.setName('role').setDescription('Trialee preferred role').addChoices(
                ...this.roleOptions
            ).setRequired(true))
            .addStringOption((option) => option.setName('region').setDescription('Trial world').addChoices(
                ...this.regionOptions
            ).setRequired(true))
            .addStringOption((option) => option.setName('trialtype').setDescription('Trial type').addChoices(
                ...this.trialOptions
            ).setRequired(true))
            .addStringOption((option) => option.setName('time').setDescription('Time of trial. Must be in the format YYYY-MM-DD HH:MM in Gametime. e.g. 2022-11-05 06:00').setRequired(false))
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

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });
        const role: string = interaction.options.getString('role', true);
        const user: User = interaction.options.getUser('user', true);
        const region: string = interaction.options.getString('region', true);
        const trialType: string = interaction.options.getString('trialtype', true);
        const time: string | null = interaction.options.getString('time', false);

        const { colours, channels, emojis } = this.client.util;

        const expression = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;

        let errorMessage = '';

        let finalDate = '';

        if (time) {
            const isValid = expression.test(time);
            if (!isValid) {
                errorMessage += '\n\nThe trial `time` was not in the expected format.'
            }
        } else {
            const currentYear = new Date().getUTCFullYear();
            const currentMonth = new Date().getUTCMonth();
            const currentDate = new Date().getUTCDate();

            //Check if UTC 19 is 21 in Middle-Europe, if not add one hour
            //NA is fix 23:59
            //EU is 19 during summer time and 20 during winter time
            const hours = new Date(Date.UTC(currentYear, currentMonth, currentDate, 19, 0)).toLocaleString('de-DE', {hour: '2-digit',   hour12: false, timeZone: 'Europe/Berlin' }).substring(0, 2) == '21' ? 19 : 20;            

            let finalDateObject;
            if (region === 'North America') {
                finalDateObject = new Date(Date.UTC(currentYear, currentMonth, currentDate, 23, 59));
            } else {
                finalDateObject = new Date(Date.UTC(currentYear, currentMonth, currentDate, hours, 0));
            }
            finalDate = region === 'North America' ? finalDateObject.toISOString().substring(0, 16) : finalDateObject.toISOString().substring(0, 16);
            finalDate = finalDate.replace('T', ' ');
        }

        const errorEmbed = new EmbedBuilder()
            .setTitle('Something went wrong!')
            .setColor(colours.discord.red)
            .setDescription(errorMessage || 'No error message.');
        if (time) {
            const isValid = expression.test(time);
            if (!isValid) {
                return await interaction.editReply({ embeds: [errorEmbed] });
            }
        }

        const roleInfo = await this.getTrialledRole(interaction, role);

        let channelId: string;
        if (region === 'German') {
            if (trialType === 'mock') {
                channelId = channels.euMock;
            } else {
                channelId = channels.euTrial;
            }
        } else {
            if (trialType === 'mock') {
                channelId = channels.naMock;
            } else {
                channelId = channels.naTrial;
            }
        }

        const firstRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('selectUmbra')
                    .setEmoji(emojis.umbra)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('selectGlacies')
                    .setEmoji(emojis.glacies)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('selectCruor')
                    .setEmoji(emojis.cruor)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('selectFumus')
                    .setEmoji(emojis.fumus)
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('selectHammer')
                    .setEmoji(emojis.hammer)
                    .setStyle(ButtonStyle.Secondary),
            );

        const secondRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('selectBase')
                    .setLabel('Base')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('selectFree')
                    .setLabel('Free')
                    .setStyle(ButtonStyle.Secondary),
            );

        const controlPanel = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('startTrial')
                    .setLabel('Start Trial')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('disbandTrial')
                    .setLabel('Disband')
                    .setStyle(ButtonStyle.Danger)
            );

        const checkRole = (category: string) => {
            return this.categories[category].includes(role) ? `<@${user.id}> (Trialee)` : '`Empty`';
        }

        let fields;

        fields = [
            { name: `${emojis.voke} Base`, value: checkRole('base'), inline: true },
            { name: `${emojis.umbra} Umbra`, value: '`Empty`', inline: true },
            { name: `${emojis.glacies} Glacies`, value: checkRole('glacies'), inline: true },
            { name: `${emojis.cruor} Cruor`, value: '`Empty`', inline: true },
            { name: `${emojis.fumus} Fumus`, value: '`Empty`', inline: true },
            { name: `${emojis.hammer} Hammer`, value: checkRole('hammer'), inline: true },
            { name: `${emojis.freedom} Free`, value: '`Empty`', inline: true },
        ]

        const embed = new EmbedBuilder()
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() || this.client.user?.avatarURL() || 'https://media.discordapp.net/attachments/1027186342620299315/1047598720834875422/618px-Solly_pet_1.png' })
            .setColor(roleInfo?.role.color || colours.lightblue)
            .setDescription(`
            > **General**\n
            \`Host:\` <@${interaction.user.id}>
            \`Type:\` ${trialType === 'mock' ? 'Mock Trial' : 'Real Trial'}
            ${time ?
                    `\`Game Time:\` \`${time}\`
                    \`Local Time:\` ${this.parseTime(time)}`
                    :
                    `\`Game Time:\` \`${finalDate}\`
                    \`Local Time:\` ${this.parseTime(finalDate)}`}
            \`World:\` ${region}\n
            > **Trialee**\n
            \`Discord:\` <@${user.id}>
            \`Tag:\` ${roleInfo?.key}\n
            > **Team**
            `)
            .addFields(
                fields
            )
            .setFooter({ text: '1/7 Players' });

        const channel = await this.client.channels.fetch(channelId) as TextChannel;
        await channel.send(
            { embeds: [embed], components: [firstRow, secondRow, controlPanel] }
        )

        const replyEmbed = new EmbedBuilder()
            .setTitle('Trial card created!')
            .setColor(colours.discord.green)
            .setDescription(`Trial card has been posted in <#${channelId}>`);
        await interaction.editReply({ embeds: [replyEmbed] });
    }
}