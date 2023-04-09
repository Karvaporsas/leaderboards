/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const commands = require('./commands');
const talker = require('./talker');
const helper = require('./helper');
const messageSender = require('./messageSender');

const DEBUG_MODE = process.env.DEBUG_MODE === 'ON';

/**
 * Basic AWS Lambda handler. This is called when Telegram sends any messages to AWS API
 * @param event Message from Telegram
 * @param context Lambda context
 * @returns HTML status response with statusCode 200
 */
exports.handler = async (event, context) => {
    console.log('starting to process message');

    const chatId = helper.getEventChatId(event);
    const standardResponse = {
        statusCode: 200,
    };

    if (DEBUG_MODE) {
        console.log(event.body);
    }
    var result = await commands.processCommand(event, chatId);

    if (DEBUG_MODE) {
        console.log("RESULT:");
        console.log(result);
        console.log(chatId);
    }
    
    if (result.status === 0) {
        result = await talker.chat(event, chatId);        
    }
    
    if (result.status === 1) {
        await messageSender.sendMessageToTelegram(chatId, result);
    }    

    if (result.status !== 1) {
        //Not error, but not a success
        context.succeed('No need to send message');
        return standardResponse;
    }

    return standardResponse;
};