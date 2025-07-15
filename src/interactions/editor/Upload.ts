import BotInteraction from '../../types/BotInteraction';
import { Attachment, ChatInputCommandInteraction, SlashCommandBuilder, TextChannel, ChannelType, Message, MessageFlags } from 'discord.js';
import { parseTree, getNodeValue, ParseError } from 'jsonc-parser';
import * as fs from 'fs/promises';
import * as path from 'path';

type ParsedMessage = {
    content: string;
    embeds: any[];
    rawEmbeds?: string[];
    nameTag?: string;
    hasPlaceholders?: boolean;
    sentMessage?: Message;
    pinAndDeleteOld?: boolean;
    components: any[];
    rawComponents?: string[];
};

function getErrorMessageForCode(e: number): string {
    switch (e) {
        case 1: return 'Invalid symbol';
        case 2: return 'Invalid number format';
        case 3: return 'Property name expected';
        case 4: return 'Value expected';
        case 5: return 'Colon expected';
        case 6: return 'Comma expected';
        case 7: return 'Closing brace expected';
        case 8: return 'Closing bracket expected';
        case 9: return 'End of file expected';
        case 10: return 'Invalid comment token';
        case 11: return 'Unexpected end of comment';
        case 12: return 'Unexpected end of string';
        case 13: return 'Unexpected end of number';
        case 14: return 'Invalid unicode';
        case 15: return 'Invalid escape character';
        case 16: return 'Invalid character';
        default: return 'Unknown parse error';
    }
}

class ParsingError extends Error {
    constructor(message: string, public errors: { description: string, summary: string, correctedCode: string }[]) {
        super(message);
        this.name = 'ParsingError';
    }
}

export default class Upload extends BotInteraction {
    get name() {
        return 'upload';
    }

    get description() {
        return 'Upload and parse a text file to send as Discord messages';
    }

    get permissions() {
        return 'EDITOR';
    }

    get slashData() {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addAttachmentOption((option) =>
                option
                    .setName('file')
                    .setDescription('The text file to parse and send')
                    .setRequired(true)
            )
            .addChannelOption((option) =>
                option
                    .setName('channel')
                    .setDescription('Which channel to send the message to')
                    .setRequired(false)
                    .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            );
    }

