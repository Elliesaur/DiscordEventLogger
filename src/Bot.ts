import {
    Client,
    GuildChannel,
    Role,
    User,
    Message,
    GuildMember,
    Permissions,
    Guild,
    Status,
    Presence,
    VoiceChannel,
    VoiceState,
    TextChannel,
    Intents,
} from 'discord.js';
import logs from 'discord-logs'
import Config from '../Config';
import EventActioner, { InterpreterOptions } from './EventAction';
import { ConfigDatabase, GuildEventAction, GuildLogChannel } from './ConfigDatabase';
import { ObjectId } from 'mongodb';

const client = new Client({ intents: [ 
    Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_MEMBERS] 
});
const commands = ['events', 'listevents', 'addevents', 'removeevents', 'deleteevents', 
'addeventaction', 'removeeventaction', 'listeventactions', 'eventactions', 'logchannels', 
'listlogchannels', 'addlogchannels', 'removelogchannels', 'deletelogchannels'];
const reflect = p => p.then(v => ({v, status: "fulfilled" }),
                            e => ({e, status: "rejected" }));

logs(client);

class Bot {

    constructor() {
        this.logMessage = this.logMessage.bind(this);
        this.logMessageToMultiple = this.logMessageToMultiple.bind(this);
        this.findGuildsForUser = this.findGuildsForUser.bind(this);
        this.findMembersForUser = this.findMembersForUser.bind(this);
        this.safe = this.safe.bind(this);
        this.executeCustomActions = this.executeCustomActions.bind(this);
        this.executeMultipleCustomActions = this.executeMultipleCustomActions.bind(this);
    }

