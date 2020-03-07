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
} from 'discord.js';
import logs from 'discord-logs';
import Config from '../config';

const client = new Client();
logs(client);

class Bot {

    constructor() {
        this.logMessage = this.logMessage.bind(this);
        this.logMessageToMultiple = this.logMessageToMultiple.bind(this);
        this.findGuildsForUser = this.findGuildsForUser.bind(this);
        this.safe = this.safe.bind(this);
    }

    private safe(str: string) {
        return str.replace(/`/g, '');
    }

    private logMessage(message: string, guild: Guild) {
        const channel: TextChannel = < TextChannel > guild.channels.cache.find(channel => channel.name === "event_log");
        if (!!channel) {
            channel.send(message);
        }
    }

    private logMessageToMultiple(message: string, guilds: Guild[]) {
        for (const guild of guilds) {
            this.logMessage(message, guild);
        }
    }

    private findGuildsForUser(user: User) : Promise<Guild[]> {
        return new Promise((resolve, reject) => {
            let matchedGuilds = [];
            const guilds = client.guilds.cache;
            const promises = [];
    
            for (const guild of guilds) {
                promises.push(guild[1].members.fetch(user.id))
            }
            
            Promise.all(promises).then(values => {
                for (const val of values) {
                    if (!!val) {
                        matchedGuilds.push(val.guild);
                    }
                } 
                resolve(matchedGuilds);
            }).catch(reject);
        });
    }

    public start() {
        client.on("guildChannelPermissionsChanged", (channel: GuildChannel, oldPermissions: Permissions, newPermissions: Permissions) => {
            this.logMessage(channel.name + "'s permissions changed!", channel.guild);
        });

        client.on("unhandledGuildChannelUpdate", (oldChannel: GuildChannel, newChannel: GuildChannel) => {
            // this.logMessage("Channel '" + oldChannel.id + "' was edited but discord-logs couldn't find what was updated...", oldChannel.guild);
        });

        client.on("guildMemberBoost", (member: GuildMember) => {
            this.logMessage(`<@${member.user.id}> (${member.user.tag}) has started boosting ${member.guild.name}`, member.guild);
        });

        client.on("guildMemberBoost", (member: GuildMember) => {
            this.logMessage(`<@${member.user.id}> (${member.user.tag}) has stopped boosting ${member.guild.name}...`, member.guild);
        });

        client.on("guildMemberRoleAdd", (member: GuildMember, role: Role) => {
            this.logMessage(`<@${member.user.id}> (${member.user.tag}) acquired the role: ${role.name}`, member.guild);
        });

        client.on("guildMemberRoleRemove", (member: GuildMember, role: Role) => {
            this.logMessage(`<@${member.user.id}> (${member.user.tag}) lost the role: ${role.name}`, member.guild);
        });

        client.on("guildMemberNicknameUpdate", (member: GuildMember, oldNickname: string, newNickname: string) => {
            this.logMessage(`<@${member.user.id}> (${member.user.tag})'s nickname was ${oldNickname} and is now ${newNickname}`, member.guild);
        });

        client.on("unhandledGuildMemberUpdate", (oldMember: GuildMember, newMember: GuildMember) => {
            // this.logMessage("Member '" + oldMember.id + "' was edited but discord-logs couldn't find what was updated...", oldMember.guild);
        });

        client.on("guildBoostLevelUp", (guild: Guild, oldLevel: number, newLevel: number) => {
            this.logMessage(guild.name + " reaches the boost level: " + newLevel, guild);
        });

        client.on("guildBoostLevelDown", (guild: Guild, oldLevel: number, newLevel: number) => {
            this.logMessage(guild.name + " returned to the boost level: " + newLevel, guild);
        });

        client.on("guildRegionUpdate", (guild: Guild, oldRegion: string, newRegion: string) => {
            this.logMessage(guild.name + " region is now " + newRegion, guild);
        });

        client.on("guildBannerAdd", (guild: Guild, bannerURL: string) => {
            this.logMessage(guild.name + " has a banner now!", guild);
        });

        client.on("guildAfkChannelAdd", (guild: Guild, afkChannel: GuildChannel) => {
            this.logMessage(guild.name + " has an AFK channel now!", guild);
        });

        client.on("guildVanityURLAdd", (guild: Guild, vanityURL: string) => {
            this.logMessage(guild.name + " has added a vanity url : " + vanityURL, guild);
        });

        client.on("unhandledGuildUpdate", (oldGuild: Guild, newGuild: Guild) => {
            // this.logMessage("Guild '" + oldGuild.id + "' was edited but discord-logs couldn't find what was updated...", oldGuild);
        });

        client.on("messagePinned", (message: Message) => {
            const channelName = ( < any > message.channel).name;
            this.logMessage(`Message https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id} has been pinned to ${channelName}: ${this.safe(message.cleanContent)}`, message.guild);
        });

        client.on("messageContentEdited", (message: Message, oldContent: string, newContent: string) => {
            this.logMessage(`Message https://discordapp.com/channels/${message.guild.id}/${message.channel.id}/${message.id} has been edited from ${this.safe(oldContent)} to ${this.safe(newContent)}`, message.guild);
        });