    async run(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const attachment: Attachment | null = interaction.options.getAttachment('file', true);
        const targetChannel = (interaction.options.getChannel('channel', false) || interaction.channel) as TextChannel;

        if (!attachment) {
            return await interaction.editReply({ content: 'No file was provided.' });
        }

        if (!targetChannel || !('send' in targetChannel)) {
            return await interaction.editReply({
                content: 'Invalid channel selected. Please choose a text channel.'
            });
        }

        if (!attachment.name?.endsWith('.txt') && attachment.contentType !== 'text/plain') {
            return await interaction.editReply({
                content: 'Please upload a valid text file (.txt).'
            });
        }

        if (attachment.size > 5 * 1024 * 1024) {
            return await interaction.editReply({
                content: 'File is too large. Please upload a file smaller than 5MB.'
            });
        }

        try {
            const tagsFilePath = path.join(process.cwd(), 'message-tags.json');
            let tags: { [channelId: string]: { [messageId: string]: string } } = {};
            try {
                const rawData = await fs.readFile(tagsFilePath, 'utf-8');
                tags = JSON.parse(rawData);
            } catch (error) {
                this.client.logger.error({ message: 'INFO: message-tags.json not found or invalid, starting fresh. This is expected on first run.', handler: this.name, error: error as Error });
            }

            const response = await fetch(attachment.url);
            const fileContent = await response.text();

            try {
                const archiveDir = path.join(process.cwd(), 'upload_archives');
                await fs.mkdir(archiveDir, { recursive: true });
                const timestamp = new Date().toISOString().replace(/:/g, '-');
                const archiveFileName = `${timestamp}_${targetChannel.name}_${attachment.name}`;
                const archiveFilePath = path.join(archiveDir, archiveFileName);
                await fs.writeFile(archiveFilePath, fileContent);
            } catch (archiveError) {
                this.client.logger.error({
                    message: 'Failed to archive uploaded file.',
                    handler: this.name,
                    error: archiveError as Error
                });
            }

            if (!fileContent.trim()) {
                return await interaction.editReply({
                    content: 'The uploaded file is empty.'
                });
            }

            const parsedParts: ParsedMessage[] = this.parseFileContent(fileContent);

            const hasLinkErrors = await this.checkForLinkErrors(parsedParts, interaction);
            if (hasLinkErrors) {
                return;
            }

            const uploadPromises: Promise<void>[] = [];
            for (const part of parsedParts) {
                for (const embed of part.embeds) {
                    if (embed.thumbnail?.url) {
                        uploadPromises.push(
                            this.client.util.reuploadImage(embed.thumbnail.url).then(newUrl => {
                                embed.thumbnail.url = newUrl;
                            })
                        );
                    }
                    if (embed.image?.url) {
                        uploadPromises.push(
                            this.client.util.reuploadImage(embed.image.url).then(newUrl => {
                                embed.image.url = newUrl;
                            })
                        );
                    }
                }
            }
            await Promise.all(uploadPromises);

            const sentMessageCount = parsedParts.filter(p => p.content || p.embeds.length > 0).length;

            await interaction.editReply({
                content: `Successfully parsed your file. Sending ${sentMessageCount} message(s) to ${targetChannel === interaction.channel ? 'this channel' : `<#${targetChannel.id}>`}. This may take a moment...`
            });

            const tagToUrlMap = new Map<string, string>();
            const messagesToEdit: ParsedMessage[] = [];

            // 1st Pass: Send messages and map tags
            try {
                for (const part of parsedParts) {
                    const { content, embeds, components } = part;
                    if (!content && embeds.length === 0 && components.length === 0) {
                        continue;
                    }

                    // Convert emojis in content and embeds
                    const finalContent = content ? this.convertEmojis(content, interaction) : '';
                    const finalEmbeds = embeds.map(embed => this.convertEmbedEmojis(embed, interaction));
                    const finalComponents = components.map(comps => this.convertComponentsV2Emojis(comps, interaction));

                    let sentMessage;

                    if (finalComponents.length > 0) {
                        sentMessage = await targetChannel.send({
                            components: finalComponents,
                            flags: MessageFlags.IsComponentsV2,
                            allowedMentions: { "parse": [] }
                        });
                    } else {
                        sentMessage = await targetChannel.send({
                            content: finalContent || undefined,
                            embeds: finalEmbeds,
                            allowedMentions: { "parse": [] }
                        });
                    }

                    part.sentMessage = sentMessage;

                    if (part.nameTag) {
                        if (!tags[targetChannel.id]) {
                            tags[targetChannel.id] = {};
                        }

                        const oldMessageId = Object.keys(tags[targetChannel.id]).find(
                            (msgId) => tags[targetChannel.id][msgId] === part.nameTag
                        );
                        if (oldMessageId) {
                            if (part.pinAndDeleteOld) {
                                try {
                                    const oldMessage = await targetChannel.messages.fetch(oldMessageId);
                                    await oldMessage.delete();
                                } catch (e) {
                                    this.client.logger.error({ message: `Could not delete old tagged message ${oldMessageId}`, error: e as Error});
                                }
                            }
                            delete tags[targetChannel.id][oldMessageId];
                        }

                        tags[targetChannel.id][sentMessage.id] = part.nameTag;
                        tagToUrlMap.set(part.nameTag, sentMessage.url);
                    }

                    // Always pin messages that contain Table of Contents
                    const hasTableOfContents = finalEmbeds.some(embed => embed.title && embed.title.toLowerCase().includes('table of contents'))
                                                || components.some(comps => comps.components.some((component: any) => component.type === 10 && component.content.toLowerCase().includes('table of contents')));

                    if (hasTableOfContents) {
                        try {
                            await sentMessage.pin();
                            this.client.logger.log({ message: `Successfully pinned Table of Contents message ${sentMessage.id}` }, true);

                            // Wait a moment for Discord to create the pin notification system message
                            await new Promise(resolve => setTimeout(resolve, 1500));

                            // Only delete the pin notification if .pin:delete is present in the file
                            if (part.pinAndDeleteOld) {
                                try {
                                    const messages = await targetChannel.messages.fetch({ limit: 10 });
                                    const pinNotification = messages.find(msg =>
                                        msg.type === 6 && // MessageType.ChannelPinnedMessage
                                        msg.createdTimestamp > sentMessage.createdTimestamp
                                    );

                                    if (pinNotification) {
                                        await pinNotification.delete();
                                        this.client.logger.log({ message: `Successfully deleted pin notification system message ${pinNotification.id}` }, true);
                                    } else {
                                        this.client.logger.log({ message: `No pin notification system message found to delete` }, true);
                                    }
                                } catch (deleteError) {
                                    this.client.logger.error({ message: `Could not delete pin notification system message`, error: deleteError as Error});
                                }
                            }
                        } catch(e) {
                            this.client.logger.error({ message: `Could not pin message ${sentMessage.id}`, error: e as Error});
                        }
                    }
                    if (part.hasPlaceholders) {
                        messagesToEdit.push(part);
                    }
                }
            } catch (e: any) {
			this.client.logger.error({
                    error: e,
                    handler: this.name,
                    message: 'Error sending message with embed'
                });

                let errorDetails = 'An error occurred while sending a message. This is likely due to an invalid embed structure.';
                if (e.rawError?.errors?.embeds) {
                    const embedErrors = e.rawError.errors.embeds;
                    const errorIndex = Object.keys(embedErrors)[0];
                    const errorPath = Object.keys(embedErrors[errorIndex])[0];
                    const errorMessage = embedErrors[errorIndex][errorPath]._errors[0].message;

                    errorDetails = `**Invalid Embed Structure:**\n> **Error in field \`${errorPath}\` of an embed:**\n> ${errorMessage}`;
                }

                await interaction.followUp({
                    content: errorDetails,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            // 2nd Pass: Edit messages with placeholders
            if (messagesToEdit.length > 0) {
                for (const partToEdit of messagesToEdit) {
                    if (!partToEdit.sentMessage) continue;

                    let newContent = partToEdit.content;
                    if (newContent) {
                        newContent = this.resolvePlaceholders(newContent, tagToUrlMap, { channelId: targetChannel.id });
                        newContent = this.convertEmojis(newContent, interaction);
                    }

                    // Resolve placeholders in embeds too
                    const newEmbeds = partToEdit.embeds.map(embed => {
                        let embedString = JSON.stringify(embed);
                        embedString = this.resolvePlaceholders(embedString, tagToUrlMap, { channelId: targetChannel.id });
                        const resolvedEmbed = JSON.parse(embedString);
                        return this.convertEmbedEmojis(resolvedEmbed, interaction);
                    });

                    try {
                        await partToEdit.sentMessage.edit({
                            content: newContent || undefined,
                            embeds: newEmbeds
                        });
                    } catch (e) {
                        this.client.logger.error({ message: `Failed to edit message ${partToEdit.sentMessage.id}`, error: e as Error });
                            }
                        }
                    }

            await fs.writeFile(tagsFilePath, JSON.stringify(tags, null, 2));

            // If we get here, everything was successful with no corrections needed
            await interaction.editReply({ content: 'Your file has been uploaded successfully!' });

        } catch (error: any) {
            if (error instanceof ParsingError) {
                await interaction.editReply({ content: 'Your file had some issues that were corrected. Check the details below.' });

                for (const e of error.errors) {
                    const summary = e.summary;
                    const correctedCode = e.correctedCode;

                    const chunks = this.splitMessage(correctedCode);

                    if (chunks.length > 0) {
                        await interaction.followUp({
                            content: `**${summary}**\n\n**Corrected file:**\n\`\`\`json\n${chunks[0]}\n\`\`\``,
                            flags: MessageFlags.Ephemeral,
                        });
                    }

                    for (let i = 1; i < chunks.length; i++) {
                        await interaction.followUp({
                            content: `\`\`\`json\n${chunks[i]}\n\`\`\``,
                            flags: MessageFlags.Ephemeral,
                        });
                    }
                }
            } else {
                this.client.logger.error({
                    error: error,
                    handler: this.name,
                    message: `An unexpected error occurred in the upload command.`
                });
                 await interaction.editReply({
                    content: 'An unexpected error occurred while processing your file.'
                });
            }
        }
    }

    private splitMessage(text: string, maxLength = 1900): string[] {
        if (text.length <= maxLength) {
            return [text];
        }

        const chunks: string[] = [];
        let remainingText = text;

        while (remainingText.length > 0) {
            if (remainingText.length <= maxLength) {
                chunks.push(remainingText);
                break;
            }

            let splitIndex = maxLength;

            // Prefer splitting after a complete component object.
            const componentBreak = remainingText.lastIndexOf('},\n', splitIndex);
            if (componentBreak > 0) {
                splitIndex = componentBreak + 3;
            } else {
                // Otherwise, split at the last newline.
                const lastNewline = remainingText.lastIndexOf('\n', splitIndex);
                if (lastNewline > 0) {
                    splitIndex = lastNewline + 1;
                }
            }

            chunks.push(remainingText.substring(0, splitIndex));
            remainingText = remainingText.substring(splitIndex);
        }

        return chunks;
    }

    private async checkForLinkErrors(parsedParts: ParsedMessage[], interaction: ChatInputCommandInteraction): Promise<boolean> {
        const definedTags = new Set(parsedParts.map(p => p.nameTag).filter(Boolean) as string[]);
        const linkErrors: { name: string, value: string }[] = [];
        const placeholderRegex = /\$linkmsg_([^$]+)\$/g;

        for (const part of parsedParts) {
            if (!part.hasPlaceholders) continue;

            const partIdentifier = part.nameTag ? `the message tagged \`${part.nameTag}\`` : `a message with no tag`;

            const checkAndCorrect = (text: string): { corrected: string, hasErrors: boolean } => {
                let correctedText = text;
                let hasErrors = false;

                correctedText = correctedText.replace(placeholderRegex, (match, tagName) => {
                    if (definedTags.has(tagName)) {
                        return match;
                    }

                    hasErrors = true;
                    const bestMatch = this.findBestMatch(tagName, definedTags);
                    if (bestMatch) {
                        return `$linkmsg_${bestMatch}$`;
                    }

                    return match;
                });

                return { corrected: correctedText, hasErrors };
            };

            if (part.rawEmbeds) {
                for (const rawEmbed of part.rawEmbeds) {
                    const result = checkAndCorrect(rawEmbed);
                    if (result.hasErrors) {
                        try {
                            const originalFormatted = JSON.stringify(JSON.parse(rawEmbed), null, 2);
                            const correctedFormatted = JSON.stringify(JSON.parse(result.corrected), null, 2);
                            linkErrors.push({
                                name: `an embed in ${partIdentifier}`,
                                value: `**Original:**\n\`\`\`json\n${originalFormatted}\n\`\`\`\n**Suggested:**\n\`\`\`json\n${correctedFormatted}\n\`\`\``
                            });
                        } catch(e) {
                            linkErrors.push({
                                name: `an embed in ${partIdentifier}`,
                                value: `**Original:**\n\`\`\`json\n${rawEmbed}\n\`\`\`\n**Suggested:**\n\`\`\`json\n${result.corrected}\n\`\`\``
                            });
                        }
                    }
                }
            }

            if (part.rawComponents) {
                for (const rawComponent of part.rawComponents) {
                    const result = checkAndCorrect(rawComponent);
                    if (result.hasErrors) {
                        try {
                            const originalFormatted = JSON.stringify(JSON.parse(rawComponent), null, 2);
                            const correctedFormatted = JSON.stringify(JSON.parse(result.corrected), null, 2);
                            linkErrors.push({
                                name: `an component in ${partIdentifier}`,
                                value: `**Original:**\n\`\`\`json\n${originalFormatted}\n\`\`\`\n**Suggested:**\n\`\`\`json\n${correctedFormatted}\n\`\`\``
                            });
                        } catch(e) {
                            linkErrors.push({
                                name: `an component in ${partIdentifier}`,
                                value: `**Original:**\n\`\`\`json\n${rawComponent}\n\`\`\`\n**Suggested:**\n\`\`\`json\n${result.corrected}\n\`\`\``
                            });
                        }
                    }
                }
            }
        }

        if (linkErrors.length > 0) {
            await interaction.editReply({ content: 'Your file has link errors and was not uploaded. See details below.' });

            const textChunks = linkErrors.map(field => {
                return `**Found an issue in ${field.name}:**\n${field.value}`;
            });

            for (let i = 0; i < textChunks.length; i += 2) {
                const chunk = textChunks.slice(i, i + 2);
                await interaction.followUp({
                    content: `**Link Errors Found**\nI've provided suggestions for the segments below. You can copy the corrected versions.\n\n${chunk.join('\n\n')}`,
                    flags: MessageFlags.Ephemeral,
                });
            }

            return true;
        }

        return false;
    }

    private levenshteinDistance(s1: string, s2: string): number {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();

        const track = Array(s2.length + 1).fill(null).map(() =>
            Array(s1.length + 1).fill(null)
        );

        for (let i = 0; i <= s1.length; i++) {
            track[0][i] = i;
        }
        for (let j = 0; j <= s2.length; j++) {
            track[j][0] = j;
        }

        for (let j = 1; j <= s2.length; j++) {
            for (let i = 1; i <= s1.length; i++) {
                const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(
                    track[j][i - 1] + 1, // deletion
                    track[j - 1][i] + 1, // insertion
                    track[j - 1][i - 1] + indicator // substitution
                );
            }
        }
        return track[s2.length][s1.length];
    }

    private findBestMatch(tag: string, availableTags: Set<string>): string | null {
        if (availableTags.size === 0) return null;

        let bestMatch: string | null = null;
        let minDistance = Infinity;

        for (const availableTag of availableTags) {
            const distance = this.levenshteinDistance(tag, availableTag);
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = availableTag;
            }
        }

        // A match is considered good if its distance is less than half the length
        // of the correct tag. This is a simple heuristic to avoid wildly wrong suggestions.
        if (bestMatch && minDistance <= bestMatch.length / 2) {
            return bestMatch;
        }

        return null;
    }

    private parseFileContent(content: string): ParsedMessage[] {
        // Strip BOM if it exists
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.substring(1);
        }
        const lines = content.split(/\r?\n/);
        const messages: ParsedMessage[] = [];
        let currentMessage: ParsedMessage = { content: '', embeds: [], rawEmbeds: [], components: [], rawComponents: [] };
        let nextMessageNameTag: string | undefined = undefined;
        const allParsingErrors: { description: string, summary: string, correctedCode: string }[] = [];

        const finalizeCurrentMessage = () => {
            if (currentMessage.content.trim() || currentMessage.embeds.length > 0) {
                if (nextMessageNameTag) {
                    currentMessage.nameTag = nextMessageNameTag;
                    nextMessageNameTag = undefined;
                }
                if (currentMessage.content) {
                    currentMessage.hasPlaceholders = this.hasLinkPlaceholder(currentMessage.content);
                }
                currentMessage.embeds.forEach(embed => {
                    let embedString = JSON.stringify(embed);
                    if (this.hasLinkPlaceholder(embedString)) {
                        currentMessage.hasPlaceholders = true;
                    }
                });
                messages.push(currentMessage);
            }
            currentMessage = { content: '', embeds: [], rawEmbeds: [], components: [], rawComponents: [] };
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('.img:')) {
                finalizeCurrentMessage();
                const imageUrl = trimmedLine.substring(5).trim();
                if (imageUrl) {
                    messages.push({ content: imageUrl, embeds: [], components: [] });
                }
                continue;
            }

            if (trimmedLine.startsWith('.tag:')) {
                finalizeCurrentMessage();
                const tagName = trimmedLine.substring(5).trim().replace(/\s+/g, '_');
                if (tagName) {
                    nextMessageNameTag = tagName;
                }
                continue;
            }

            if (trimmedLine.startsWith('.pin:delete')) {
                currentMessage.pinAndDeleteOld = true;
                continue;
            }

            // Handle .embed:json directive (can come before or after JSON block)
            if (trimmedLine.startsWith('.embed:json') || trimmedLine.startsWith('.componentsV2:json')) {
                // Look backwards for JSON block first
                let jsonBlock = '';
                let foundJsonBackwards = false;
                const isComponentsV2 = trimmedLine.startsWith('.componentsV2:json');

                // Check if there's a JSON block before this directive
                for (let k = i - 1; k >= 0; k--) {
                    const prevLine = lines[k].trim();

                    if (prevLine === '') continue;

                    if (prevLine === '.' || (prevLine.startsWith('.') && (!prevLine.startsWith('.embed:json') || !prevLine.startsWith('.componentsV2:json')))) break;

                    if (prevLine.endsWith('}')) {
                        let braceCount = 0;
                        let jsonLines: string[] = [];

                        for (let j = k; j >= 0; j--) {
                            const jsonLine = lines[j];
                            jsonLines.unshift(jsonLine);

                            for (const char of jsonLine) {
                                if (char === '}') braceCount++;
                                if (char === '{') braceCount--;
                            }

                            if (braceCount === 0 && jsonLine.trim().startsWith('{')) {
                                jsonBlock = jsonLines.join('\n').trim();
                                foundJsonBackwards = true;
                                break;
                            }
                        }
                        break;
                    }
                }

                // If no JSON found backwards, look forwards.
                if (!foundJsonBackwards) {
                    let braceCount = 0;
                    let inJson = false;

                    for (let j = i + 1; j < lines.length; j++) {
                        const jsonLine = lines[j];
                        if (!inJson) {
                            if (jsonLine.trim().startsWith('{')) {
                                inJson = true;
                            } else {
                                continue;
                            }
                        }

                        if (inJson) {
                            jsonBlock += jsonLine + '\n';
                            for (const char of jsonLine) {
                                if (char === '{') braceCount++;
                                if (char === '}') braceCount--;
                            }

                            if (braceCount === 0 && jsonBlock.trim()) {
                                i = j; // Skip to end of JSON block
                                break;
                            }
                        }
                    }
                }

                if (jsonBlock.trim()) {
                    const { errors, correctedData, rawData } = this.processJsonBlock(jsonBlock, i + 1);

                    allParsingErrors.push(...errors);

                    if (isComponentsV2) {
                        if (correctedData) currentMessage.components.push(correctedData);
                        if (rawData) currentMessage.rawComponents?.push(rawData);
                    } else {
                        if (correctedData) currentMessage.embeds.push(correctedData);
                        if (rawData) currentMessage.rawEmbeds?.push(rawData);
                    }
                }
                continue;
            }

            // Check if this line starts a JSON block (for standalone JSON without .embed:json)
            if (trimmedLine.startsWith('{')) {
                let jsonBlock = '';
                let braceCount = 0;

                // Collect the entire JSON block
                for (let j = i; j < lines.length; j++) {
                    const jsonLine = lines[j];
                    jsonBlock += jsonLine + '\n';

                    for (const char of jsonLine) {
                        if (char === '{') braceCount++;
                        if (char === '}') braceCount--;
                    }

                    if (braceCount === 0) {
                        // Check if next line is .embed:json
                        if (j + 1 < lines.length && lines[j + 1].trim() === '.embed:json') {
                            // Skip the JSON block here, it will be processed when we hit .embed:json
                            i = j; // Move to just before .embed:json line (loop will increment)
                            break;
                        } else {
                            // Treat as regular content
                            currentMessage.content += (currentMessage.content ? '\n' : '') + jsonBlock.trim();
                            i = j;
                            break;
                        }
                    }
                }
                continue;
            }

            if (trimmedLine === '.') {
                finalizeCurrentMessage();
                continue;
            }

            currentMessage.content += (currentMessage.content ? '\n' : '') + line;
        }

        finalizeCurrentMessage();

        if (allParsingErrors.length > 0) {
            throw new ParsingError('File has parsing errors.', allParsingErrors);
        }

        return messages;
    }

