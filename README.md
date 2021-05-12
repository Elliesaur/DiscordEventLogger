# DiscordEventLogger
Event Logger for Discord with custom actions (in JS) on event triggers.

Aims to provide more information than the Audit Log and allows you to respond with multiple custom actions when an event occurs.

Some examples:
- Add a new role when a user joins
- Remove a role when a user changes nicknames
- Message a channel when someone joins a specific voice channel
- Add roles on reactions to messages
- Create a bot in the bot, with the event "message" you can listen for new messages

# Invite Link
If you'd like to use the bot how it is, without customising it feel free to [click here to invite it to your server](https://discordapp.com/oauth2/authorize?client_id=685372647403814932&scope=bot&permissions=268815360).

It requires several permissions, the biggest being managing roles. You are free to remove any that you think are too dangerous. 
Note that the bot will not be able to function entirely if you do remove them.

# Installation
- Install mongodb server community edition
- Clone repo
- Create a copy of the ExampleConfig.ts and rename it to Config.ts
- Change the details of Config.ts to suit
- Install node modules - `npm install`
- Run typescript compiler - `tsc`
- Copy acorn.js and interpreter.js to the ./dist/ directory
- Start with node - `node ./dist/index.js`

# Usage
When the bot joins a server you'll need to set the log channel before anything can happen.
All commands are case insensitive. Arguments to them are not.

All commands excluding !SetLogChannel **must** be executed from the log channel.

Log channel redirects further enhance the ability to log individual events to different channels (one event may have multiple logging channels).

---

# Command Reference

### !SetLogChannel
#### Description
Sets the logging channel (and command channel) to use.
Only an ADMINISTRATOR can execute this command. It may be executed from any channel.
Use by mentioning a channel.
#### Arguments
- Channel mention
#### Example
User> !setlogchannel \#event_log

Bot> Set the log channel to 123456789

---

### !RemoveEventLogger
#### Description
Removes all data related to the current server Event Logger is in. Event Logger will then attempt to leave the server by itself. 
ALL data on your database will be removed for the guild. If you are using our server, all data will be removed from our database regarding your guild.
Only an ADMINISTRATOR can execute this command. 
It may be executed from any channel.
#### Arguments
- none
#### Example
User> !removeeventlogger

---

### !Events (!ListEvents)
#### Description
Lists all events currently monitored by the bot (and logging).
#### Arguments
- None
#### Example
User> !Events

Bot> Actively Logged Events: 
```
guildChannelPermissionsChanged
guildMemberBoost
guildMemberUnboost
guildMemberRoleAdd
guildMemberRoleRemove
guildMemberNicknameUpdate
```

---

### !AddEvents
#### Description
Adds one or more events separated by a space to the database for the guild.
Events may be any text, but must correspond to an event in the master list shown below to have any effect.
#### Arguments
- Space separated list of events
#### Example
User> !addevents guildMemberOnline guildMemberOffline

Bot> Successfully added 2 event(s) to be logged.

---

### !RemoveEvents (!DeleteEvents)
#### Description
Removes one or more events separated by a space from the database for the guild.
#### Arguments
- Space separated list of events
#### Example
User> !removeevents guildMemberOnline guildMemberOffline

Bot> Successfully removed 2 event(s).

---

### !EventActions (!ListEventActions)
#### Description
Lists all event actions that have been added to the guild.
#### Arguments
- None
#### Example
User> !EventActions

Bot> Event Actions in Place: 
```
Identifier: 5e660564026d0c7d2cf3bc7f
Event: messageReactionAdd
Code: 
if (emoji.name == 'barcHug' ) {
toggleRoleById('686466070693019679');
removeReactionByEmojiName('🦄');
} else if (emoji.name == '🦄' ) {
removeReactionByEmojiName('barcHug');
}
```

```
Identifier: 5e6612673d41310651586001
Event: messageContentEdited
Code: log('Hello!');
```

---

