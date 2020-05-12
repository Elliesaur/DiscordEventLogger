import { Guild } from "discord.js";
import { MongoClient, ObjectId } from "mongodb";
const connectionUrl = "mongodb://localhost:27017/";
const dbName = "eventlogger";
export let db = undefined;
class InternalConfigDatabase {

    constructor() {
        this.getOrAddGuild = this.getOrAddGuild.bind(this);
        this.getOrAddGuildById = this.getOrAddGuildById.bind(this);
        this.getGuild = this.getGuild.bind(this);
        this.getGuildById = this.getGuildById.bind(this);
        this.addGuildEventActionsForEvent = this.addGuildEventActionsForEvent.bind(this);
        this.addGuildEvents = this.addGuildEvents.bind(this);
        this.addGuildEventsById = this.addGuildEventsById.bind(this);
        this.getGuildEventActions = this.getGuildEventActions.bind(this);
        this.getGuildEventActionsForEvent = this.getGuildEventActionsForEvent.bind(this);
        this.getGuildEvents = this.getGuildEvents.bind(this);
        this.removeGuildEventActionsById = this.removeGuildEventActionsById.bind(this);
        this.removeGuildEventActions = this.removeGuildEventActions.bind(this);
        this.removeGuildEventActionsById = this.removeGuildEventActionsById.bind(this);
        this.removeGuildEventsById = this.removeGuildEventsById.bind(this);
        this.getGuildEventsById = this.getGuildEventsById.bind(this);
        this.getGuildEventActionsForEventById = this.getGuildEventActionsForEventById.bind(this);
        this.getGuildEventActionsById = this.getGuildEventActionsById.bind(this);
        this.addGuildEventActionsForEventById = this.addGuildEventActionsForEventById.bind(this);
        this.getGuildLogChannels = this.getGuildLogChannels.bind(this);
        this.getGuildLogChannelsById = this.getGuildLogChannelsById.bind(this);
        this.getGuildLogChannelsForEvent = this.getGuildLogChannelsForEvent.bind(this);
        this.getGuildLogChannelsForEventById = this.getGuildLogChannelsForEventById.bind(this);
        this.removeGuildLogChannels = this.removeGuildLogChannels.bind(this);
        this.removeGuildLogChannelsById = this.removeGuildLogChannelsById.bind(this);

        MongoClient.connect(connectionUrl).then(a => {
            db = a.db(dbName);
        });
    }

    public async getGuild(guild: Guild): Promise<GuildConfig> {
        return await this.getGuildById(guild.id);
    }

    public async getGuildById(guildId: string): Promise<GuildConfig> {
        const collection = db.collection('eventlogger');
        try {
            const v = await collection.findOne({ id: guildId });
            return v;
        } catch (e) {
            console.error('getGuildById', e);
            return undefined;
        }
    }

    public async getOrAddGuild(guild: Guild): Promise<GuildConfig> {
        return await this.getOrAddGuildById(guild.id);
    }

    public async getOrAddGuildById(guildId: string): Promise<GuildConfig> {
        const collection = db.collection('eventlogger');
        try {
            const v = await collection.findOneAndUpdate({ id: guildId }, {
                $setOnInsert: {
                    id: guildId,
                    logChannelId: '',
                    events: [],
                    eventActions: [],
                    logChannels: [],
                }
            }, {
                upsert: true,
                returnOriginal: false,
            });
            return v.value;
        } catch (e) {
            console.error('addGuildById', e);
            return undefined;
        }
    }

    public async updateGuildLogChannel(guild: Guild, channelId: string) {
       return await this.updateGuildLogChannelById(guild.id, channelId);
    }

    public async updateGuildLogChannelById(guildId: string, channelId: string) {
        const collection = db.collection('eventlogger');
        try {
            const v = await collection.findOneAndUpdate({ id: guildId }, {
                $set: {
                    logChannelId: channelId,
                }
            });
            return v;
        } catch (e) {
            console.error('updateGuildLogChannelById', e);
            return undefined;
        }
    }

    public async getGuildEvents(guild: Guild): Promise<string[]> {
        return await this.getGuildEventsById(guild.id);
    }

