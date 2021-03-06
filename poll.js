/*
	Module for polls
		- Logging / Errors
		- Time
		- Title Case
		- Remove array duplicates
		- Pinging
		- Handelling channels
		- Handelling command permissions
	
	Requires:
		- Stats/Sql/Utility/Confirm Base Modules
		- Players Module
*/
module.exports = function() {
	/* Variables */
	this.loadedModulePoll = true;
	
	/* Handle poll command */
	this.cmdPoll = function(message, args) {
		if(!loadedModulePlayers) return;
		// Check subcommand
		if(!args[0]) { 
			message.channel.send("⛔ Syntax error. Not enough parameters!"); 
			return; 
		}
		// Find subcommand
		switch(args[0]) {
			case "new":  cmdPollNew(message.channel, args); break;
			case "end": 
			case "close": cmdPollClose(message.channel, args); break;
			default: message.channel.send("⛔ Syntax error. Invalid subcommand `" + args[0] + "`!"); break;
		}
	}
	
	/* Handles poll creation command */
	this.cmdPollNew = function(channel, args) {
		switch(args[1]) {
			case "public": pollCreate(channel, args, "public"); break;
			case "private": pollCreate(channel, args, "private"); break;
			case "dead": pollCreate(channel, args, "dead"); break;
			case "dead_list": pollCreate(channel, args, "dead_list"); break;
			case "dead_vote": pollCreate(channel, args, "dead_vote"); break;
			case "yn": pollCreate(channel, args, "yn"); break;
			case "yna": pollCreate(channel, args, "yna"); break;
			default:  
				if(isCC(channel) || isSC(channel)) pollCreate(channel, args, "private");
				else pollCreate(channel, args, "public");
			break;
		}
	}
	
	/* Help for this module */
	this.helpPoll = function(member, args) {
		let help = "";
		switch(args[0]) {
			case "":
				if(isGameMaster(member)) help += stats.prefix + "poll [new|close] - Manages polls\n";
			break;
			case "poll":
			case "polls":
			case "pl":
				if(!isGameMaster(member)) break;
				switch(args[1]) {
					default:
						help += "```yaml\nSyntax\n\n" + stats.prefix + "poll [new|close]\n```";
						help += "```\nFunctionality\n\nGroup of commands to handle polls. " + stats.prefix + "help poll <sub-command> for detailed help.```";
						help += "```diff\nAliases\n\n- pl\n- polls\n```";
					break;
					case "new":
						help += "```yaml\nSyntax\n\n" + stats.prefix + "poll new <Poll Type>\n```";
						help += "```\nFunctionality\n\nCreates a new poll. If no poll type is provided, and the command is executed in a secret channel, poll type is set to private, otherwise it is set to public. Assigns a sort of random name to each new poll.\n\nList of Poll Types:\npublic: Has all alive players, as well as an Abstain option. Uses public_value player property to evaluate poll results. Adds a players public_votes value to their own result. Only allows alive participants to vote. Mayor get an extra vote, unless they have less than 0 vote, then they get an extra negative vote.\nprivate: Has all alive players. Uses private_value player property to evaluate poll results. Only allows alive participants to vote.\ndead: Has Yes/No options. Every vote has a value of 1. Only allows dead participants to vote.\nyn: Yes/No for Participants\nyna: Yes/No/Abstain for Participants\ndead_vote: A list of dead participants, and only dead participants can vote on it.\ndead_list: Same as dead but shows who voted what.```";
						help += "```fix\nUsage\n\n> " + stats.prefix + "poll new\n\n> " +  stats.prefix + "poll new public```";
					break;
					case "close":
						help += "```yaml\nSyntax\n\n" + stats.prefix + "poll close <Poll Name(s)>```";
						help += "```\nFunctionality\n\nCloses a poll with the name <Poll Name> evaluates it depending on what type it is and sends the results in the channel the command is run in. If more than one poll name is provided, attempts to close all polls```";
						help += "```fix\nUsage\n\n> " + stats.prefix + "poll close dsk\n```";
					break;
				}
			break;
		}
		return help;
	}
	
	/* Create new poll */
	this.pollCreate = async function(channel, args, type) {
		// Cache vote values
		getVotes();
		// Get a list of players
		sql("SELECT id,emoji FROM players WHERE alive = " + (type=="dead_vote"?"0":"1"), result => {
			sqlGetStat(13, pollNum => {
				// Get player lists
				let pollName = Math.random().toString(36).replace(/[^a-z]+/g, "").substr(0, 1) + ((((+pollNum) + 2) * 3)  - 4).toString(36).replace(/[^a-z]+/g, "a") + Math.random().toString(36).replace(/[^a-z]+/g, "").substr(0, 1);
				let playerLists = [], playerList = result.map(el => [el.emoji, channel.guild.members.cache.get(el.id)]);
				if(type === "public" && stats.poll == 0) playerList.push(["⛔", "*Abstain*"]);
				if(type === "dead_vote" && stats.poll == 0) playerList.push(["⛔", "*Abstain*"]);
				else if(type === "public" && stats.poll == 1) playerList.push(["❌", "*Cancel*"]);
				else if(type === "dead_vote" && stats.poll == 1) playerList.push(["❌", "*Cancel*"]);
				else if(type === "dead") playerList = [[client.emojis.cache.get(stats.yes_emoji), "Yes"], [client.emojis.cache.get(stats.no_emoji), "No"]];
				else if(type === "dead_list") playerList = [[client.emojis.cache.get(stats.yes_emoji), "Yes"], [client.emojis.cache.get(stats.no_emoji), "No"]];
				else if(type === "yn") playerList = [[client.emojis.cache.get(stats.yes_emoji), "Yes"], [client.emojis.cache.get(stats.no_emoji), "No"]];
				else if(type === "yna") playerList = [[client.emojis.cache.get(stats.yes_emoji), "Yes"], [client.emojis.cache.get(stats.no_emoji), "No"], ["⛔", "*Abstain*"]];
				while(playerList.length > 0) playerLists.push(playerList.splice(0, 20));
				// Print message
				channel.send("Poll `#" + pollName + "`");
				// Handle each message of the poll
				playerLists.forEach(list => {
					let pollMsg = list.map(el => el.join(" - ")).join("\n");
					channel.send(pollMsg).then(m => {
						pollReact(m, list, 0);
						sql("INSERT INTO polls (poll_id, message_id, type) VALUES (" + connection.escape(pollName) + ", " + connection.escape(m.id) + ", " + connection.escape(type) + ")", result => {
						}, () => {
							// DB Error
							channel.send("⛔ Database error. Could not add poll message to database!");
						});	
					}).catch(err => { 
						logO(err); 
						sendError(channel, err, "Could not create poll");
					});
				});
				// Increment poll count
				sql("UPDATE stats SET value = value + 1 WHERE id = 13", result => {
				}, () => {
					channel.send("⛔ Database error. Could not increment Poll count!"); 
				});
			}, () => {
				// DB error
				channel.send("⛔ Database error. Could not find Poll info!");
			});
		}, () => {
			// DB error
			channel.send("⛔ Database error. Could not list alive players!");
		});
	}
	
	/* Closes a poll */
	this.cmdPollClose = async function(channel, args) {
		let pollNames = args.splice(1);
		pollNames.forEach(el => cmdPollCloseOne(channel, el));
	}
	
	this.cmdPollCloseOne = async function(channel, pollName) {
		sql("SELECT message_id,type FROM polls WHERE poll_id = " + connection.escape(pollName), result => {
			if(result.length > 0) pollGetReactions(channel, result.map(el => el.message_id), [], 0, result[0].type, pollName);
			else channel.send("⛔ Database error. Could not find poll!");
		}, () => {
			channel.send("⛔ Database error. Could not get info from poll database!");
		});
	}
	
	/* Gets value of a vote */
	this.pollValue = function(member, type) {
		let voteValue = 0;
		switch(type) {
			case "public": 
				if(!isParticipant(member)) return 0;
				voteValue = + publicValues.find(el => el.id === member.id).public_value;
				if(member.roles.cache.get(stats.mayor) && voteValue >= 0) {
					voteValue++;
				} else if(member.roles.cache.get(stats.mayor) && voteValue < 0) {
					voteValue--;
				}
			break;
			case "private": 
				if(!isParticipant(member)) return 0;
				voteValue = + privateValues.find(el => el.id === member.id).private_value;
			break;
			case "dead": 
			case "dead_vote": 
			case "dead_list": 
				if(!isDeadParticipant(member)) return 0;
				voteValue = 1;
			break;
			default: 
				if(!isParticipant(member)) return 0;
				voteValue = 1;
			break;
		}
		return voteValue;
	}
	
	this.pollGetReactions = function(channel, messages, reactions, index, pollType, pollNum) {
		if(index >= messages.length) {
			pollGetVoters(channel, reactions, 0, pollType, pollNum, messages);
			return;
		} else {
			channel.messages.fetch(messages[index]).then(m => {
				let newReactions = reactions.concat(m.reactions.cache.map((data,emoji) => { return {emoji_id: emoji, emoji: emoji.match(/\d+/) ? "<:" + (client.emojis.cache.get(emoji).name).toLowerCase() + ":"  + client.emojis.cache.get(emoji).id + ">" : emoji, users: data.users, count: data.count, messageID: data.messageID}; }));
				//logO(newReactions);
				//channel.send("```" + JSON.stringify(newReactions, null, 4) + "```");
				//channel.send("```" + JSON.stringify(emojiIDs, null, 4) + "```");
				pollGetReactions(channel, messages, newReactions, ++index, pollType, pollNum);
			}).catch(err => { 
				logO(err); 
				sendError(channel, err, "Could not find poll message");
			});
		}
	}
	
	/* Gets a voter from a poll */
	this.pollGetVoters = function(channel, reactions, index, pollType, pollNum, messages) {
		if(index >= reactions.length) {
			pollPrintResult(channel, reactions, pollType, pollNum, messages);
		} else {
			// Fetch each user
			reactions[index].users.fetch().then(u => {
				pollGetVoters(channel, reactions, ++index, pollType, pollNum, messages);
			}).catch(err => { 
				// Discord error
				logO(err); 
				sendError(channel, err, "Could not find all voters");
			});
		}
	}
	
	/* Prints a poll result */
	this.pollPrintResult = function(channel, reactions, pollType, pollNum, messages) {
		// Find duplicate votes
		let duplicates = ([].concat.apply([], reactions.map(el => el.users.cache.array()))).filter((el, index, array) => array.indexOf(el) != index).filter((el, index, array) => array.indexOf(el) === index);
		// Create message
		let votesMessage = reactions.filter(el => el.users.cache.array().length > 1 || (emojiToID(el.emoji) && publicVotes.find(el2 => el2.id === emojiToID(el.emoji)).public_votes > 0)).map(el => {
			// Get non duplicate voters
			let votersList = el.users.cache.array().filter(el => !duplicates.includes(el)).map(el3 => channel.guild.members.cache.get(el3.id));
			if(!votersList.length && (!emojiToID(el.emoji) || publicVotes.find(el2 => el2.id === emojiToID(el.emoji)).public_votes <= 0)) return { valid: false };
			// Count votes
			let votes = 0;
			if(votersList.length) votes += votersList.map(el => pollValue(el, pollType)).reduce((a, b) => a + b);
			if(pollType === "public") votes += emojiToID(el.emoji) ? publicVotes.find(el2 => el2.id === emojiToID(el.emoji)).public_votes : 0;
			if(votes <= 0) return { valid: false };
			// Get string of voters
			let voters;
			if(pollType != "dead" && pollType != "dead_vote" && pollType != "dead_list") voters = votersList.filter(el => isParticipant(el)).join(", ");
			else voters = votersList.filter(el => isDeadParticipant(el)).join(", ");
			// Get candidate from emoji
			let candidate = "not set";
			if(el.emoji == "⛔") candidate = "Abstain";
			else if(el.emoji == "❌") candidate = "Cancel";
			else if(el.emoji_id == stats.yes_emoji) candidate = "Yes";
			else if(el.emoji_id == stats.no_emoji) candidate = "No";
			else candidate = channel.guild.members.cache.get(emojiToID(el.emoji));
			// Return one message line
			return { valid: true, votes: votes, candidate: candidate, emoji: el.emoji, voters: voters };
	}).filter(el => el.valid).sort((a, b) => a.votes < b.votes).map(el => { 
		let vot = (el.voters ? el.voters : "*Nobody*"); 
		if(pollType === "dead") vot = "*Hidden*";
		return `(${el.votes}) ${el.emoji} ${el.candidate} **-** ${vot}`;
	}).join("\n");
		// Send message
		if(!votesMessage.length) votesMessage = "*Nobody voted...*";
		channel.send("Results for Poll `#" + pollNum + "`:\n" + votesMessage);
		messages.forEach(el => {
			channel.messages.fetch(el).then(m => {
				m.reactions.removeAll().catch(err => { 
					// Discord error
					logO(err); 
					sendError(channel, err, "Could not clear reactions");
				});
			});
			sql("DELETE FROM polls WHERE message_id = " + connection.escape(el), result => {			
			}, () => {
				// DB error
				channel.send("⛔ Database error. Could not delete poll from database!");
			});
		});
	}
	
	/* Reacts once to a poll message */
	this.pollReact = function(message, list, index) {
		// Check end of list
		if(index > 20 || index >= list.length) return;
		// React to message
		message.react(typeof list[index][0] === "string" ? list[index][0].replace(/<|>/g,"") : list[index][0]).then(r => {
			// Recursively continue
			pollReact(message, list, ++index);
		}).catch(err => { 
			// Permission error
			logO(err); 
			sendError(channel, err, "Could not react to poll");
		});
	}


	
}
