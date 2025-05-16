import * as config from '../../config.json';
import { EmbedBuilder, ChatInputCommandInteraction, Interaction, APIEmbedField, ActionRowBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, Role, ButtonBuilder, ButtonStyle} from 'discord.js';
import Bot from '../Bot';
import { Override } from '../entity/Override';
import { get } from 'https';
import { getRoles } from '../GuildSpecifics';

export default interface UtilityHandler {
    client: Bot;
    config: typeof config;
    random(array: Array<any>): Array<number>;
    loadingEmbed: EmbedBuilder;
    loadingText: string;
}

interface Emojis {
    [emojiName: string]: string;
}

interface EmojiIds{
    [emojiName: string]: string;
}

interface Messages {
    [messageId: string]: string;
}

interface Categories {
    killCount: string[]
    collectionLog: string[]
    vanity: string[]
}

interface Hierarchy {
    [key: string]: string[];
}

export default class UtilityHandler {
    constructor(client: Bot) {
        this.client = client;
        this.config = config;
        this.random = (array) => array[Math.floor(Math.random() * array.length)];
        this.deleteMessage = this.deleteMessage;
        this.loadingEmbed = new EmbedBuilder().setAuthor({ name: 'Loading...' });
        this.loadingText = '<a:Typing:598682375303593985> **Loading...**';
    }

    get colours() {
        return {
            green: 2067276,
            aqua: 1146986,
            blue: 2123412,
            red: 10038562,
            lightgrey: 10070709,
            gold: 12745742,
            default: 5198940,
            lightblue: 302332,
            darkgrey: 333333,
            discord: {
                green: 5763719,
                red: 15548997
            }
        }
    }

    get emojis(): Emojis {
        return {
            gem1: '<:gem1:1280931384705286247>',
            gem2: '<:gem2:1280931392720736349>',
            gem3: '<:gem3:1280931401113538600>',
            umbra: '<:umbra:1280930967254466651>',
            glacies: '<:glacies:1280931011152187452>',
            cruor: '<:cruor:1280931029275771040>',
            fumus: '<:fumus:1280931047751553059>',
            voke: '<:voke:1280932058822082651>',
            hammer: '<:hammer:1280932043060150293>',
            freedom: '<:freedom:1280932068984885269>',
        }
    }

    get emojiIds(): EmojiIds{
	return {
            greenSanta: '1311760443454521458',
            redSanta: '1311760398185140254',
            purpleSanta: '1311760427402919986',
            blueSanta: '1311760418515058688',
            pinkSanta: '1311760407676846100',
            blackSanta: '1311760435581681687',
        }
    }

    get messages(): Messages {
        if (process.env.ENVIRONMENT === 'DEVELOPMENT') {
            return {
                mockTrialReacts: '1370325376110428230',
            }
        }
        return {
            mockTrialReacts: '1360666087393329392',
        }
    }
    
    // register all roles that have an cosmetic colour override role (same name with prefex colour_)
    // limit at 25 roles per list
    get cosmeticTrialedRoleNames(): string[]{
        return [
            'nexAodFCMember',
            'fourMan',
            'sevenMan',            
            'fallenAngel', 
            'trialTeam',
            'nightmareOfNihils',            
        ];
    }

    get cosmeticCollectionRoleNames(): string[]{
        return [            
            'ofThePraesul', 
            'goldenPraesul',
            'elementalist', 
            'sageOfElements', 
            'masterOfElements', 
            'praetorianLibrarian', 
            'coreRupted', 
            'ollivandersSupplier',
            'smokeDemon', 
            'shadowCackler', 
            'truebornVampyre', 
            'glacyteOfLeng',             
        ];
    }

    get cosmeticKcRoleNames(): string[]{
        return [
            'kc10k',
            'kc20k',
            'kc30k',
            'kc40k',
            'kc50k',
            'kc60k',
            'kc70k',
            'kc80k',
            'kc90k',
            'kc100k'
        ];
    }

    get christmasSantaRolesNames(): string[]{
        return [
            'greenSanta',
            'redSanta',
            'purpleSanta',
            'blueSanta',
            'pinkSanta',
            'blackSanta'
        ];
    }

    get categories(): Categories {
        return {
            killCount: ['kc10k', 'kc20k', 'kc30k', 'kc40k', 'kc50k', 'kc60k', 'kc70k', 'kc80k', 'kc90k', 'kc100k'],
            collectionLog: ['ofThePraesul', 'goldenPraesul'],            
            vanity: ['fallenAngel', 'nightmareOfNihils', 'elementalist', 'sageOfElements', 'masterOfElements', 'smokeDemon', 'shadowCackler', 'truebornVampyre', 'glacyteOfLeng', 'praetorianLibrarian', 'coreRupted', 'ollivandersSupplier'],
        }
    }

    get hierarchy(): Hierarchy {
        return {
            collectionLog: ['ofThePraesul', 'goldenPraesul'],
            killCount: ['kc10k', 'kc20k', 'kc30k', 'kc40k', 'kc50k', 'kc60k', 'kc70k', 'kc80k', 'kc90k', 'kc100k'],
            vanity: ['fallenAngel', 'nightmareOfNihils', 'elementalist', 'sageOfElements', 'masterOfElements', 'smokeDemon', 'shadowCackler', 'truebornVampyre', 'glacyteOfLeng', 'praetorianLibrarian', 'coreRupted', 'ollivandersSupplier'],
        }
    }

