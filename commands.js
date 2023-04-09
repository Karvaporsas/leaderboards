/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const helper = require('./helper');
const scoreService = require('./services/scoreService');
const queryingService = require('./services/queryingService');
//const utils = require('./utils');
//const statsHandler = require('./handlers/statsHandler');
//const pushHandler = require('./handlers/pushHanlder');
//const chartsHandler = require('./handlers/chartsHandler');
const SECRET_CHALLENGE = process.env.SECRET_CHALLENGE;

const INTERNAL_COMMANDS = {
    SET_SCORE: "setScore"
}

function _getHelpMessage(resolve, reject) {
    var message = `Harmi`;

    resolve({
        status: 1,
        type: 'text',
        message: message
    });
}



/**
 * Commands
 */

module.exports.processCommand = async function (event, chatId) {
    let result = {status: 0, message: "Nothing done"};    

    let messageText = helper.getEventMessageText(event);
    let command = helper.parseCommand(messageText);
    let userid = helper.getEventUserId(event);    

    switch (command.name) {
        case INTERNAL_COMMANDS.SET_SCORE:
            let response = scoreService.askScoreType(userid, chatId);            
            return response;
        default:
            console.log("Command not recognized");
            return result;
    }
}