        client.on("unhandledMessageUpdate", (oldMessage: Message, newMessage: Message) => {
            // this.logMessage("Message '" + oldMessage.id + "' was edited but discord-logs couldn't find what was updated...", oldMessage.guild);
        });

        client.on("guildMemberOffline", (member: GuildMember, oldStatus: Status) => {
            // this.logMessage(`<@${member.user.id}> (${member.user.tag}) became offline`, member.guild);
        });

        client.on("guildMemberOnline", (member: GuildMember, newStatus: Status) => {
            // this.logMessage(`<@${member.user.id}> (${member.user.tag}) was offline and is now ${newStatus}`, member.guild);
        });

        client.on("unhandledPresenceUpdate", (oldPresence: Presence, newPresence: Presence) => {
            // this.logMessage("Presence for member " + oldPresence.member.user.tag + "' was updated but discord-logs couldn't find what was updated...", oldPresence.guild);
        });

        client.on("rolePositionUpdate", (role: Role, oldPosition: number, newPosition: number) => {
            // this.logMessage(role.name + " was at position " + oldPosition + " and now is at position " + newPosition, role.guild);
        });

        client.on("unhandledRoleUpdate", (oldRole: Role, newRole: Role) => {
            // this.logMessage("Role '" + oldRole.id + "' was updated but discord-logs couldn't find what was updated...", oldRole.guild);
        });

        client.on("userAvatarUpdate", (user: User, oldAvatarURL: string, newAvatarURL: string) => {
            this.findGuildsForUser(user).then(guilds => {
                this.logMessageToMultiple(`<@${user.id}> (${user.tag}) avatar changed from ${oldAvatarURL} to ${newAvatarURL}`, guilds);
            })
        });

        client.on("userUsernameUpdate", (user: User, oldUsername: string, newUsername: string) => {
            this.findGuildsForUser(user).then(guilds => {
                this.logMessageToMultiple(`<@${user.id}> (${user.tag}) username changed from '${oldUsername}' to '${newUsername}'`, guilds);
            });
        });

        client.on("unhandledUserUpdate", (oldUser: User, newUser: User) => {
            // this.logMessage("User '" + oldUser.id + "' was updated but discord-logs couldn't find what was updated...", ( < any > client.guilds).first());
        });

        client.on("voiceChannelJoin", (member: GuildMember, channel: VoiceChannel) => {
            this.logMessage(`<@${member.user.id}> (${member.user.tag}) joined voice channel '${channel.name}'`, member.guild);
        });

        client.on("voiceChannelLeave", (member: GuildMember, channel: VoiceChannel) => {
            this.logMessage(`<@${member.user.id}> (${member.user.tag}) left voice channel '${channel.name}'`, member.guild);
        });

        client.on("voiceChannelSwitch", (member: GuildMember, oldChannel: VoiceChannel, newChannel: VoiceChannel) => {
            this.logMessage(`<@${member.user.id}> (${member.user.tag}) left voice channel '${oldChannel.name}' and joined voice channel '${newChannel.name}'`, member.guild);
        });

        client.on("voiceChannelMute", (member: GuildMember, muteType: string) => {
            this.logMessage(`<@${member.user.id}> (${member.user.tag}) is now ${muteType}`, member.guild);
        });

        client.on("voiceChannelDeaf", (member: GuildMember, deafType: string) => {
            this.logMessage(`<@${member.user.id}> (${member.user.tag}) is now ${deafType}`, member.guild);
        });

        client.on("voiceStreamingStart", (member: GuildMember, voiceChannel: VoiceChannel) => {
            this.logMessage(`<@${member.user.id}> (${member.user.tag}) started streaming in ${voiceChannel.name}`, member.guild);
        });

        client.on("voiceStreamingStop", (member: GuildMember, voiceChannel: VoiceChannel) => {
            this.logMessage(`<@${member.user.id}> (${member.user.tag}) stopped streaming`, member.guild);
        });

        client.on("unhandledRoleUpdate", (oldState: VoiceState, newState: VoiceState) => {
            // this.logMessage("Voice state for member '" + oldState.member.user.tag + "' was updated but discord-logs couldn't find what was updated...", oldState.guild);
        });

        client.on("guildMemberAdd", (member) => {
            this.logMessage(`<@${member.user.id}> (${member.user.tag}) has joined`, member.guild);
        });

        client.on("guildMemberRemove", (member) => {
            this.logMessage(`<@${member.user.id}> (${member.user.tag}) has joined`, member.guild);
        });

        client.on("messageDelete", (message) => {
            const hasAttachment = message.attachments.size > 0;
            let attachmentUrl = '';
            if (hasAttachment) {
                attachmentUrl = message.attachments.first().proxyURL;
            }
            const channelName = ( < any > message.channel).name;
            this.logMessage(`<@${message.author.id}> (${message.author.tag})'s message \`\`\`${this.safe(message.cleanContent)}\`\`\` ${(hasAttachment ? ' with attachment ' + attachmentUrl : '')} from ${channelName} was deleted`, message.guild);
        });

        client.on("messageDeleteBulk", (messages) => {
            this.logMessage(`${messages.keys.length} messages were deleted.`, messages.first().guild);
        });

        client.on('ready', () => {
            console.log(`Logged in as ${client.user.tag}!`);
        });

        client.login(Config.BotToken);
    }
}

export = new Bot();