    public async getGuildEventsById(guildId: string): Promise<string[]> {
        const collection = db.collection('eventlogger');
        try {
            const results = (await collection.findOne({ id: guildId }))
            if (results && results.events) {
                return results.events;
            } else {
                this.getOrAddGuildById(guildId).then(guildConfig => {
                    if (guildConfig) {
                        console.log('Initialized guild', guildId);
                    }
                    return [];
                })
            }
            return [];
        } catch (e) {
            console.error('getGuildEventsById', e);
            return [];
        }
    }

    public async addGuildEvents(guild: Guild, newEvents: string[]) {
        return await this.addGuildEventsById(guild.id, newEvents);
    }

    public async addGuildEventsById(guildId: string, newEvents: string[]) { 
        const collection = db.collection('eventlogger');
        try {
            const v = await collection.findOneAndUpdate({ id: guildId }, {
                // Avoid dupes.
                $addToSet: {
                    events: {
                        $each: newEvents
                    }
                }
            });
            return v;
        } catch (e) {
            console.error('addGuildEventsById', e);
            return undefined;
        }
    }

    public async removeGuildEvents(guild: Guild, events: string[]) {
        return await this.removeGuildEventsById(guild.id, events);
    }

    public async removeGuildEventsById(guildId: string, events: string[]) {
        const collection = db.collection('eventlogger');
        try {
            const v = await collection.findOneAndUpdate({ id: guildId }, {
                $pull: {
                    events: {
                        $in: events
                    }
                }
            });
            return v;
        } catch (e) {
            console.error('removeGuildEventsById', e);
            return undefined;
        }
    }

    public async getGuildEventActionsForEvent(guild: Guild, event: string): Promise<GuildEventAction[]> {
        return await this.getGuildEventActionsForEventById(guild.id, event);
    }

    public async getGuildEventActionsForEventById(guildId: string, event: string): Promise<GuildEventAction[]> {
        const collection = db.collection('eventlogger');
        try {
            const guildConfig = await collection.findOne({ id: guildId });
            if (guildConfig && guildConfig.eventActions) {
                return guildConfig.eventActions.filter(x => x.event === event);
            } else {
                this.getOrAddGuildById(guildId).then(guildConfig => {
                    if (guildConfig) {
                        console.log('Initialized guild', guildId);
                    }
                    return [];
                })
            }
            return [];
        } catch (e) {
            console.error('getGuildEventActionsForEventById', e);
            return [];
        }
    }

    public async getGuildEventActions(guild: Guild): Promise<GuildEventAction[]> {
        return await this.getGuildEventActionsById(guild.id);
    }

    public async getGuildEventActionsById(guildId: string): Promise<GuildEventAction[]> {
        const collection = db.collection('eventlogger');
        try {
            const guildConfig = await collection.findOne({ id: guildId });
            if (guildConfig && guildConfig.eventActions) {
                return guildConfig.eventActions;
            } else {
                this.getOrAddGuildById(guildId).then(guildConfig => {
                    if (guildConfig) {
                        console.log('Initialized guild', guildId);
                    }
                    return [];
                })
            }
            return [];
        } catch (e) {
            console.error('getGuildEventActionsById', e);
            return [];
        }
    }
    
    public async addGuildEventActionsForEvent(guild: Guild, newEventActions: GuildEventAction[]) {
        return await this.addGuildEventActionsForEventById(guild.id, newEventActions);
    }

    public async addGuildEventActionsForEventById(guildId: string, newEventActions: GuildEventAction[]) {
        let modifiedEventActions = newEventActions
            .map(act => {
                return {
                    ...act,
                    id: new ObjectId()
                }
            });
            

        
        const collection = db.collection('eventlogger');
        try {
            const v = await collection.findOneAndUpdate({ id: guildId }, {
                $push: {
                    eventActions: {
                        $each: modifiedEventActions
                    }
                }
            });
            
            return v;
        } catch (e) {
            console.error('addGuildEventActionsForEventById', e);
            return undefined;
        }
    }