    public stripRole = (role: string) => {
        return role.slice(3, -1)
    }

    public getKeyFromValue = (obj: any, value: string): any => {
        return Object.keys(obj).find(key => obj[key] === value)
    }

    public categorize = (role: string): string => {
        let category = '';
        if (this.categories.killCount.includes(role)) {
            category = 'killCount';
        } else if (this.categories.collectionLog.includes(role)) {
            category = 'collectionLog';
        } else if (this.categories.vanity.includes(role)) {            
            category = 'vanity';
        } else {
            category = ''
        }
        return category;
    }

    public categorizeChannel = (role: string) => {
        if (this.categories.killCount.includes(role) || this.categories.collectionLog.includes(role) || this.categories.vanity.includes(role)) {
            return 'achievementsAndLogs'
        } else {
            return ''
        }
    }

    public hasRolePermissions = async (client: Bot, roleList: string[], interaction: Interaction) => {
        if (!interaction.inCachedGuild()) return;
        const validRoleIds = roleList.map((key) => this.stripRole(getRoles(interaction.guild.id)[key]));
        const user = await interaction.guild.members.fetch(interaction.user.id);
        const userRoles = user.roles.cache.map((role) => role.id);
        const intersection = validRoleIds.filter((roleId) => userRoles.includes(roleId));
        return intersection.length > 0;
    }

    public hasOverridePermissions = async (interaction: Interaction, feature: string) => {
        if (!interaction.inCachedGuild()) return;
        const { dataSource } = this.client;
        const repository = dataSource.getRepository(Override);

        const existingPermissions = await repository.findOne({
            where: {
                user: interaction.user.id,
                feature: feature
            }
        })

        return existingPermissions ? true : false;
    }

    public deleteMessage(interaction: ChatInputCommandInteraction<any>, id: string) {
        return interaction.channel?.messages.fetch(id).then((message) => message.delete());
    }

    public removeArrayIndex(array: Array<any>, indexID: number): any[] {
        return array.filter((_: any, index) => index != indexID - 1);
    }

    public checkURL(string: string): boolean {
        try {
            new URL(string);
            return true;
        } catch (error) {
            return false;
        }
    }

    public trim(string: string, max: number): string {
        return string.length > max ? string.slice(0, max) : string;
    }

