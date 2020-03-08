import { Guild, GuildMember, User, TextChannel } from "discord.js";
global["acorn"] = require('../acorn');
import JSInterpreter from '../interpreter';

export default class EventActioner {

    private static initFunction(interpreter, globalObject, functions: InterpreterFunctions) {
        let isUser = false;
        let copyMember = EventActioner.copyTopLevelProperties(functions.memberUser);
        let copyUser = undefined;
        if (!!(<any>functions.memberUser).user) {
            copyUser = EventActioner.copyTopLevelProperties((<any>functions.memberUser).user);
        } else {
            isUser = true;
        }

        let copyGuild = EventActioner.copyTopLevelProperties(functions.guild);

        interpreter.setProperty(globalObject, 'addRoleById', interpreter.createNativeFunction(functions.addRoleById));
        interpreter.setProperty(globalObject, 'removeRoleById', interpreter.createNativeFunction(functions.removeRoleById));
        interpreter.setProperty(globalObject, 'toggleRoleById', interpreter.createNativeFunction(functions.toggleRoleById));
        interpreter.setProperty(globalObject, 'messageChannelById', interpreter.createNativeFunction(functions.messageChannelById));
        interpreter.setProperty(globalObject, 'hasRoleById', interpreter.createNativeFunction(functions.hasRoleById));
        if (isUser) {
            interpreter.setProperty(globalObject, 'user', interpreter.nativeToPseudo(copyMember));
        } else {
            interpreter.setProperty(globalObject, 'member', interpreter.nativeToPseudo(copyMember));
            interpreter.setProperty(globalObject, 'user', interpreter.nativeToPseudo(copyUser));
        }
        interpreter.setProperty(globalObject, 'guild', interpreter.nativeToPseudo(copyGuild));
        interpreter.setProperty(globalObject, 'log', interpreter.createNativeFunction(console.log));
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

    static interpretJs(code: string, guild: Guild, memberUser: GuildMember | User) {
        var functions = new InterpreterFunctions(guild, memberUser);

        let interp = new JSInterpreter.Interpreter(code, (i, g) => EventActioner.initFunction(i, g, functions));
        
        // Returns false if all good, true if there's async code.
        if (!!interp.run()) {
            console.error('Unexpected async function blocking call.', code);
        }
    }
}

class InterpreterFunctions {

    constructor(public guild: Guild, public memberUser: GuildMember | User) {
        this.addRoleById = this.addRoleById.bind(this);
        this.removeRoleById = this.removeRoleById.bind(this);
        this.toggleRoleById = this.toggleRoleById.bind(this);
        this.messageChannelById = this.messageChannelById.bind(this);
    }

    public toggleRoleById(id) {
        const guildMember = <GuildMember>this.memberUser;
        InterpreterFunctions.toggleRole(this.guild, id, this.memberUser, 
            !!!guildMember.roles.cache.find(role => role.id === id));
    }

    public hasRoleById(id) {
        const guildMember = <GuildMember>this.memberUser;
        return !!guildMember.roles.cache.find(role => role.id === id);
    }

    public addRoleById(id) {
        InterpreterFunctions.toggleRole(this.guild, id, this.memberUser, true);
    }

    public removeRoleById(id) {
        InterpreterFunctions.toggleRole(this.guild, id, this.memberUser, false);
    }

    public messageChannelById(channelId, message) {
        const channel = <TextChannel>this.guild.channels.cache.find(chan => chan.id === channelId);
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

interface FunctionCall {
    name: string;
    arguments: string[];
}
