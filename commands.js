/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const helper = require('./helper');
const scoreService = require('./services/scoreService');
const userService = require('./services/userService');
const queryingService = require('./services/queryingService');
const utils = require('./utils');

const INTERNAL_STEPS = utils.getInternalSteps();
const SECRET_CHALLENGE = process.env.SECRET_CHALLENGE;

const INTERNAL_COMMANDS = {
    SET_SCORE: "setscore",
    LEADERBOARDS: "leaderboards",
    SET_USERINFO: "setuserinfo" 
}

/**
 * Commands
 */

module.exports.processCommand = async function (event, chatId) {
    let result = {status: 0, message: "Nothing done"};    

    let messageText = helper.getEventMessageText(event);
    let command = helper.parseCommand(messageText);
    let userId = helper.getEventUserId(event);
    let messageId = helper.getEventMessageId(event);    

    switch (command.name) {
        case INTERNAL_COMMANDS.SET_SCORE:
            await queryingService.addWaitingQuery(userId, chatId, INTERNAL_STEPS.QUERYING_SCORETYPES);
            return scoreService.askScoreType(userId, chatId, messageId);
            
        case INTERNAL_COMMANDS.SET_USERINFO:
            await queryingService.addWaitingQuery(userId, chatId, INTERNAL_STEPS.QUERYING_USER_HEIGHT);
            return userService.askUserHeight();

        case INTERNAL_COMMANDS.LEADERBOARDS:
            await queryingService.addWaitingQuery(userId, chatId, INTERNAL_STEPS.QUERYING_SCORETYPE_FOR_LEADERBOARD);
            return scoreService.askLeaderboardType(userId, chatId, messageId);

        default:
            console.log("Command not recognized");
            return result;
    }
}