    public async removeGuildEventActions(guild: Guild, actionIds: ObjectId[]) {
        return await this.removeGuildEventActionsById(guild.id, actionIds);
    }

    public async removeGuildEventActionsById(guildId: string, actionIds: ObjectId[]) {
        const collection = db.collection('eventlogger');
        try {
            const v = await collection.findOneAndUpdate({ id: guildId }, {
                $pull: {
                    eventActions: {
                        id: {
                            $in: actionIds
                        }
                    }
                }
            });
            return v;
        } catch (e) {
            console.error('removeGuildEventActionsById', e);
            return undefined;
        }
    }

    public async getGuildLogChannelsForEvent(guild: Guild, event: string): Promise<GuildEventAction[]> {
        return await this.getGuildLogChannelsForEventById(guild.id, event);
    }

    public async getGuildLogChannelsForEventById(guildId: string, event: string): Promise<GuildEventAction[]> {
        const collection = db.collection('eventlogger');
        try {
            const guildConfig = await collection.findOne({ id: guildId });
            if (guildConfig && guildConfig.logChannels) {
                return guildConfig.logChannels.filter(x => x.event === event);
            } else {
                this.getOrAddGuildById(guildId).then(guildConfig => {
                    if (guildConfig) {
                        console.log('Initialized guild', guildId);
                    }
                    return [];
                })
            }
            return [];
        } catch (e) {
            console.error('getGuildLogChannelsForEventById', e);
            return [];
        }
    }

    public async getGuildLogChannels(guild: Guild): Promise<GuildLogChannel[]> {
        return await this.getGuildLogChannelsById(guild.id);
    }

    public async getGuildLogChannelsById(guildId: string): Promise<GuildLogChannel[]> {
        const collection = db.collection('eventlogger');
        try {
            const guildConfig = await collection.findOne({ id: guildId });
            if (guildConfig && guildConfig.logChannels) {
                return guildConfig.logChannels;
            } else {
                this.getOrAddGuildById(guildId).then(guildConfig => {
                    if (guildConfig) {
                        console.log('Initialized guild', guildId);
                    }
                    return [];
                })
            }
            return [];
        } catch (e) {
            console.error('getGuildLogChannelsById', e);
            return [];
        }
    }
    
    public async addGuildLogChannelsForEvent(guild: Guild, newLogChannels: GuildLogChannel[]) {
        return await this.addGuildLogChannelsForEventById(guild.id, newLogChannels);
    }

    public async addGuildLogChannelsForEventById(guildId: string, newLogChannels: GuildLogChannel[]) {
        let modifiedLogChannels = newLogChannels
            .map(act => {
                return {
                    ...act,
                    id: new ObjectId()
                }
            });
            

        
        const collection = db.collection('eventlogger');
        try {
            const v = await collection.findOneAndUpdate({ id: guildId }, {
                $push: {
                    logChannels: {
                        $each: modifiedLogChannels
                    }
                }
            });
            
            return v;
        } catch (e) {
            console.error('addGuildLogChannelsForEventById', e);
            return undefined;
        }
    }

    public async removeGuildLogChannels(guild: Guild, logChannelIds: ObjectId[]) {
        return await this.removeGuildLogChannelsById(guild.id, logChannelIds);
    }

    public async removeGuildLogChannelsById(guildId: string, logChannelIds: ObjectId[]) {
        const collection = db.collection('eventlogger');
        try {
            const v = await collection.findOneAndUpdate({ id: guildId }, {
                $pull: {
                    logChannels: {
                        id: {
                            $in: logChannelIds
                        }
                    }
                }
            });
            return v;
        } catch (e) {
            console.error('removeGuildLogChannelsById', e);
            return undefined;
        }
    }
}

export interface GuildEventAction {
    event: string;
    actionCode: string;
    id?: ObjectId;
}

export interface GuildLogChannel {
    event: string;
    channelId: string;
    id?: ObjectId;
}

export interface GuildConfig { 
    id: string;
    logChannelId: string;
    events: string[];
    eventActions: GuildEventAction[];
    logChannels: GuildLogChannel[];
}

export const ConfigDatabase = new InternalConfigDatabase();