### !AddEventAction
#### Description
Adds a single event action to an event, events can have any number of event actions.
#### Arguments
- Event name
- Action Code (see below) surrounded by \`\`\` (code block in discord)
#### Example
User> !addEventAction messageContentEdited 
```
log('Hello!');
```

Bot> Successfully added an event action.

---

### !RemoveEventAction (!DeleteEventAction)
#### Description
Removes a single unique event action.
#### Arguments
- Event Action Identifier (from !EventActions)
#### Example
User> !removeEventAction 5e6612673d41310651586001 

Bot> Successfully removed an event action with identifier 5e6612673d41310651586001.

---

### !LogChannels (!ListLogChannels)
#### Description
Lists all log channel redirects on the guild.

When a redirect is in place it will not post to the default log channel.

Each event can have multiple log channels that they post in.
#### Arguments
- None
#### Example
User> !LogChannels

Bot> Log channel redirects in Place: 
```
Identifier: 5eba70865640a65be2a51ccd
Event: messageReactionAdd
Log Channel: another_reaction_log - ID: 53181564338605952
```

```
Identifier: 5eba71026eadcf5cc27ssda
Event: messageReactionAdd
Log Channel: some_channel2 - ID: 74261227326558539
```

---

### !AddLogChannels
#### Description
Adds multiple log channel redirects for the specified event.
#### Arguments
- Event name
- List of channel mentions
#### Example
User> !addlogchannels messageContentEdited #test_log #test_log2 #testlog_3

Bot> Successfully added log channel redirects.

---

### !RemoveLogChannels (!DeleteLogChannels)
#### Description
Removes multiple unique log channel redirects given the id's from !LogChannels.
#### Arguments
- Log Channel Redirect Identifiers (from !LogChannels)
#### Example
User> !removelogchannels 5e6612673d41310651586001 5e6612673d41310651586002 5e6612673d41310651586003

Bot> Successfully removed the selected log channel redirects.

---

# Events
```
'guildChannelPermissionsChanged',
'guildMemberBoost',
'guildMemberUnboost',
'guildMemberRoleAdd',
'guildMemberRoleRemove',
'guildMemberNicknameUpdate',
'guildBoostLevelUp',
'guildBoostLevelDown',
'guildRegionUpdate',
'guildBannerAdd',
'guildAfkChannelAdd',
'guildVanityURLAdd',
'messagePinned',
'messageContentEdited',
'userAvatarUpdate',
'userUsernameUpdate',
'voiceChannelJoin',
'voiceChannelLeave',
'voiceChannelSwitch',
'voiceChannelMute',
'voiceChannelDeaf',
'voiceChannelUnmute',
'voiceChannelUndeaf',
'voiceStreamingStart',
'voiceStreamingStop',
'guildMemberAdd',
'guildMemberRemove',
'messageDelete',
'messageDeleteBulk',
'rolePositionUpdate',
'guildMemberOffline',
'guildMemberOnline',
'unhandledRoleUpdate',
'unhandledUserUpdate',
'unhandledVoiceStateUpdate',
'unhandledMessageUpdate',
'unhandledPresenceUpdate',
'unhandledGuildChannelUpdate',
'unhandledGuildMemberUpdate',
'messageReactionAdd',
'messageReactionRemove',
'messageReactionRemoveAll'
'message'
```

---

# Action Code
Action code makes use of the JS-Interpreter library. This handles ES5 JS only.
It's quite simple, write your response to an event in JS using functions and variables available to the event.

### Functions Available
The functions available in the JS Interpreter include those listed in [InterpreterFunctions](https://github.com/Elliesaur/DiscordEventLogger/blob/20cb45af81c238af3f4c7e63fef2e690b54e3f88/src/EventAction.ts#L71) class.

### Global Variables
The custom global variables will depend on what event was fired.
For a complete list of when each variable appears check out this [InterpreterOptions](https://github.com/Elliesaur/DiscordEventLogger/blob/20cb45af81c238af3f4c7e63fef2e690b54e3f88/src/EventAction.ts#L169) interface.

Global variables are discord.js objects but have been stripped of all nested objects and arrays to support JS-Interpreter.

Only the top level properties that are not objects or arrays are kept when copying the discord.js object into the global object.

