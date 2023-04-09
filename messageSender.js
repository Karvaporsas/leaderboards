/*jslint node: true */
/*jshint esversion: 6 */
'use strict';
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const DEBUG_MODE = process.env.DEBUG_MODE === 'ON';
const helper = require('./helper');
const FormData = require('form-data');
const fs = require('fs');
const Axios = require('axios');
const _keyboard_cols = 2;
const URL_BASE = 'https://api.telegram.org/bot';
const utils = require('./utils');

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
                console.log('Error sending message');
                console.log(e);
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

            console.log("Sending update message");
            rp(secondMessage).then((r) => {
                if (DEBUG_MODE) {
                    console.log(r);
                }
                resolve(r);
            }).catch((e) => {
                console.log('Error sending second message');
                console.log(e);
                reject();
            });
        } else {
            resolve({status: 1});
        }
    });
}

function _sendByAxios(chatId, method, messageObject, resolve, reject) {
    if (DEBUG_MODE) {
        console.log(`ChatId is ${chatId}`);
    }
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
        console.log('Error while sending axios message');
        console.log(err);
        reject(err);
    });
}

module.exports.sendMessageToTelegram = async function(chatId, messageObject) {
    let result = {};
    let method = '';
    let form = {
        chat_id: chatId
    };

    if (DEBUG_MODE) {
        console.log("Constructing message");
        console.log(messageObject);
        console.log(chatId);
    }

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
            console.error(`Tried to send message with unknown type ${messageObject.type}`);
            return utils.getStandardRepsonse('Insufficent message data');
    }

    if(messageObject.keyboard) {
        form.reply_markup = JSON.stringify({
            inline_keyboard: helper.createKeyboardLayout(messageObject.keyboard, _keyboard_cols),
        });
    }

    let url = `${URL_BASE}${TELEGRAM_TOKEN}/${method}`;

    if (DEBUG_MODE) {
        console.log(form);
        console.log(url);
    }
    console.log("NOW SENDING WITH AXIOS");
    result = await Axios.post(url, form);    

    if (DEBUG_MODE) {
        console.log("Response from telegram:");
        console.log(result);
    }

    return result;
}

