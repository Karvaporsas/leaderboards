/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const helper = require('./helper');
const scoreService = require('./services/scoreService');
const queryingService = require('./services/queryingService');
const utils = require('./utils');
const INTERNAL_STEPS = utils.getInternalSteps();

function determineNextQuery(type) {
    console.log(`Determining type ${type}`);
    switch (type) {
        case INTERNAL_STEPS.QUERYING_SCORETYPES:
            return INTERNAL_STEPS.QUERYING_REPS;
        case INTERNAL_STEPS.QUERYING_REPS:
            return INTERNAL_STEPS.QUERYING_WEIGHT;
        case INTERNAL_STEPS.QUERYING_WEIGHT:
            return INTERNAL_STEPS.READY_TO_SAVE;
        default:
            return null;
    }
}

/**
 * Commands
 */

module.exports.chat = async function (event, chatId) {
    console.log('Starting to chat');
    let result = {success: 0, message: "Nothing done"};
    
    let messageText = helper.getEventMessageText(event);
    let command = helper.parseCommand(messageText);
    let userId = helper.getEventUserId(event);
    console.log(command);
    console.log(event);
    console.log(event.body);
    console.log(userId);

    let exercise = "";

    let queries = await queryingService.loadWaitingQueries(userId, chatId);
    console.log('Got queries');
    console.log(queries);
    
    if (!queries || !queries.length) return result;
    let first = queries[0];
    let exerciseCandidate = helper.getMessageText(event);    
    let isValidScoreType = scoreService.isSupportedScoreType(exerciseCandidate);    

    if (first.QUERYTYPE === INTERNAL_STEPS.QUERYING_SCORETYPES && !isValidScoreType) return {status: 1, message: 'Did not recognize score type. Try again.', type: 'text'};
    
    await queryingService.deleteQueries(queries);
    console.log("All deletions done. Determining next step");    

    let nextQuery = determineNextQuery(first.QUERYTYPE);

    switch (first.QUERYTYPE) {
        case INTERNAL_STEPS.QUERYING_SCORETYPES:            
            exercise = exerciseCandidate;
            await queryingService.addWaitingQuery(userId, chatId, nextQuery, exercise);
            result = await scoreService.askRepCount(exercise);
            return result;

        case INTERNAL_STEPS.QUERYING_REPS:
            let reps = parseInt(messageText.replace(',','.'));
            console.log(`Got ${reps} reps`);
            await queryingService.addWaitingQuery(userId, chatId, nextQuery, first.EXERCISE, reps);
            console.log("Asking weight");
            result = await scoreService.askWeight(exercise);            
            return result;

        case INTERNAL_STEPS.QUERYING_WEIGHT:        
            let weight = parseFloat(messageText.replace(',','.'));
            console.log(`Got weight of ${weight}`);
            await scoreService.updateScore(userId, chatId, first.EXERCISE, first.REPS, weight);
            result = await scoreService.informUser(first.EXERCISE, first.REPS, weight);
            return result;

        default:
            console.log("Unknown step. Don't know what to do...");
            return {status: 0};
    }
}