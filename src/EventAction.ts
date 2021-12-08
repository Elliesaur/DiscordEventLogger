import { Guild, GuildMember, User, TextChannel, GuildChannel } from "discord.js";
global["acorn"] = require('../acorn');
import JSInterpreter from '../interpreter';

// Time to wait for script to run.
const cancelAfterMs = 3000;

export default class EventActioner {

    private static initFunction(interpreter, globalObject, functions: InterpreterFunctions) {
        Object.keys(functions.options).forEach(key => {
            if (!!functions.options[key] && key === 'memberUser') {
                if (!!(<any>functions.options.memberUser).user) {
                    // Is not user
                    interpreter.setProperty(globalObject, 'user', interpreter.nativeToPseudo(
                        EventActioner.copyTopLevelProperties(
                            (<any>functions.options[key]).user)));
                    interpreter.setProperty(globalObject, 'member', interpreter.nativeToPseudo(
                        EventActioner.copyTopLevelProperties(
                            functions.options[key])));
                } else {
                    interpreter.setProperty(globalObject, 'user', interpreter.nativeToPseudo(
                        EventActioner.copyTopLevelProperties(
                            functions.options[key])));
                }
            } else if (!!functions.options[key]) {
                
                interpreter.setProperty(globalObject, key, interpreter.nativeToPseudo(
                    EventActioner.copyTopLevelProperties(
                        functions.options[key])));
            }
        });

        let copyGuild = EventActioner.copyTopLevelProperties(functions.options.guild);

        interpreter.setProperty(globalObject, 'addRoleById', interpreter.createNativeFunction(functions.addRoleById));
        interpreter.setProperty(globalObject, 'removeRoleById', interpreter.createNativeFunction(functions.removeRoleById));
        interpreter.setProperty(globalObject, 'toggleRoleById', interpreter.createNativeFunction(functions.toggleRoleById));
        interpreter.setProperty(globalObject, 'messageChannelById', interpreter.createNativeFunction(functions.messageChannelById));
        interpreter.setProperty(globalObject, 'hasRoleById', interpreter.createNativeFunction(functions.hasRoleById));
        interpreter.setProperty(globalObject, 'removeReactionByEmojiName', interpreter.createNativeFunction(functions.removeReactionByEmojiName));
       
        // There will always be a guild and log.
        interpreter.setProperty(globalObject, 'guild', interpreter.nativeToPseudo(copyGuild));
        interpreter.setProperty(globalObject, 'log', interpreter.createNativeFunction(console.log));
    }


    static interpretJs(code: string, options: InterpreterOptions) {
        try {
            let functions = new InterpreterFunctions(options);

            let interp = new JSInterpreter.Interpreter(code, (i, g) => EventActioner.initFunction(i, g, functions));
            
            let startTime = new Date().getTime();

            function nextStep() {
                if (new Date().getTime() - startTime > cancelAfterMs) {
                    console.log('Cancelled execution of event action (Timeout). ', code);
                    return;
                }
                try {
                    if (interp.step()) {
                        setTimeout(nextStep, 0);
                    } else {
                        console.log('Execution of custom event action complete! ');
                    }
                } catch (e) {
                    console.log('Error in step of interpreter', e)
                }
            };
            nextStep();
        } catch (e) {
            console.log('Error running interpreter', e)
        }
    }
    
    static copyTopLevelProperties(o: any) {
        let cloned = {...o};
        let newObj = {};
        let keys = Object.keys(o);
        for (const key of keys) {
            if (typeof o[key] !== 'object' && !Array.isArray(o[key])) {
                newObj[key] = cloned[key];
            }
        }
        return newObj;
    }
}

class InterpreterFunctions {

    constructor(public options: InterpreterOptions) {
        this.addRoleById = this.addRoleById.bind(this);
        this.removeRoleById = this.removeRoleById.bind(this);
        this.toggleRoleById = this.toggleRoleById.bind(this);
        this.messageChannelById = this.messageChannelById.bind(this);
        this.hasRoleById = this.hasRoleById.bind(this);
        this.removeReactionByEmojiName = this.removeReactionByEmojiName.bind(this);
    }

    /**
     * Toggles a role on and off by the id for the member.
     * @param id The role ID, a string or number.
     */
    public toggleRoleById(id) {
        const guildMember = <GuildMember>this.options.memberUser;
        InterpreterFunctions.toggleRole(this.options.guild, id, this.options.memberUser, 
            !!!guildMember.roles.cache.find(role => role.id == id));
    }

    /**
     * Returns true or false depending on whether the member has the role.
     * @param id The role ID, a string or number.
     */
    public hasRoleById(id) {
        const guildMember = <GuildMember>this.options.memberUser;
        return !!guildMember.roles.cache.find(role => role.id == id);
    }

    /**
     * Adds a role by id to the member.
     * @param id The role ID, a string or number.
     */
    public addRoleById(id) {
        InterpreterFunctions.toggleRole(this.options.guild, id, this.options.memberUser, true);
    }