    private processJsonBlock(embedJson: string, embedStartLine: number): { errors: any[], correctedData: any, rawData: string } {
        const allParsingErrors: any[] = [];
        let finalCorrectedData: any = null;
        let finalRawData: string = embedJson;

        const initialErrors: ParseError[] = [];
        parseTree(embedJson, initialErrors, { allowTrailingComma: true });

        const fixableCommaErrors = initialErrors.filter(e => e.error === 6).sort((a, b) => a.offset - b.offset);

        if (fixableCommaErrors.length > 0) {
            let correctedJson = embedJson;
            let offsetCorrection = 0;
            for (const error of fixableCommaErrors) {
                const errorOffset = error.offset + offsetCorrection;
                correctedJson = correctedJson.slice(0, errorOffset) + ',' + correctedJson.slice(errorOffset);
                offsetCorrection++;
            }

            const summary = `Summary: Fixed ${fixableCommaErrors.length} missing comma(s) in your file.`;
            let formattedCorrectedJson;
            try {
                const parsed = JSON.parse(correctedJson);
                formattedCorrectedJson = JSON.stringify(parsed, null, 2);
            } catch {
                formattedCorrectedJson = correctedJson;
            }

            allParsingErrors.push({
                description: `${embedStartLine}`,
                summary: summary,
                correctedCode: formattedCorrectedJson,
            });

            const finalRoot = parseTree(formattedCorrectedJson);
            if(finalRoot) {
                let embedData = getNodeValue(finalRoot);
                if (embedData && typeof embedData === 'object' && 'embed' in embedData) {
                    embedData = embedData.embed;
                }
                 const { correctedData, corrections: structuralCorrections } = this.validateAndCorrectEmbedStructure(embedData);
                if (structuralCorrections.length > 0) {
                    // This might report structural issues for the whole blob, which is acceptable
                }
                finalCorrectedData = correctedData;
                finalRawData = formattedCorrectedJson;
            }

        } else if (initialErrors.length > 0) {
            for (const error of initialErrors) {
                 const { line: errorLine, column } = this.getLineAndColumn(embedJson, error.offset);
                const errorType = getErrorMessageForCode(error.error);
                const summary = `Error: ${errorType} at line ${errorLine}, column ${column}.`;
                allParsingErrors.push({
                    description: `${embedStartLine}`,
                    summary: summary,
                    correctedCode: embedJson,
                });
            }
        } else {
            const root = parseTree(embedJson);
            if (root) {
                let embedData = getNodeValue(root);
                if (embedData && typeof embedData === 'object' && 'embed' in embedData) {
                    embedData = embedData.embed;
                }
                const { correctedData, corrections: structuralCorrections } = this.validateAndCorrectEmbedStructure(embedData);

                if (structuralCorrections.length > 0) {
                    const summary = `The following errors were fixed:\n- ${structuralCorrections.join('\n- ')}`;
                    allParsingErrors.push({
                        description: `${embedStartLine}`,
                        summary: summary,
                        correctedCode: JSON.stringify(correctedData, null, 2),
                    });
                }

                finalCorrectedData = correctedData;
                finalRawData = embedJson;
            }
        }

        return { errors: allParsingErrors, correctedData: finalCorrectedData, rawData: finalRawData };
    }

