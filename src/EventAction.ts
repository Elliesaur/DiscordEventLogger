import { Guild, GuildMember, User, TextChannel } from "discord.js";

export default class EventActioner {

    static parse(code: string): FunctionCall[] {
        let calls: FunctionCall[] = [];
        let args: string[] = [];
        let res = '';
        let inFunctionArguments = false;
        let inQuotes = false;
        [...code].forEach(char => {
            if (inFunctionArguments) {
                
                if (!inQuotes && char === ')') {
                    // Finished processing arguments.
                    calls[calls.length - 1].arguments = args;
                    args = [];
                    inFunctionArguments = false;
                }
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else {
                    if (inQuotes) {
                        // Only gather argument values when in quotes
                        res += char;
                    }
                }
                if (!inQuotes && res !== '') {
                    // If we've reached the end of the quoted message and the arg
                    // isn't blank, push it to the call arguments.
                    args.push(res);
                    res = '';
                }
            } else {
                if (char === '(') {
                    calls.push({
                        name: res.trim(),
                        arguments: []
                    });
                    res = '';
                    inFunctionArguments = true;
                } else {
                    res += char;
                }
            }     
        });
        return calls;
    }

    static execute(calls: FunctionCall[], guild: Guild, memberUser: GuildMember | User) {
        calls.forEach(call => {
            switch (call.name) {
                case 'addRoleById': {
                    if (call.arguments.length < 1) {
                        break;
                    }
                    const roleId = call.arguments[0];
                    EventActioner.toggleRole(guild, roleId, memberUser, true);
                    break;
                }
                case 'removeRoleById': {
                    if (call.arguments.length < 1) {
                        break;
                    }
                    const roleId = call.arguments[0];
                    EventActioner.toggleRole(guild, roleId, memberUser, false);
                    break;
                }
                case 'toggleRoleById': {
                    if (call.arguments.length < 1) {
                        break;
                    }
                    const roleId = call.arguments[0];
                    const guildMember = <GuildMember>memberUser;
                    EventActioner.toggleRole(guild, roleId, memberUser, 
                        !!!guildMember.roles.cache.find(role => role.id === roleId));
                    break;
                }
                case 'messageChannelById': {
                    if (call.arguments.length < 2) {
                        break;
                    }
                    const channelId = call.arguments[0];
                    const message = call.arguments[1];
                    const channel = <TextChannel>guild.channels.cache.find(chan => chan.id === channelId);
                    channel.send(message);
                }
            }
        });
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