    /**
     * Removes a role by id to the member.
     * @param id The role ID, a string or number.
     */
    public removeRoleById(id) {
        InterpreterFunctions.toggleRole(this.options.guild, id, this.options.memberUser, false);
    }

    /**
     * Message a specific channel.
     * @param channelId The channel ID to message, a string or number
     * @param message The message to transmit. Does not support embeds
     */
    public messageChannelById(channelId, message) {
        const channel = <TextChannel>this.options.guild.channels.cache.find(chan => chan.id == channelId);
        if (!!channel) {
            channel.send(message);
        }
    }

    /**
     * Removes a reaction to the message by the user that the reaction add/remove event was fired from.
     * This function should only be used in reaction-based events.
     * @param nameOrEmoji The emoji name for custom emojis or the literal emoji character for regular emojis.
     */
    public removeReactionByEmojiName(nameOrEmoji) {
        if (!this.options.message || !this.options.message.reactions || !(<any>this.options.memberUser).user) {
            return false;
        }

        const user = (<any>this.options.memberUser).user;
        const reactionsToMessage = this.options.message.reactions.cache;
        
        // Find the reactions where the name is the same and the users contains our user.
        const reactions = reactionsToMessage.filter(reaction => reaction.emoji.name == nameOrEmoji && 
            reaction.users.cache.has(user.id));

        // Only remove if there's some.
        if (reactions.array().length > 0) {
            reactions.forEach(reaction => {
                reaction.remove(user);
            });
            return true;
        }
        return false;
    }
    
    private static toggleRole(guild: Guild, roleId: string, memberUser: GuildMember | User, add: boolean) {
        guild.roles.fetch(roleId, { force: true }).then(role => {
            if (!!memberUser) {
                if (add) {
                    (<GuildMember>memberUser).roles.add(role);
                } else {
                    (<GuildMember>memberUser).roles.remove(role);
                }
            }
        }).catch(() => console.log('No role', roleId));
    }
}

export interface InterpreterOptions {
    /** The guild object, present in
     * guildMemberBoost
     * guildMemberUnboost
     * guildMemberRoleAdd
     * guildMemberRoleRemove
     * guildMemberNicknameUpdate
     * unhandledGuildMemberUpdate
     * messagePinned
     * messageContentEdited
     * unhandledMessageUpdate
     * guildMemberOffline
     * guildMemberOnline
     * unhandledPresenceUpdate
     * rolePositionUpdate
     * unhandledRoleUpdate
     * userAvatarUpdate (USER OBJECT)
     * userUsernameUpdate (USER OBJECT)
     * voiceChannelJoin
     * voiceChannelLeave
     * voiceChannelSwitch
     * voiceChannelMute
     * voiceChannelDeaf
     * voiceChannelUnmute
     * voiceChannelUndeaf
     * voiceStreamingStart
     * voiceStreamingStop
     * guildMemberAdd
     * guildMemberRemove
     * messageReactionAdd
     * messageReactionRemove
     * messageDelete
     * message
     */
    guild?: Guild,
    /** The member or user object, present in
     * guildMemberBoost
     * guildMemberUnboost
     * guildMemberRoleAdd
     * guildMemberRoleRemove
     * guildMemberNicknameUpdate
     * unhandledGuildMemberUpdate
     * messagePinned
     * messageContentEdited
     * unhandledMessageUpdate
     * guildMemberOffline
     * guildMemberOnline
     * unhandledPresenceUpdate
     * userAvatarUpdate (USER OBJECT)
     * userUsernameUpdate (USER OBJECT)
     * voiceChannelJoin
     * voiceChannelLeave
     * voiceChannelSwitch
     * voiceChannelMute
     * voiceChannelDeaf
     * voiceChannelUnmute
     * voiceChannelUndeaf
     * voiceStreamingStart
     * voiceStreamingStop
     * guildMemberAdd
     * guildMemberRemove
     * messageReactionAdd (Resolved from User)
     * messageReactionRemove (Resolved from User)
     * messageDelete
     * message
     */
    memberUser?: GuildMember | User,
    /** The channel object, present in
     * messagePinned
     * messageContentEdited
     * unhandledMessageUpdate
     * voiceChannelJoin (Voice Channel)
     * voiceChannelLeave (Voice Channel)
     * voiceChannelSwitch (Voice Channel)
     * voiceStreamingStart (Voice Channel)
     * voiceStreamingStop (Voice Channel)
     * messageDelete
     */
    channel?: any,
    /** The role object, present in 
     * guildMemberRoleAdd
     * guildMemberRoleRemove
     * rolePositionUpdate
     * unhandledRoleUpdate
     * message
     */
    role?: any,
    /** The reaction object, present in messageReactionAdd, messageReactionRemove events. */
    reaction?: any,
    /** The message object, present in 
     * messagePinned
     * messageContentEdited
     * unhandledMessageUpdate
     * messageReactionAdd (Message reacted to!)
     * messageReactionRemove (Message reacted to!)
     * messageDelete
     * message
     */
    message?: any,
    /** The emoji object, present in messageReactionAdd, messageReactionRemove events. */
    emoji?: any,
}