    private hasLinkPlaceholder(text: string): boolean {
        return /\$linkmsg_([^$]+)\$/.test(text);
    }

    private resolvePlaceholders(text: string, tagMap: Map<string, string>, dynamicData: { channelId: string }): string {
        if (!text) return text;

        let resolvedText = text.replace(/\{\{channel:id\}\}/g, dynamicData.channelId);

        const linkPlaceholderRegex = /\$linkmsg_([^$]+)\$/g;
        resolvedText = resolvedText.replace(linkPlaceholderRegex, (match, tagName) => {
            return tagMap.get(tagName) || match;
        });

        return resolvedText;
    }

    private convertEmbedEmojis(embed: any, interaction: ChatInputCommandInteraction): any {
        if (!embed || typeof embed !== 'object') return embed;

        const newEmbed = JSON.parse(JSON.stringify(embed));

        const convert = (text: string) => text ? this.convertEmojis(text, interaction) : text;

        if (newEmbed.title) newEmbed.title = convert(newEmbed.title);
        if (newEmbed.description) newEmbed.description = convert(newEmbed.description);
        if (newEmbed.author?.name) newEmbed.author.name = convert(newEmbed.author.name);
        if (newEmbed.footer?.text) newEmbed.footer.text = convert(newEmbed.footer.text);
        if (Array.isArray(newEmbed.fields)) {
            newEmbed.fields.forEach((field: any) => {
                if (field.name) field.name = convert(field.name);
                if (field.value) field.value = convert(field.value);
            });
        }

        return newEmbed;
    }

