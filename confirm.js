/*
	Module for confirmation of dangerous commands
		- Confirms actions
		
	Requires:
		- SQL Module
		- Stats Module
		- Utility Module
*/
module.exports = function() {
	
	/* Executes actions that require confirmation */
	this.confirmAction = async function(data, message) {
		// Check if the reaction was in time
		if(+data.time + 20 >= getTime()) {
			message.edit("✳ Executing `" + stats.prefix + data.action + "`!")
			message.delete({timeout: 5000});
			// Runs the command
			confirmActionExecute(data.action, message, true);
		} else {
			// Too late
			message.edit("❌ Too late. Not executing `" + stats.prefix + data.action + "`!");
		}
		// Clear reactions
		message.reactions.removeAll().catch(err => {
			logO(err); 
			sendError(messsage.channel, err, "Could not clear reactions");
		});
	}
	
	this.confirmActionExecute = function(command, message, messageSent) {
		switch(command) {
			case "connection reset": if(loadedModuleWhispers) cmdConnectionReset(message.channel); break;
			case "roles clear": if(loadedModuleRoles) cmdRolesClear(message.channel); break;
			case "roles clear_alias": if(loadedModuleRoles) cmdRolesClearAlias(message.channel); break;
			case "start": if(loadedModuleGame) cmdStart(message.channel, false); break;
			case "start_debug": if(loadedModuleGame) cmdStart(message.channel, true); break;
			case "reset": if(loadedModuleGame) cmdReset(message.channel); break;
			case "end": if(loadedModuleGame) cmdEnd(message.channel); break;
			case "killq killall": cmdKillqKillall(message.channel); break;
			case "players list": if(loadedModulePlayers) cmdPlayersList(message.channel); break;
			case "cc cleanup": if(loadedModuleCCs) cmdCCCleanup(message.channel); break;
			case "roles sc_cleanup": if(loadedModuleRoles) cmdRolesScCleanup(message.channel); break;
			case "bulkdelete": cmdBulkDelete(message.channel); break;
			default:	messageSent ? 
							message.edit("⛔ Syntax error. Tried to confirm unknown command!") : 
							message.channel.send("⛔ Syntax error. Tried to confirm unknown command!"); 
							break;
		}
	}
	
	this.helpConfirm = function(member, args) {
		let help = "";
		switch(args[0]) {
			case "":
				if(isGameMaster(member)) help += stats.prefix + "confirm - Deletes webhook & user messages in bulk\n";
			break;
			case "confirm":
				help += "```yaml\nSyntax\n\n" + stats.prefix + "confirm <Command>\n```";
				help += "```\nFunctionality\n\nSkips the confirming stage of a command that requires confirming.\n```";
				help += "```fix\nUsage\n\n> " + stats.prefix + "confirm killq killall```";
			break;
		}
		return help;
	}

	/* Sends a confirmation message */
	this.cmdConfirm = async function(message, action) {
		message.channel.send("❗ Click the reaction in the next `20.0` seconds to confirm `" + message.content + "`!")
		.then(m => {
			m.react("✅").then(r => {
				sql("DELETE FROM confirm_msg WHERE time < " + (getTime() - 900), result => {
					sql("INSERT INTO confirm_msg (id, time, action) VALUES (" + connection.escape(m.id) + "," + connection.escape(getTime()) + "," + connection.escape(action) + ")", result => {
					}, () => {
						// Database error
						m.edit("⛔ Database error. Failed to create confirmation message!");
					});				
				}, () => {
					// Database error
					m.edit("⛔ Database error. Failed to prepare confirmation message!");
				});
			})
			.catch(err => { 
				// Couldn't react
				logO(err); 
				sendError(messsage.channel, err, "Could not create react to message");
			});
		})
		.catch(err => { 
			// Webhook couldn't be created
			logO(err); 
			sendError(messsage.channel, err, "Could not send message");
		});
	}
	
}