    public convertMS(ms: number | null): string {
        if (!ms) return 'n/a';
        let seconds = (ms / 1000).toFixed(1),
            minutes = (ms / (1000 * 60)).toFixed(1),
            hours = (ms / (1000 * 60 * 60)).toFixed(1),
            days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);
        if (Number(seconds) < 60) return seconds + ' Sec';
        else if (Number(minutes) < 60) return minutes + ' Min';
        else if (Number(hours) < 24) return hours + ' Hrs';
        else return days + ' Days';
    }

    public convertBytes(bytes: number): string {
        const MB = Math.floor((bytes / 1024 / 1024) % 1000);
        const GB = Math.floor(bytes / 1024 / 1024 / 1024);
        if (MB >= 1000) return `${GB.toFixed(1)} GB`;
        else return `${Math.round(MB)} MB`;
    }

    public isValidTime = (timeString: string): boolean => {
        const pattern = /^(0?[0-9]|1[0-9]|2[0-3]):([0-9]|[0-5][0-9])(\.[0-9])?$/gm;
        return pattern.test(timeString);
    }

    public isValidDamage = (damageString: string): boolean => {
        return !isNaN(+damageString);
    }

    public calcDPMInThousands(damage: string, time: string) {
        const [minutes, seconds] = time.split(':').map(Number);
        const secondsAsMinutes = seconds / 60;
        const totalMinutes = minutes + secondsAsMinutes;
        return Math.round((+damage) / totalMinutes / 10) / 100;
    }

    public checkForUserId = (userId: string, objects: APIEmbedField[]): { obj: APIEmbedField, index: number } | undefined => {
        for (let i = 0; i < objects.length; i++) {
            if (objects[i].value.includes(userId)) {
                return { obj: objects[i], index: i };
            }
        }
        return undefined;
    };

    public getEmptyObject(targetName: string, objects: APIEmbedField[]): { obj: APIEmbedField, index: number } | undefined {
        const index = objects.findIndex(obj => obj.name.includes(targetName) && obj.value === '`Empty`');
        if (index >= 0) {
            const obj = objects[index];
            return { obj: obj, index: index };
        }
        return undefined;
    }

    public isTeamFull(players: APIEmbedField[]): boolean {
        for (const player of players) {
            if (player.value === '`Empty`') {
                return false;
            }
        }
        return true;
    }

    public getTeamCount(players: APIEmbedField[]): number {
        let maxPlayers = 7;
        for (const player of players) {
            if (player.value === '`Empty`') {
                maxPlayers = maxPlayers - 1;
            }
        }
        return maxPlayers;
    }

    public async getColourPanelComponents(interaction: any): Promise<ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[]>{
        let options: any[] = [];
        let options2: any[] = [];
        let options3: any[] = [];

        for (const entry of this.cosmeticTrialedRoleNames){
            const checkRoleObject = await interaction.guild?.roles.fetch(this.stripRole(getRoles(interaction.guild.id)[entry])) as Role;

            if (checkRoleObject){
                let nextEntry = new StringSelectMenuOptionBuilder()
                    .setLabel(checkRoleObject.name)
                    .setDescription(`Override your colour to that of the ${checkRoleObject.name}-Tag!`)
                    .setValue(entry);

                if (checkRoleObject.icon != null){
//                    nextEntry.setEmoji(checkRoleObject.icon);
                }

                options.push(nextEntry);                
            }
        }

        for (const entry of this.cosmeticCollectionRoleNames){
            const checkRoleObject = await interaction.guild?.roles.fetch(this.stripRole(getRoles(interaction.guild.id)[entry])) as Role;

            if (checkRoleObject){
                let nextEntry = new StringSelectMenuOptionBuilder()
                    .setLabel(checkRoleObject.name)
                    .setDescription(`Override your colour to that of the ${checkRoleObject.name}-Tag!`)
                    .setValue(entry);

                if (checkRoleObject.icon != null){
  //                  nextEntry.setEmoji(checkRoleObject.icon);
                }

                options2.push(nextEntry);                
            }
        }

        for (const entry of this.cosmeticKcRoleNames){
            const checkRoleObject = await interaction.guild?.roles.fetch(this.stripRole(getRoles(interaction.guild.id)[entry])) as Role;

            if (checkRoleObject){
                let nextEntry = new StringSelectMenuOptionBuilder()
                    .setLabel(checkRoleObject.name)
                    .setDescription(`Override your colour to that of the ${checkRoleObject.name}-Tag!`)
                    .setValue(entry);

                if (checkRoleObject.icon != null){
    //                nextEntry.setEmoji(checkRoleObject.icon);
                }

                options3.push(nextEntry);                
            }
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('colourOverrideSelect')
            .setPlaceholder('Pick a trialed role colour!')
            .addOptions(
                ...options
            );

        const selectMenu2 = new StringSelectMenuBuilder()
            .setCustomId('colourOverrideSelect2')
            .setPlaceholder('Pick a collection role colour!')
            .addOptions(
                ...options2
            );
        
        const selectMenu3 = new StringSelectMenuBuilder()
            .setCustomId('colourOverrideSelect3')
            .setPlaceholder('Pick a killcount role colour!')
            .addOptions(
                ...options3
            );
            
        const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(selectMenu);

        const actionRow2 = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(selectMenu2);

        const actionRow3 = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(selectMenu3);     
            
        const removeButton = new ButtonBuilder()
            .setCustomId('removeColour')
            .setLabel('Remove')
            .setStyle(ButtonStyle.Danger);

        const removeRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(removeButton);

        return [actionRow, actionRow2, actionRow3, removeRow];
    }

    public async getChristmasColourPanelComponents(interaction: any): Promise<ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[]>{
        let options: any[] = [];
        for (const entry of this.christmasSantaRolesNames){
            const checkRoleObject = await interaction.guild?.roles.fetch(this.stripRole(getRoles(interaction.guild.id)[entry])) as Role;
            if (checkRoleObject){
                let nextEntry = new StringSelectMenuOptionBuilder()
                    .setLabel(checkRoleObject.name)
                    //.setDescription(`${checkRoleObject.name}`)
                    .setValue(entry);
                nextEntry.setEmoji(this.emojiIds[entry]);
                options.push(nextEntry);
            }
        }
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('christmasColourOverrideSelect')
            .setPlaceholder('Pick a santa!')
            .addOptions(
                ...options
            );

        const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(selectMenu);

        const removeButton = new ButtonBuilder()
            .setCustomId('removeChristmasColour')
            .setLabel('Remove')
            .setStyle(ButtonStyle.Danger);
        const removeRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(removeButton);
        return [actionRow, removeRow];
    }

    public async fetchTextFile(url: string): Promise<string>{
        return new Promise((resolve, reject) => {
          get(url, (res) => {
            const { statusCode } = res;
            const contentType = res.headers['content-type'];
      
            // Check for HTTP status errors
            if (statusCode !== 200) {
              reject(new Error(`Request Failed. Status Code: ${statusCode}`));
              res.resume();
              return;
            }
      
            // Ensure we are getting a text content type
            if (!/^text\/plain/.test(contentType || '')) {
              reject(new Error(`Invalid content-type. Expected text/plain but received ${contentType}`));
              res.resume();
              return;
            }
      
            res.setEncoding('utf8');
            let data = '';
      
            // Collect the data chunks
            res.on('data', (chunk: string) => {
              data += chunk;
            });
      
            // When the response has ended, resolve the promise with the data
            res.on('end', () => {
              resolve(data);
            });
      
          }).on('error', (err) => {
            reject(err);
          });
        });
      };
}
