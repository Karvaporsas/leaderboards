/*jslint node: true */
/*jshint esversion: 6 */
'use strict';
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const helper = require('./helper');
const FormData = require('form-data');
const fs = require('fs');
const Axios = require('axios');
const _keyboard_cols = 3;
const URL_BASE = 'https://api.telegram.org/bot';
const utils = require('./utils');
const logger = require('./logger');

function checkShouldEndListener(messageObject) {
    return new Promise((resolve, reject) => {
        if (messageObject.handleCallBack) {
            var url = `${URL_BASE}${TELEGRAM_TOKEN}`;
            var form = {
                callback_query_id: messageObject.handleCallBack.callbackId,
                text: 'Ladattu'
            };
            var msg = {
                method: 'POST',
                uri: `${url}/answerCallbackQuery`,
                form: form
            };

            rp(msg).then((r) => {
                resolve(r);
            }).catch((e) => {
                logger.debug('Error sending message');
                logger.debug(e);
                reject();
            });
        } else {
            resolve({status: 1});
        }
    });
}

function checkShouldUpdate(messageObject) {
    return new Promise((resolve, reject) => {
        if (messageObject.updateMessage) {
            var url = `${URL_BASE}${TELEGRAM_TOKEN}`;
            var secondMessage = {
                method: 'POST',
                uri: `${url}/editMessageText`,
                form: {
                    text: messageObject.updateMessage.message,
                    message_id: messageObject.updateMessage.replyId,
                    chat_id: messageObject.updateMessage.chatId,
                    parse_mode: 'HTML'
                }
            };

            logger.debug("Sending update message");
            rp(secondMessage).then((r) => {
                logger.debug(r);                
                resolve(r);
            }).catch((e) => {
                logger.debug('Error sending second message');
                logger.debug(e);
                reject();
            });
        } else {
            resolve({status: 1});
        }
    });
}

function _sendByAxios(chatId, method, messageObject, resolve, reject) {    
    logger.debug(`ChatId is ${chatId}`);    

    if (messageObject.chatId && !chatId) chatId = messageObject.chatId;
    var url = `${URL_BASE}${TELEGRAM_TOKEN}/${method}`;
    var formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('parse_mode', 'HTML');

    switch (method) {
        case 'sendPhoto':
            formData.append('photo', fs.createReadStream(messageObject.image));
            formData.append('caption', messageObject.caption);
            break;
        default:
            reject('Unknown message type to axios');
            return;
    }

    Axios.create({
        headers: formData.getHeaders()
    }).post(url, formData).then((result) => {

        return checkShouldUpdate(messageObject);
    }).then((updateResponse) => {
        return checkShouldEndListener(messageObject);

    }).then((listenerResponse) => {
        resolve(listenerResponse);
    }).catch((err) => {
        logger.debug('Error while sending axios message');
        logger.debug(err);
        reject(err);
    });
}

module.exports.sendMessageToTelegram = async function(chatId, messageObject) {
    let result = {};
    let method = '';
    let form = {
        chat_id: chatId
    };

    logger.debug("Constructing message");
    logger.debug(messageObject);
    logger.debug(chatId);

    switch (messageObject.type) {
        case 'text':
            method = 'sendMessage';
            form.text = messageObject.message;
            form.parse_mode = 'HTML';
            break;
        case 'photo':
            method = 'sendPhoto';
            form.photo = messageObject.photo;
            form.caption = messageObject.caption;
            break;
        case 'callback':
            method = 'answerCallbackQuery';
            delete form.chat_id;
            form.callback_query_id = messageObject.callbackId;
            form.text = messageObject.message;
            break;
        case 'image':
            method = 'sendPhoto';
            result = await _sendByAxios(chatId, method, messageObject, resolve, reject);
            
        default:
            logger.fatal(`Tried to send message with unknown type ${messageObject.type}`);
            return utils.getStandardRepsonse('Insufficent message data');
    }

    if (messageObject.messageId) form.reply_to_message_id = messageObject.messageId;

    if(messageObject.keyboard) {
        form.reply_markup = {
            keyboard: helper.createKeyboardLayout(messageObject.keyboard, _keyboard_cols),
            one_time_keyboard: messageObject.hideKeyboard ? true : false,
            selective: true
        };
    }
    if (messageObject.removeKeyboard) {
        if (!form.reply_markup) form.reply_markup = {};

        form.reply_markup.remove_keyboard = true;
    }

    if (form.reply_markup) {
        form.reply_markup = JSON.stringify(form.reply_markup);
    }

    let url = `${URL_BASE}${TELEGRAM_TOKEN}/${method}`;
    
    logger.debug(form);
    logger.debug(url);    
    logger.debug("NOW SENDING WITH AXIOS");

    result = await Axios.post(url, form);

    logger.debug("Response from telegram:");
    logger.debug(result);

    return result;
}