    private safe(str: string) {
        if (str !== undefined && str !== null) {
            return str.replace(/`/g, '');
        }
        return '';
    }

    private logMessage(event: string, message: string, guild: Guild) {
        ConfigDatabase.getGuildEvents(guild).then(events => {
            if (events.includes(event)) {
                ConfigDatabase.getOrAddGuild(guild).then(async guildConfig => {
                    if (!!guildConfig) {

                        let channels: TextChannel[] = [];
                        if (guildConfig.logChannels) {
                            const channelIds = guildConfig.logChannels.filter(x => x.event === event);
                            channels = channelIds.map(c => {
                                return <TextChannel>guild.channels.cache.find(channel => channel.id == c.channelId);
                            });
                        }

                        // Fallback is always the default log channel.
                        if (channels.length === 0) {
                            const channel: TextChannel = <TextChannel> guild.channels.cache.find(channel => channel.id === guildConfig.logChannelId);
                            if (!!channel) {
                                await channel.send(message);
                            }
                        } else {
                            channels.forEach(async c => await c.send(message));
                        }
                    }
                });
            }
        });
    }

    private logMessageToMultiple(event: string, message: string, guilds: Guild[]) {
        for (const guild of guilds) {
            this.logMessage(event, message, guild);
        }
    }

    private findGuildsForUser(user: User) : Promise<Guild[]> {
        return new Promise((resolve, reject) => {
            let matchedGuilds = [];
            const guilds = (<Client>client).guilds.cache;
            const promises = [];
    
            for (const guild of guilds) {
                promises.push(guild[1].members.fetch(user.id))
            }
            
            Promise.all(promises.map(reflect)).then(results => {
                const success = results.filter(x => x.status === "fulfilled").map(x => x.v);
                success.forEach(val => {
                    if (!!val) {
                        matchedGuilds.push(val.guild);
                    }
                }); 
                resolve(matchedGuilds);
            }).catch(e => {
                console.log('Could not complete finding guilds for a user', e);
                //reject();
            });
        });
    }

    private findMembersForUser(user: any, guilds: Guild[]) {
        return new Promise((resolve, reject) => {
            let matchedMembers = [];
            const promises = [];
    
            guilds.forEach(guild => {
                promises.push(guild.members.fetch(user.id))
            });
            
            Promise.all(promises.map(reflect)).then(results => {
                const success = results.filter(x => x.status === "fulfilled").map(x => x.v);
                success.forEach(val => {
                    if (val !== undefined) {
                        matchedMembers.push(val);
                    }
                });
                resolve(matchedMembers);
            }).catch(e => {
                console.log('Could not complete finding members for a user', e);
                //reject();
            });
        });
    }

    private executeCustomActions(event: string, options: InterpreterOptions) {
        // Simply lookup the database and send actions.
        ConfigDatabase.getGuildEventActionsForEvent(options.guild, event).then(actions => {
            actions.forEach(act => {
                EventActioner.interpretJs(act.actionCode, options)
            });
        });
    }

    private executeMultipleCustomActions(event: string, guilds: Guild[], options: InterpreterOptions) {
        for (const guild of guilds) {
            const opt: InterpreterOptions = {
                guild: guild,
                ...options
            };
            this.executeCustomActions(event, opt);
        }
    }
    
    public start() {

        client.on("guildChannelPermissionsUpdate", (channel: GuildChannel, oldPermissions: Permissions, newPermissions: Permissions) => {
            this.logMessage('guildChannelPermissionsUpdate', this.safe(channel.name) + "'s permissions changed!", channel.guild);
        });

        client.on("unhandledGuildChannelUpdate", (oldChannel: GuildChannel, newChannel: GuildChannel) => {
            this.logMessage('unhandledGuildChannelUpdate', "Channel '" + oldChannel.id + "' was edited but discord-logs couldn't find what was updated...", oldChannel.guild);
        });

        client.on("guildMemberBoost", async (member: GuildMember) => {
            if (member.partial) await member.fetch();
            this.executeCustomActions('guildMemberBoost', {
                guild: member.guild,
                memberUser: member,
            });
            this.logMessage('guildMemberBoost', `<@${member.user.id}> (${this.safe(member.user.tag)}) has started boosting ${member.guild.name}`, member.guild);
        });

        client.on("guildMemberUnboost", async (member: GuildMember) => {
            if (member.partial) await member.fetch();
            this.executeCustomActions('guildMemberUnboost', {
                guild: member.guild,
                memberUser: member,
            });
            this.logMessage('guildMemberUnboost', `<@${member.user.id}> (${this.safe(member.user.tag)}) has stopped boosting ${member.guild.name}...`, member.guild);
        });

        client.on("guildMemberRoleAdd", async (member: GuildMember, role: Role) => {
            if (member.partial) await member.fetch();
            this.executeCustomActions('guildMemberRoleAdd', {
                guild: member.guild,
                memberUser: member,
                role: role,
            });
            this.logMessage('guildMemberRoleAdd', `<@${member.user.id}> (${this.safe(member.user.tag)}) acquired the role: ${role.name}`, member.guild);
        });

        client.on("guildMemberRoleRemove", async (member: GuildMember, role: Role) => {
            if (member.partial) await member.fetch();
            this.executeCustomActions('guildMemberRoleRemove', {
                guild: member.guild,
                memberUser: member,
                role: role,
            });
            this.logMessage('guildMemberRoleRemove', `<@${member.user.id}> (${this.safe(member.user.tag)}) lost the role: ${role.name}`, member.guild);
        });

        client.on("guildMemberNicknameUpdate", async (member: GuildMember, oldNickname: string, newNickname: string) => {
            if (member.partial) await member.fetch();
            this.executeCustomActions('guildMemberNicknameUpdate', {
                guild: member.guild,
                memberUser: member,
            });
            this.logMessage('guildMemberNicknameUpdate', `<@${member.user.id}> (${this.safe(member.user.tag)})'s nickname was \`${this.safe(oldNickname)}\` and is now \`${this.safe(newNickname)}\``, member.guild);
        });

        client.on("unhandledGuildMemberUpdate", async (oldMember: GuildMember, newMember: GuildMember) => {
            if (oldMember.partial) await oldMember.fetch();
            if (newMember.partial) await newMember.fetch();
            this.executeCustomActions('unhandledGuildMemberUpdate', {
                guild: newMember.guild,
                memberUser: newMember
            });
            this.logMessage('unhandledGuildMemberUpdate', `<@${oldMember.user.id}> (${this.safe(oldMember.user.tag)}) was edited but the update was not known`, oldMember.guild);
        });

        client.on("guildBoostLevelUp", (guild: Guild, oldLevel: number, newLevel: number) => {
            this.logMessage('guildBoostLevelUp', this.safe(guild.name) + " reaches the boost level: " + newLevel, guild);
        });

        client.on("guildBoostLevelDown", (guild: Guild, oldLevel: number, newLevel: number) => {
            this.logMessage('guildBoostLevelDown', this.safe(guild.name) + " returned to the boost level: " + newLevel, guild);
        });

        client.on("guildRegionUpdate", (guild: Guild, oldRegion: string, newRegion: string) => {
            this.logMessage('guildRegionUpdate', this.safe(guild.name) + " region is now " + newRegion, guild);
        });

        client.on("guildBannerAdd", (guild: Guild, bannerURL: string) => {
            this.logMessage('guildBannerAdd', this.safe(guild.name) + " has a banner now!", guild);
        });

        client.on("guildAfkChannelAdd", (guild: Guild, afkChannel: GuildChannel) => {
            this.logMessage('guildAfkChannelAdd', this.safe(guild.name) + " has an AFK channel now!", guild);
        });

        client.on("guildVanityURLAdd", (guild: Guild, vanityURL: string) => {
            this.logMessage('guildVanityURLAdd', this.safe(guild.name) + " has added a vanity url : " + vanityURL, guild);
        });

        client.on("unhandledGuildUpdate", (oldGuild: Guild, newGuild: Guild) => {
            this.logMessage('unhandledGuildUpdate', "Guild '" + this.safe(oldGuild.name) + "' was edited but the changes were not known", oldGuild);
        });

        client.on("messagePinned", async (message: Message) => {

            // Fetch the full message if partial.
            if (message.partial) await message.fetch();

            this.executeCustomActions('messagePinned', {
                guild: message.guild,
                message: message,
                channel: message.channel,
                memberUser: message.member
            });
            const channelName = ( < any > message.channel).name;
            this.logMessage('messagePinned', `Message https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id} has been pinned to ${this.safe(channelName)}: \`\`\`${this.safe(message.cleanContent)}\`\`\``, message.guild);
        });

        client.on("messageContentEdited", async (message: Message, oldContent: string, newContent: string) => {
            
            // Fetch the full message if partial.
            if (message.partial) await message.fetch();

            this.executeCustomActions('messageContentEdited', {
                guild: message.guild,
                message: message,
                channel: message.channel,
                memberUser: message.member
            });
            this.logMessage('messageContentEdited', `Message https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id} has been edited from \`\`\`${this.safe(oldContent)}\`\`\` to \`\`\`${this.safe(newContent)}\`\`\``, message.guild);
        });

        client.on("unhandledMessageUpdate", async (oldMessage: Message, newMessage: Message) => {
            
            // Fetch the full message if partial.
            if (oldMessage.partial) await oldMessage.fetch();
            if (newMessage.partial) await newMessage.fetch();
            this.executeCustomActions('unhandledMessageUpdate', {
                guild: newMessage.guild,
                message: newMessage,
                memberUser: newMessage.member,
                channel: newMessage.channel,
            });
            this.logMessage('unhandledMessageUpdate', `Message https://discordapp.com/channels/${oldMessage.guild.id}/${oldMessage.channel.id}/${oldMessage.id} was updated but the changes were not known` , oldMessage.guild);
        });

        client.on("guildMemberOffline", async (member: GuildMember, oldStatus: Status) => {
            if (member.partial) await member.fetch();

            this.executeCustomActions('guildMemberOffline', {
                guild: member.guild,
                memberUser: member,
            });
            this.logMessage('guildMemberOffline', `<@${member.user.id}> (${this.safe(member.user.tag)}) became offline`, member.guild);
        });

        client.on("guildMemberOnline", async (member: GuildMember, newStatus: Status) => {
            if (member.partial) await member.fetch();

            this.executeCustomActions('guildMemberOnline', {
                guild: member.guild,
                memberUser: member,
            });
            this.logMessage('guildMemberOnline', `<@${member.user.id}> (${this.safe(member.user.tag)}) was offline and is now ${newStatus}`, member.guild);
        });

        client.on("unhandledPresenceUpdate", async (oldPresence: Presence, newPresence: Presence) => {
            this.executeCustomActions('unhandledPresenceUpdate', {
                guild: newPresence.guild,
                memberUser: newPresence.member,
            });
            this.logMessage('unhandledPresenceUpdate', `Presence for member <@${oldPresence.user.id}> (${this.safe(oldPresence.user.tag)}) was updated but the changes were not known`, oldPresence.guild);
        });

        client.on("rolePositionUpdate", (role: Role, oldPosition: number, newPosition: number) => {
            this.executeCustomActions('rolePositionUpdate', {
                guild: role.guild,
                role: role,
            });
            this.logMessage('rolePositionUpdate', this.safe(role.name) + " was at position " + oldPosition + " and now is at position " + newPosition, role.guild);
        });

        client.on("unhandledRoleUpdate", (oldRole: Role, newRole: Role) => {
            this.executeCustomActions('unhandledRoleUpdate', {
                guild: newRole.guild,
                role: newRole,
            });
            this.logMessage('unhandledRoleUpdate', "Role '" + this.safe(oldRole.name) + "' was updated but the changes were not known", oldRole.guild);
        });

        client.on("userAvatarUpdate", (user: User, oldAvatarURL: string, newAvatarURL: string) => {
            this.findGuildsForUser(user).then(guilds => {
                this.executeMultipleCustomActions('userAvatarUpdate', guilds, {
                    memberUser: user,
                });
                this.logMessageToMultiple('userAvatarUpdate', `<@${user.id}> (${this.safe(user.tag)}) avatar changed from ${oldAvatarURL} to ${newAvatarURL}`, guilds);
            })
        });

        client.on("userUsernameUpdate", (user: User, oldUsername: string, newUsername: string) => {
            this.findGuildsForUser(user).then(guilds => {
                this.executeMultipleCustomActions('userUsernameUpdate', guilds, {
                    memberUser: user,
                });
                this.logMessageToMultiple('userUsernameUpdate', `<@${user.id}> (${this.safe(user.tag)}) username changed from '${this.safe(oldUsername)}' to '${this.safe(newUsername)}'`, guilds);
            });
        });

        client.on("unhandledUserUpdate", (oldUser: User, newUser: User) => {
            this.findGuildsForUser(newUser).then(guilds => {
                this.logMessageToMultiple('unhandledUserUpdate', `User <@${newUser.id}> (${this.safe(newUser.tag)}) was updated but the changes were not known`, guilds);
            });
        });

        client.on("voiceChannelJoin", async (member: GuildMember, channel: VoiceChannel) => {
            if (member.partial) await member.fetch();
            this.executeCustomActions('voiceChannelJoin', {
                guild: member.guild,
                memberUser: member,
                channel: channel,
            });
            this.logMessage('voiceChannelJoin', `<@${member.user.id}> (${this.safe(member.user.tag)}) joined voice channel '${this.safe(channel.name)}'`, member.guild);
        });

        client.on("voiceChannelLeave", async (member: GuildMember, channel: VoiceChannel) => {
            if (member.partial) await member.fetch();
            this.executeCustomActions('voiceChannelLeave', {
                guild: member.guild,
                memberUser: member,
                channel: channel,
            });
            this.logMessage('voiceChannelLeave', `<@${member.user.id}> (${this.safe(member.user.tag)}) left voice channel '${this.safe(channel.name)}'`, member.guild);
        });

        client.on("voiceChannelSwitch", async (member: GuildMember, oldChannel: VoiceChannel, newChannel: VoiceChannel) => {
            if (member.partial) await member.fetch();
            this.executeCustomActions('voiceChannelSwitch', {
                guild: member.guild,
                memberUser: member,
                channel: newChannel,
            });
            this.logMessage('voiceChannelSwitch', `<@${member.user.id}> (${this.safe(member.user.tag)}) left voice channel '${this.safe(oldChannel.name)}' and joined voice channel '${this.safe(newChannel.name)}'`, member.guild);
        });

        client.on("voiceChannelMute", async (member: GuildMember, muteType: string) => {
            if (member.partial) await member.fetch();
            this.executeCustomActions('voiceChannelMute', {
                guild: member.guild,
                memberUser: member,
            });
            this.logMessage('voiceChannelMute', `<@${member.user.id}> (${this.safe(member.user.tag)}) is now ${muteType}`, member.guild);
        });

        client.on("voiceChannelDeaf", async (member: GuildMember, deafType: string) => {
            if (member.partial) await member.fetch();
            this.executeCustomActions('voiceChannelDeaf', {
                guild: member.guild,
                memberUser: member,
            });
            this.logMessage('voiceChannelDeaf', `<@${member.user.id}> (${this.safe(member.user.tag)}) is now ${deafType}`, member.guild);
        });

        client.on("voiceChannelUnmute", async (member: GuildMember, muteType: string) => {
            if (member.partial) await member.fetch();
            this.executeCustomActions('voiceChannelUnmute', {
                guild: member.guild,
                memberUser: member,
            });
            this.logMessage('voiceChannelUnmute', `<@${member.user.id}> (${this.safe(member.user.tag)}) is now unmuted`, member.guild);
        });

        client.on("voiceChannelUndeaf", async (member: GuildMember, deafType: string) => {
            if (member.partial) await member.fetch();
            this.executeCustomActions('voiceChannelUndeaf', {
                guild: member.guild,
                memberUser: member,
            });
            this.logMessage('voiceChannelUndeaf', `<@${member.user.id}> (${this.safe(member.user.tag)}) is now undeafened`, member.guild);
        });

        client.on("voiceStreamingStart", async (member: GuildMember, voiceChannel: VoiceChannel) => {
            if (member.partial) await member.fetch();
            this.executeCustomActions('voiceStreamingStart', {
                guild: member.guild,
                memberUser: member,
                channel: voiceChannel,
            });
            this.logMessage('voiceStreamingStart',`<@${member.user.id}> (${this.safe(member.user.tag)}) started streaming in ${this.safe(voiceChannel.name)}`, member.guild);
        });

        client.on("voiceStreamingStop", async (member: GuildMember, voiceChannel: VoiceChannel) => {
            if (member.partial) await member.fetch();
            this.executeCustomActions('voiceStreamingStop', {
                guild: member.guild,
                memberUser: member,
                channel: voiceChannel,
            });
            this.logMessage('voiceStreamingStop', `<@${member.user.id}> (${this.safe(member.user.tag)}) stopped streaming`, member.guild);
        });

        client.on("unhandledVoiceStateUpdate", async (oldState: VoiceState, newState: VoiceState) => {
            this.logMessage('unhandledVoiceUpdate', `Voice state for member <@${oldState.member.user.id}> (${oldState.member.user.tag}) was updated but the changes were not known`, oldState.guild);
        });

        client.on("guildMemberAdd", async (member: GuildMember) => {
            if (member.partial) await member.fetch();
            this.executeCustomActions('guildMemberAdd', {
                guild: member.guild,
                memberUser: <any>member,
            });
            this.logMessage('guildMemberAdd', `<@${member.user.id}> (${this.safe(member.user.tag)}) has joined`, member.guild);
        });

        client.on("guildMemberRemove", async (member: GuildMember) => {
            if (member.partial) await member.fetch();
            this.executeCustomActions('guildMemberRemove', {
                guild: member.guild,
                memberUser: <any>member,
            });
            this.logMessage('guildMemberRemove', `<@${member.user.id}> (${this.safe(member.user.tag)}) has left/been kicked or banned`, member.guild);
        });

        client.on("messageReactionAdd", async (messageReaction, user) => {

            if (messageReaction.partial) await messageReaction.fetch();
            
            if (!!messageReaction.message) {
                // Fetch the full message associated with the reaction.
                if (messageReaction.message.partial) await messageReaction.message.fetch();
            }
            
            this.findMembersForUser(user, [messageReaction.message.guild]).then(members => {
                if (!!members) {
                    let firstMember = members[0];
                    this.executeCustomActions('messageReactionAdd', {
                        guild: messageReaction.message.guild,
                        memberUser: <any>firstMember,
                        reaction: messageReaction,
                        message: messageReaction.message,
                        emoji: messageReaction.emoji
                    });
                }
            });
            this.logMessage('messageReactionAdd', `<@${user.id}> (${this.safe(user.tag)}) has reacted with ${messageReaction.emoji.name} (${messageReaction.emoji.url}) to message https://discordapp.com/channels/${messageReaction.message.guild.id}/${messageReaction.message.channel.id}/${messageReaction.message.id} `, messageReaction.message.guild);
        });

        client.on("messageReactionRemove", async (messageReaction, user) => {

            if (messageReaction.partial) await messageReaction.fetch();

            if (!!messageReaction.message) {
                // Fetch the full message associated with the reaction.
                if (messageReaction.message.partial) await messageReaction.message.fetch();
            }

            this.findMembersForUser(user, [messageReaction.message.guild]).then(members => {
                if (!!members) {
                    let firstMember = members[0];
                    this.executeCustomActions('messageReactionRemove', {
                        guild: messageReaction.message.guild,
                        memberUser: <any>firstMember,
                        reaction: messageReaction,
                        message: messageReaction.message,
                        emoji: messageReaction.emoji
                    });
                }
            });
            this.logMessage('messageReactionRemove', `<@${user.id}> (${this.safe(user.tag)}) has removed reaction ${messageReaction.emoji.name} (${messageReaction.emoji.url}) to message https://discordapp.com/channels/${messageReaction.message.guild.id}/${messageReaction.message.channel.id}/${messageReaction.message.id} `, messageReaction.message.guild);
        });

        client.on("messageReactionRemoveAll", async (message: Message) => {

            if (!!!message) return;
            
            // Fetch the full message.
            if (message.partial) await message.fetch();

            this.executeCustomActions('messageReactionRemoveAll', {
                guild: message.guild,
                memberUser: message.member,
                message: message
            });
            this.logMessage('messageReactionRemoveAll', `Message https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id} has had all reactions removed`, message.guild);
        });

        client.on("messageDelete", async (message) => {

            // Fetch the full message if partial.
            if (message.partial) await message.fetch();
            
            const hasAttachment = message.attachments.size > 0;
            let attachmentUrl = '';
            if (hasAttachment) {
                attachmentUrl = message.attachments.first().proxyURL;
            }
            const channelName = ( < any > message.channel).name;
            this.executeCustomActions('messageDelete', {
                guild: message.guild,
                message: message,
                channel: message.channel,
                memberUser: message.member
            });
            this.logMessage('messageDelete', `<@${message.author.id}> (${this.safe(message.author.tag)})'s message \`\`\`${this.safe(message.cleanContent)}\`\`\` ${(hasAttachment ? ' with attachment ' + attachmentUrl : '')} from ${channelName} was deleted`, message.guild);
        });

        client.on("messageDeleteBulk", (messages) => {
            this.logMessage('messageDeleteBulk', `${messages.size} messages were deleted.`, messages.first().guild);
        });

        client.on("guildCreate", guild => {
            console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
            
            // Start by getting or creating the guild.
            ConfigDatabase.getOrAddGuild(guild).then(guildConfig => {
                if (guildConfig.logChannelId === '') {
                    // New or unset channel.
                    console.log(`Guild has not been configured with a channel yet.`);
                }
            });

            client.user.setActivity(`Serving ${client.guilds.cache.size} servers`);
        });

        client.on("messageCreate", async message => { 

            // Fetch the full message if partial.
            if (message.partial) await message.fetch();

            // Skip itself, do not allow it to process its own messages.
            if (message.author.id === client.user.id) return;

            // First of all give the details to custom actions and log message.
            this.executeCustomActions('messageCreated', {
                guild: message.guild,
                message: message,
                channel: message.channel,
                memberUser: message.member
            });
            this.executeCustomActions('message', {
                guild: message.guild,
                message: message,
                channel: message.channel,
                memberUser: message.member
            });
            this.logMessage('message', `<@${message.author.id}> (${this.safe(message.author.tag)}) posted message: \`\`\`${this.safe(message.cleanContent)}\`\`\``, message.guild);
        
            // Skip other bots now.
            if (message.author.bot) return;

            // Check for prefix.
            if (message.content.indexOf('!') !== 0) return;

            const args = message.content.slice(1).trim().split(/ +/g);
            const command = args.shift().toLowerCase();

            
            if (command === 'setlogchannel') {
                if (!message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
                    return;
                }
                let channelMentions = message.mentions.channels;
                if (channelMentions.size > 0) {
                    let firstChannel = channelMentions.keys().next().value;
                    ConfigDatabase.updateGuildLogChannel(message.guild, firstChannel).then(x => {
                        if (x.ok) {
                            message.reply(`Set the log channel to ${firstChannel}`);
                        } else {
                            message.reply(`Failed to set the log channel to ${firstChannel}`);
                        }
                    });
                }
            }
            else if (command === 'removeeventlogger') {
                if (!message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
                    return;
                }
                ConfigDatabase.removeGuild(message.guild).then(async res => {
                    await message.reply(`Successfully removed all data related to this server from my database. I'll now leave the server. Thanks for having me!`);
                    message.guild.leave().then(left => {
                        console.log(`Left guild gracefully - ${message.guild.name}`);
                    }).catch(async err => {
                        console.error(`Failed to leave guild gracefully - ${message.guild.name}`);
                        await message.reply(`Unfortunately I couldn't leave by myself. You may kick me.`);
                    });
                });
            }
            else if (!commands.includes(command)) {
                return;
            }

            // Only allow commands to be executed in the log channel.
            ConfigDatabase.getOrAddGuild(message.guild).then(guildConfig => {
                if (message.channel.id !== guildConfig.logChannelId) {
                    return;
                }

                if (command === 'addevents') {
                    let events = args;
                    if (events.length > 0) {
                        ConfigDatabase.addGuildEvents(message.guild, events).then(x => {
                            if (x.ok) {
                                message.reply(`Successfully added ${events.length} event(s) to be logged.`);
                            } else {
                                message.reply(`Failed to add the events.`);
                            }
                        });
                    }
                }

                if (command === 'removeevents' || command === 'deleteevents') {
                    let events = args;
                    if (events.length > 0) {
                        ConfigDatabase.removeGuildEvents(message.guild, events).then(x => {
                            if (x.ok) {
                                message.reply(`Successfully removed ${events.length} event(s) from being logged.`);
                            } else {
                                message.reply(`Failed to remove the events.`);
                            }
                        });
                    }
                }

                if (command === 'events' || command === 'listevents') {
                    ConfigDatabase.getGuildEvents(message.guild).then(events => {
                        let formattedEvents = `Actively Logged Events: 
\`\`\`
${events.join('\n').trim()}
\`\`\``;
                        message.reply(formattedEvents);
                    });
                }

                if (command === 'addeventaction' && args.length > 1) {
                    let [event, ...other] = args;
                    let code = other.join(' ').replace(/`/g, '');
                    let action: GuildEventAction = {
                        event: event,
                        actionCode: code,
                    };
                    ConfigDatabase.addGuildEventActionsForEvent(message.guild, [action]).then(result => {
                        if (result.ok) {
                            message.reply('Successfully added an event action.');
                        } else {
                            message.reply('Failed to add an event action.');
                        }
                    })
                }

                if (command === 'removeeventaction' && args.length === 1) {
                    ConfigDatabase.removeGuildEventActions(message.guild, [new ObjectId(args[0])]).then(result => {
                        if (result.ok) {
                            message.reply(`Successfully removed an event action with identifier ${args[0]}.`)
                        } else {
                            message.reply('Failed to remove an event action with that identifier.');
                        }
                    })
                }
                
                if (command === 'listeventactions' || command === 'eventactions') {
                    ConfigDatabase.getGuildEventActions(message.guild).then(actions => {
                        let formattedActions = `Event Actions in Place: `;
                        let messageQueue = [];
                        for (const act of actions) {
                            const textToAdd = `
\`\`\`
Identifier: ${act.id.toHexString()}
Event: ${this.safe(act.event)}
Code: ${this.safe(act.actionCode)}
\`\`\``;
                            if ((formattedActions + textToAdd).length >= 1800) {
                                messageQueue.push(formattedActions);
                                formattedActions = `Event Actions in Place: `;
                            }
                            formattedActions += textToAdd;
                        }

                        messageQueue.push(formattedActions);

                        for (const msg of messageQueue) {
                            if (msg !== '') {
                                message.reply(msg);
                            }
                        }
                    });
                }


                if (command === 'addlogchannels' && args.length > 1 && message.mentions.channels.size > 0) {
                    const eventName = args[0];
                    const logChannels = message.mentions.channels.map(channel => {
                        return {
                            event: eventName,
                            channelId: channel.id,
                        };
                    });
                    
                    ConfigDatabase.addGuildLogChannelsForEvent(message.guild, logChannels).then(result => {
                        if (result.ok) {
                            message.reply('Successfully added log channel redirects.');
                        } else {
                            message.reply('Failed to add log channel redirects.');
                        }
                    })
                }

                if ((command === 'removelogchannels' || command == 'deletelogchannels') && args.length > 0) {
                    const objectIds = args.map(a => new ObjectId(a))
                    ConfigDatabase.removeGuildLogChannels(message.guild, objectIds).then(result => {
                        if (result.ok) {
                            message.reply(`Successfully removed the selected log channel redirects.`)
                        } else {
                            message.reply('Failed to remove the selected log channel redirects.');
                        }
                    })
                }

                if (command === 'listlogchannels' || command === 'logchannels') {
                    ConfigDatabase.getGuildLogChannels(message.guild).then(logChannels => {
                        const modifiedLogChannels = logChannels.map(logChannel => {
                            const channel = message.guild.channels.cache.find(c => c.id == logChannel.channelId);
                            const channelName = !!channel ? `${channel.name} - ID: ${logChannel.channelId}` : `Unknown Channel - ID: ${logChannel.channelId}`;
                            return {
                                ...logChannel,
                                channelName: channelName,
                            };
                        });
                        let formattedLogChannels = `Log channel redirects in Place: `;
                        let messageQueue = [];
                        for (const act of modifiedLogChannels) {
                            const textToAdd = `
\`\`\`
Identifier: ${act.id.toHexString()}
Event: ${this.safe(act.event)}
Log Channel: ${this.safe(act.channelName)}
\`\`\``;
                            if ((formattedLogChannels + textToAdd).length >= 2000) {
                                messageQueue.push(formattedLogChannels);
                                formattedLogChannels = `Log channel redirects in Place: `;
                            }
                            formattedLogChannels += textToAdd;
                        }

                        messageQueue.push(formattedLogChannels);

                        for (const msg of messageQueue) {
                            if (msg !== '') {
                                message.reply(msg);
                            }
                        }
                    });
                }
            });
        });

        client.on('ready', () => {
            console.log(`Bot has started, with ${client.users.cache.size} users in cache, in ${client.channels.cache.size} cached channels of ${client.guilds.cache.size} cached guilds.`); 
            client.user.setActivity(`serving ${client.guilds.cache.size} servers`);
            console.log(`Logged in as ${client.user.tag}!`);
        });

        client.login(Config.BotToken);
    }
}

export = new Bot();