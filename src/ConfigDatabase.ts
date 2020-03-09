import { Guild } from "discord.js";
import { MongoClient, ObjectId } from "mongodb";
const connectionUrl = "mongodb://localhost:27017/";
const dbName = "eventlogger";

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
        this.removeGuildEventActionsById= this.removeGuildEventActionsById.bind(this);
        this.removeGuildEventActions= this.removeGuildEventActions.bind(this);
        this.removeGuildEvents = this.removeGuildEvents.bind(this);
        this.removeGuildEventsById = this.removeGuildEventsById.bind(this);
        this.getGuildEventsById = this.getGuildEventsById.bind(this);
        this.getGuildEventActionsForEventById = this.getGuildEventActionsForEventById.bind(this);
        this.getGuildEventActionsById = this.getGuildEventActionsById.bind(this);
        this.addGuildEventActionsForEventById = this.addGuildEventActionsForEventById.bind(this);
    }

    public getGuild(guild: Guild): Promise<GuildConfig> {
        return this.getGuildById(guild.id);
    }

    public getGuildById(guildId: string): Promise<GuildConfig> {
        return MongoClient.connect(connectionUrl).then(async db => {
            const collection = db.db(dbName).collection('eventlogger');
            try {
                const v = await collection.findOne({ id: guildId });
                return v;
            } catch (e) {
                console.error('getGuildById', e);
                return undefined;
            }
        });
    }

    public getOrAddGuild(guild: Guild): Promise<GuildConfig> {
        return this.getOrAddGuildById(guild.id);
    }

    public getOrAddGuildById(guildId: string): Promise<GuildConfig> {
        return MongoClient.connect(connectionUrl).then(async db => {
            const collection = db.db(dbName).collection('eventlogger');
            try {
                const v = await collection.findOneAndUpdate({ id: guildId }, {
                    $setOnInsert: {
                        id: guildId,
                        logChannelId: '',
                        events: [],
                        eventActions: []
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
        });
    }

    public updateGuildLogChannel(guild: Guild, channelId: string) {
       this.updateGuildLogChannelById(guild.id, channelId);
    }

    public updateGuildLogChannelById(guildId: string, channelId: string) {
        return MongoClient.connect(connectionUrl).then(async db => {
            const collection = db.db(dbName).collection('eventlogger');
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
        });
    }

    public getGuildEvents(guild: Guild): Promise<string[]> {
        return this.getGuildEventsById(guild.id);
    }

    public getGuildEventsById(guildId: string): Promise<string[]> {
        return MongoClient.connect(connectionUrl).then(async db => {
            const collection = db.db(dbName).collection('eventlogger');
            try {
                const results = (await collection.findOne({ id: guildId })).events;
                return results;
            } catch (e) {
                console.error('getGuildEventsById', e);
                return [];
            }
        });
    }

    public addGuildEvents(guild: Guild, newEvents: string[]) {
        return this.addGuildEventsById(guild.id, newEvents);
    }

    public addGuildEventsById(guildId: string, newEvents: string[]) { 
        return MongoClient.connect(connectionUrl).then(async db => {
            const collection = db.db(dbName).collection('eventlogger');
            try {
                const v = await collection.findOneAndUpdate({ id: guildId }, {
                    $push: {
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
        });
    }

    public removeGuildEvents(guild: Guild, events: string[]) {
        return this.removeGuildEventsById(guild.id, events);
    }

    public removeGuildEventsById(guildId: string, events: string[]) {
        return MongoClient.connect(connectionUrl).then(async db => {
            const collection = db.db(dbName).collection('eventlogger');
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
        });
    }

    public getGuildEventActionsForEvent(guild: Guild, event: string): Promise<GuildEventAction[]> {
        return this.getGuildEventActionsForEventById(guild.id, event);
    }

    public getGuildEventActionsForEventById(guildId: string, event: string): Promise<GuildEventAction[]> {
        return MongoClient.connect(connectionUrl).then(async db => {
            const collection = db.db(dbName).collection('eventlogger');
            try {
                const guildConfig = await collection.findOne({ id: guildId });
                return guildConfig.eventActions.filter(x => x.event === event);
            } catch (e) {
                console.error('getGuildEventActionsForEventById', e);
                return [];
            }
        });
    }

    public getGuildEventActions(guild: Guild): Promise<GuildEventAction[]> {
        return this.getGuildEventActionsById(guild.id);
    }

    public getGuildEventActionsById(guildId: string): Promise<GuildEventAction[]> {
        return MongoClient.connect(connectionUrl).then(async db => {
            const collection = db.db(dbName).collection('eventlogger');
            try {
                const guildConfig = await collection.findOne({ id: guildId });
                return guildConfig.eventActions;
            } catch (e) {
                console.error('getGuildEventActionsById', e);
                return [];
            }
        });
    }
    
    public addGuildEventActionsForEvent(guild: Guild, newEventActions: GuildEventAction[]) {
        return this.addGuildEventActionsForEventById(guild.id, newEventActions);
    }

    public addGuildEventActionsForEventById(guildId: string, newEventActions: GuildEventAction[]) {
        let modifiedEventActions = newEventActions
            .map(act => {
                return {
                    ...act,
                    id: new ObjectId()
                }
            });
            

        return MongoClient.connect(connectionUrl).then(async db => {
            const collection = db.db(dbName).collection('eventlogger');
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
        });
    }

    public removeGuildEventActions(guild: Guild, actionIds: ObjectId[]) {
        return this.removeGuildEventActionsById(guild.id, actionIds);
    }

    public removeGuildEventActionsById(guildId: string, actionIds: ObjectId[]) {
        // Action id's are the id's done on insert.
        return MongoClient.connect(connectionUrl).then(async db => {
            const collection = db.db(dbName).collection('eventlogger');
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
        });
    }
}

export interface GuildEventAction {
    event: string;
    actionCode: string;
    id?: ObjectId;
}

export interface GuildConfig { 
    id: string;
    logChannelId: string;
    events: string[];
    eventActions: GuildEventAction[];
}

export const ConfigDatabase = new InternalConfigDatabase();