    private convertComponentsV2Emojis(container: any, interaction: ChatInputCommandInteraction): any {
        if (!container || typeof container !== 'object') return container;

        const newContainer = JSON.parse(JSON.stringify(container));

        const convert = (text: string) => text ? this.convertEmojis(text, interaction) : text;

        container.components.forEach((component: any) => {
            if (component.type === 10) {
                component.content = convert(component.content);
            }

            if (component.type === 9) {
                component.components.forEach((subComponent: any) => {
                    if (subComponent.type === 10) {
                        subComponent.content = convert(subComponent.content);
                    }
                });
            }
        });

        return newContainer;
    }

    private convertEmojis(text: string, interaction: ChatInputCommandInteraction): string {
        if (!text) return text;
        const customEmojiRegex = /(?<!\w):([a-zA-Z0-9_]+):(?!\w)/g;
        return text.replace(customEmojiRegex, (match, emojiName) => {
            const emoji = this.client.emojis.cache.find(e => e.name === emojiName);
            return emoji ? emoji.toString() : match;
        });
    }

    private getLineAndColumn(json: string, offset: number): { line: number; column:number } {
        const textToOffset = json.substring(0, offset);
        const lines = textToOffset.split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        return { line, column };
    }

    private validateAndCorrectEmbedStructure(embedData: any): { correctedData: any, corrections: string[] } {
        const correctedData = JSON.parse(JSON.stringify(embedData));
        const corrections: string[] = [];

        const validateUrlField = (field: any, fieldName: string) => {
            if (typeof field === 'string') {
                correctedData[fieldName] = { url: field };
                corrections.push(`Corrected \`${fieldName}\`: Changed from a simple string to an object \`{ "url": "${field}" }\`.`);
                }
        };

        if (correctedData.thumbnail) validateUrlField(correctedData.thumbnail, 'thumbnail');
        if (correctedData.image) validateUrlField(correctedData.image, 'image');
        if (correctedData.author) validateUrlField(correctedData.author, 'author');

        return { correctedData, corrections };
    }
}
