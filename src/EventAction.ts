import { Guild, GuildMember, User, TextChannel, GuildChannel } from "discord.js";
global["acorn"] = require('../acorn');
import JSInterpreter from '../interpreter';

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
       
        // There will always be a guild and log.
        interpreter.setProperty(globalObject, 'guild', interpreter.nativeToPseudo(copyGuild));
        interpreter.setProperty(globalObject, 'log', interpreter.createNativeFunction(console.log));
    }


    static interpretJs(code: string, options: InterpreterOptions) {

        var functions = new InterpreterFunctions(options);

        let interp = new JSInterpreter.Interpreter(code, (i, g) => EventActioner.initFunction(i, g, functions));
        
        // Returns false if all good, true if there's async code.
        if (interp.run()) {
            console.error('Unexpected async function blocking call.', code);
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
    }

    public toggleRoleById(id) {
        const guildMember = <GuildMember>this.options.memberUser;
        InterpreterFunctions.toggleRole(this.options.guild, id, this.options.memberUser, 
            !!!guildMember.roles.cache.find(role => role.id == id));
    }

    public hasRoleById(id) {
        const guildMember = <GuildMember>this.options.memberUser;
        return !!guildMember.roles.cache.find(role => role.id == id);
    }

    public addRoleById(id) {
        InterpreterFunctions.toggleRole(this.options.guild, id, this.options.memberUser, true);
    }

    public removeRoleById(id) {
        InterpreterFunctions.toggleRole(this.options.guild, id, this.options.memberUser, false);
    }

    public messageChannelById(channelId, message) {
        const channel = <TextChannel>this.options.guild.channels.cache.find(chan => chan.id == channelId);
        if (!!channel) {
            channel.send(message);
        }
    }
    
    private static toggleRole(guild: Guild, roleId: string, memberUser: GuildMember | User, add: boolean) {
        guild.roles.fetch(roleId, true).then(role => {
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
    guild?: Guild,
    memberUser?: GuildMember | User,
    channel?: any,
    role?: any,
    reaction?: any,
    message?: any,
    emoji?: any,
}
