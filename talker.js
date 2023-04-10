/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const helper = require('./helper');
const scoreService = require('./services/scoreService');
const userService = require('./services/userService');
const queryingService = require('./services/queryingService');
const utils = require('./utils');
const INTERNAL_STEPS = utils.getInternalSteps();
const logger = require('./logger');


function determineNextQuery(type) {
    logger.debug(`Determining type ${type}`);
    switch (type) {
        case INTERNAL_STEPS.QUERYING_SCORETYPES:
            return INTERNAL_STEPS.QUERYING_REPS;
        case INTERNAL_STEPS.QUERYING_REPS:
            return INTERNAL_STEPS.QUERYING_WEIGHT;
        case INTERNAL_STEPS.QUERYING_WEIGHT:
            return INTERNAL_STEPS.READY_TO_SAVE;
        case INTERNAL_STEPS.QUERYING_USER_HEIGHT:
            return INTERNAL_STEPS.QUERYING_USER_WEIGHT;
        case INTERNAL_STEPS.QUERYING_USER_WEIGHT:
            return INTERNAL_STEPS.READY_TO_SAVE_USER_INFO;
        default:
            return null;
    }
}

/**
 * Commands
 */

module.exports.chat = async function (event, chatId) {
    logger.debug('Starting to chat');
    let result = {success: 0, message: "Nothing done"};
    
    let messageText = helper.getEventMessageText(event);    
    let userId = helper.getEventUserId(event);
    let messageId = helper.getEventMessageId(event);
    
    logger.debug(event);
    logger.debug(event.body);
    logger.debug(userId);

    let exercise = "";

    let queries = await queryingService.loadWaitingQueries(userId, chatId);
    logger.debug('Got queries');
    logger.debug(queries);
    
    if (!queries || !queries.length) return result;
    let first = queries[0];
    let exerciseCandidate = helper.getMessageText(event);    

    let isValidScoreType = scoreService.isSupportedScoreType(exerciseCandidate);
    if (first.QUERYTYPE === INTERNAL_STEPS.QUERYING_SCORETYPES && !isValidScoreType) return {status: 1, message: 'Did not recognize score type. Try again.', type: 'text'};

    let isValidLeaderboardType = scoreService.isSupportedLeaderboardType(exerciseCandidate);
    if (first.QUERYTYPE === INTERNAL_STEPS.QUERYING_SCORETYPE_FOR_LEADERBOARD && !isValidLeaderboardType) return {status: 1, message: 'Did not recognize leaderboard type. Try again.', type: 'text'};
    
    await queryingService.deleteQueries(queries);
    logger.debug("All deletions done. Determining next step");    

    let nextQuery = determineNextQuery(first.QUERYTYPE);

    switch (first.QUERYTYPE) {
        case INTERNAL_STEPS.QUERYING_SCORETYPES:            
            exercise = exerciseCandidate;
            await queryingService.addWaitingQuery(userId, chatId, nextQuery, exercise);
            result = await scoreService.askRepCount(exercise);
            return result;

        case INTERNAL_STEPS.QUERYING_REPS:
            let reps = parseInt(messageText.replace(',','.'));
            logger.debug(`Got ${reps} reps`);
            await queryingService.addWaitingQuery(userId, chatId, nextQuery, first.EXERCISE, reps);
            logger.debug("Asking weight");
            result = await scoreService.askWeight(first.EXERCISE);            
            return result;

        case INTERNAL_STEPS.QUERYING_WEIGHT:        
            let weight = parseFloat(messageText.replace(',','.'));
            logger.debug(`Got weight of ${weight}`);
            await scoreService.updateScore(userId, chatId, first.EXERCISE, first.REPS, weight, helper.getEventMessageName(event));
            result = await scoreService.informUser(first.EXERCISE, first.REPS, weight);
            return result;

        case INTERNAL_STEPS.QUERYING_USER_HEIGHT:
            let height = parseFloat(messageText.replace(',','.'));
            logger.debug(`Got height of ${height}`);
            await queryingService.addWaitingQuery(userId, chatId, nextQuery, "", 0, 0, height);
            result = userService.askUserWeight();
            return result;

        case INTERNAL_STEPS.QUERYING_USER_WEIGHT:
            let userweight = parseFloat(messageText.replace(',','.'));
            logger.debug(`Got weight of ${userweight}`);
            await userService.updateUserInfo(userId, chatId, userweight, first.USERHEIGHT);
            result = userService.informUser(userweight, first.USERHEIGHT);
            return result;

        case INTERNAL_STEPS.QUERYING_SCORETYPE_FOR_LEADERBOARD:
            result = await scoreService.getLeaderboards(chatId, exerciseCandidate, messageId);
            return result;

        default:
            logger.debug("Unknown step. Don't know what to do...");
            return {status: 0};
    }
}