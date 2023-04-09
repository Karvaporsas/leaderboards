/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const helper = require('./helper');
const scoreService = require('./services/scoreService');
const queryingService = require('./services/queryingService');
const utils = require('./utils');
//const utils = require('./utils');
//const statsHandler = require('./handlers/statsHandler');
//const pushHandler = require('./handlers/pushHanlder');
//const chartsHandler = require('./handlers/chartsHandler');
const SECRET_CHALLENGE = process.env.SECRET_CHALLENGE;

const INTERNAL_COMMANDS = {
    SET_SCORE: "setScore"
}
const INTERNAL_STEPS = utils.getInternalSteps();

function _getHelpMessage(resolve, reject) {
    var message = `Harmi`;

    resolve({
        status: 1,
        type: 'text',
        message: message
    });
}

function determineNextQuery(type) {
    switch (type) {
        case INTERNAL_STEPS.QUERYING_SCORETYPES:
            return INTERNAL_STEPS.QUERYING_REPS;
        case INTERNAL_STEPS.QUERYING_REPS:
            return INTERNAL_STEPS.QUERYING_WEIGHT;
        case INTERNAL_STEPS.QUERYING_WEIGHT:
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
    let userid = helper.getEventUserId(event);
    console.log(command);
    console.log(event);
    console.log(event.body);
    console.log(userid);

    let exercise = "";
    let userToRespond = userid;
    let chatToRespond = chatId;
    let step = "";

    console.log('Checking if is callback');
    if (helper.isCallback(event)) {
        console.log('Was indeed. Now Parsing data');
        let data = helper.parseCallbackData(helper.getCallbackData(event));
        let callbackId = helper.getCallbackId(event);
        let callbackUserId = helper.getCallbackUserId(event);
        let replyId = helper.getCallbackReplyId(event);
        let replyChatId = helper.getCallbackChatId(event);
        let first = data.shift();

        console.log(first);
        console.log(data);
        if (first === INTERNAL_STEPS.QUERYING_SCORETYPES) {
            exercise = data[0];
            userToRespond = data[1];
            chatToRespond = data[2];
            step = first;
        }
        
        await queryingService.addWaitingQuery(userid, chatId, INTERNAL_STEPS.QUERYING_REPS, exercise);

        result = await scoreService.askRepCount(userToRespond, chatToRespond);
        return result;
    }
    console.log('Was not a callback');
    let queries = await queryingService.loadWaitingQueries(userToRespond, chatToRespond);
    console.log('Got queries');
    console.log(queries);
    
    if (!queries || !queries.length) return result;
    let first = queries[0];

    await queryingService.deleteQueries(queries);    

    let nextQuery = determineNextQuery(first.type);

    switch (nextQuery) {
        case INTERNAL_STEPS.QUERYING_WEIGHT:            
            let reps = parseInt(messageText.replace(',','.'));
            await queryingService.addWaitingQuery(userToRespond, chatToRespond, nextQuery, first.EXERCISE, reps);
            result = await scoreService.askWeight(userToRespond, chatToRespond);
            
            return result;
        default:
            let weight = parseFloat(messageText.replace(',','.'));
            await scoreService.updateScore(userToRespond, chatToRespond, first.EXERCISE, first.REPS, weight);
            return {status: 1};
    }
}