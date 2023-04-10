/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const commands = require('./commands');
const talker = require('./talker');
const helper = require('./helper');
const messageSender = require('./messageSender');
const logger = require('./logger');

/**
 * Basic AWS Lambda handler. This is called when Telegram sends any messages to AWS API
 * @param event Message from Telegram
 * @param context Lambda context
 * @returns HTML status response with statusCode 200
 */
exports.handler = async (event, context) => {
    logger.debug('starting to process message');

    const chatId = helper.getEventChatId(event);
    const standardResponse = {
        statusCode: 200,
    };    
    
    logger.debug(event.body);
    
    var result = await commands.processCommand(event, chatId);
    
    logger.debug("RESULT:");
    logger.debug(result);
    logger.debug(chatId);
    
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