/*
	Module for whispering
		- Connects channels (with optional disguises)
		- Converts yourself into a bot
		
	Requires:
		- Stats/Sql/Utility/Confirm Base Modules
*/
module.exports = function() {
	/* Variables */
	this.loadedModuleWhispers = true;
	
	/* Handles connection command */
	this.cmdConnection = function(message, args) {
		// Check subcommand
		if(!args[0]) { 
			message.channel.send("⛔ Syntax error. Not enough parameters! Correct usage: `connection [add|remove|reset]`"); 
			return; 
		}
		// Find subcommand
		switch(args[0]) {
			case "add": cmdConnectionAdd(message.channel, args); break;
			case "remove": cmdConnectionRemove(message.channel); break;
			case "reset": cmdConfirm(message, "connection reset"); break;
			default: message.channel.send("⛔ Syntax error. Invalid subcommand `" + args[0] + "`!"); break;
		}
	}
	
	/* Help for this module */
	this.helpWhispers = function(member, args) {
		let help = "";
		switch(args[0]) {
			case "":
				help += stats.prefix + "webhook - Repeats a message as a webhook pretending to be you\n";
				if(isGameMaster(member)) help += stats.prefix + "impersonate - Repeats a message as a webhook pretending to be somebody\n";
				if(isGameMaster(member)) help += stats.prefix + "connection [add|remove|reset] - Manages connections\n";
			break;
			case "bot":
			case "webhook":
				help += "```yaml\nSyntax\n\n" + stats.prefix + "webhook <Message>\n```";
				help += "```\nFunctionality\n\nRepeats a message as a webhook pretending to be you.\n```";
				help += "```fix\nUsage\n\n> " + stats.prefix + "webhook Does this work?\n< Does this work?\n```";
				help += "```diff\nAliases\n\n- bot\n- <\n```";
			break;
			case "imp":
			case "impersonate":
				help += "```yaml\nSyntax\n\n" + stats.prefix + "impersonate <User> <Message>\n```";
				help += "```\nFunctionality\n\nRepeats a message as a webhook pretending to be a certain user.\n```";
				help += "```fix\nUsage\n\n> " + stats.prefix + "impersonate 242983689921888256 Does this work?\n< Does this work?\n```";
				help += "```diff\nAliases\n\n- imp\n```";
			break;
			case "con":
			case "whispers":
			case "connection":
				if(!isGameMaster(member)) break;
				switch(args[1]) {
					default:
						help += "```yaml\nSyntax\n\n" + stats.prefix + "connection [add|remove|reset]\n```";
						help += "```\nFunctionality\n\nGroup of commands to handle connected channels. " + stats.prefix + "help connection <sub-command> for detailed help.```";
				help += "```diff\nAliases\n\n- con\n- whispers\n```";
					break;
					case "add":
						help += "```yaml\nSyntax\n\n" + stats.prefix + "connection add <Connection Name> <Connection Diguise>\n```";
						help += "```\nFunctionality\n\nConnects the channel to <Connection Name>. All channels that are connected to the same Connection Name, automatically have all messages copied over to all other channels in the connection, and receive copies from all messages from the other channels in it. If a disguise <Connection Disguise> is set, messages are copied over to other channels using the disguise as a name, instead of the name of a message's author.\n```";
						help += "```fix\nUsage\n\n> " + stats.prefix + "connection add example\n< ✅ Added connection example with no disguise!\n\n> " + stats.prefix + "connection add example Disguised\n< ✅ Added connection example with disguise Disguised!```";
					break;
					case "remove":
						help += "```yaml\nSyntax\n\n" + stats.prefix + "connection remove\n```";
						help += "```\nFunctionality\n\nRemoves all connections from the current channel.\n```";
						help += "```fix\nUsage\n\n> " + stats.prefix + "connection remove\n< ✅ Removed all connections from this channel!\n```";
					break;
					case "reset":
						help += "```yaml\nSyntax\n\n" + stats.prefix + "connection reset\n```";
						help += "```\nFunctionality\n\nRemoves all connections from all channels.\n```";
						help += "```fix\nUsage\n\n> " + stats.prefix + "connection reset\n< ❗ Click the reaction in the next 20.0 seconds to confirm " + stats.prefix + "connection reset!\n< ✅ Successfully reset connections!\n```";
					break;
				}
			break;
		}
		return help;
	}
	
	/* Adds a connection */
	this.cmdConnectionAdd = function(channel, args) {
		// Check arguments
		if(!args[1]) { 
			channel.send("⛔ Syntax error. Not enough parameters!"); 
			return; 
		} else if(!args[2]) { 
			args[2] = ""; 
		}
		// Add connection to DB
		sql("INSERT INTO connected_channels (channel_id, id, name) VALUES (" + connection.escape(channel.id) + "," + connection.escape(args[1]) + "," + connection.escape(args[2]) + ")", result => {
			if(args[2] != "") { 
				// Connection w/ disguise
				channel.send("✅ Added connection `" + args[1] + "` with disguise `" + toTitleCase(args[2]) + "`!");
				log("Whispers > Created connection `" + args[1] + "` with disguise `" + toTitleCase(args[2]) + "`!");
			} else { 
				// Connection w/o disguise
				channel.send("✅ Added connection `" + args[1] + "` with no disguise!");
				log("Whispers > Created connection `" + args[1] + "` with no disguise!");
			}
		}, () => {
			// Couldn't add connection
			channel.send("⛔ Database error. Couldn't add connection `" + args[1] + "`!");
		});
	}
	
	/* Removes a connection */
	this.cmdConnectionRemove = function(channel) {
		// Remove connections from DB
		sql("DELETE FROM connected_channels WHERE channel_id = " + connection.escape(channel.id), result => {
			channel.send("✅ Removed all connections from this channel!");
			log("Whispers > Removed connections from `" + channel.id + "`!");
		}, () => {
			// Database error
			channel.send("⛔ Database error. Couldn't remove connections!");
		});
	}
	
	/* Rests all connections */
	this.cmdConnectionReset = function(channel) {
		sql("DELETE FROM connected_channels", result => {
			channel.send("✅ Successfully reset connections!");
		}, () => {
			channel.send("⛔ Database error. Could not reset connections!");
		});
	}
	
	this.cmdWebhook = function(channel, member, args) {
		// Create a webhook for the author
		let webhookName = member ? member.displayName : client.user.username;
		let webhookAvatar = member ? member.user.displayAvatarURL() : client.user.displayAvatarURL();
		let webhookMsg = args.join(" ");
		webhookMsg = webhookMsg.replace(/:~/g, ":");
		if(!(webhookMsg.length > 0)) webhookMsg = "|| ||";
		channel.fetchWebhooks()
			.then(webhooks => {
				// search for webhook 
				let webhook = webhooks.find(w => w.name == webhookName);
				// webhook exists
				if(webhook) {
					webhook.send(webhookMsg);
				} else { // no webhook
					if(webhooks.size < 10) { // empty slot
						channel.createWebhook(webhookName, {avatar: webhookAvatar})
						.then(webhook => {
							// Send webhook
							webhook.send(webhookMsg)
						})
						.catch(err => { 
							// Webhook couldn't be created
							logO(err); 
							sendError(messsage.channel, err, "Could not create webhook");
						});
					} else { // no empty slot
						channel.send("**" + webhookName + "**: " + webhookMsg);
						webhooks.first().delete();
					}
				}
			});
	}
	
	/* Copies over messages */
	this.connectionExecute = function(message) {
		if(connection && !message.author.bot && message.content.indexOf(stats.prefix) !== 0) {
			// Find connection id(s)
			sql("SELECT id, name FROM connected_channels WHERE channel_id = " + connection.escape(message.channel.id), result => {
				// For each connection id, find each connected channel
				result.forEach(source => {
					sql("SELECT channel_id, name FROM connected_channels WHERE id = " + connection.escape(source.id), result => {
						// Write message in each channel
						result.forEach(destination => {
							// Ignore if it's same channel as source
							if(destination.channel_id != message.channel.id) { 	
								// Create webhook
								let webhookName = source.name != "" ? toTitleCase(source.name) : message.member.displayName;
								let webhookAvatar = source.name != "" ? client.user.displayAvatarURL() : message.author.displayAvatarURL();
								let webhookMsg = message.content;
								webhookMsg = webhookMsg.replace(/:~/g, ":");
								
								message.guild.channels.cache.get(destination.channel_id).fetchWebhooks()
								.then(webhooks => {
									// search for webhook 
									let webhook = webhooks.find(w => w.name == webhookName);
									// webhook exists
									if(webhook) {
										webhook.send(webhookMsg);
									} else { // no webhook
										if(webhooks.size < 10) { // empty slot
											message.guild.channels.cache.get(destination.channel_id).createWebhook(webhookName, {avatar: webhookAvatar})
											.then(webhook => {
												// Send webhook
												webhook.send(webhookMsg)
											})
											.catch(err => { 
												// Webhook couldn't be created
												logO(err); 
												sendError(messsage.channel, err, "Could not create webhook");
											});
										} else { // no empty slot
											message.guild.channels.cache.get(destination.channel_id).send("**" + webhookName + "**: " + webhookMsg);
											webhooks.first().delete();
										}
									}
								});
							}		
						});
					}, () => {
						// Database error
						log("⛔ Database error. Could not access connected channels via id!");
					});
				});
			}, () => {
				// Database error
				log("⛔ Database error. Could not access connected channels via channel!");
			});
		}
	}
	
}
