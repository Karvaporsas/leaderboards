/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const helper = require('./../helper');
const database = require('./../database/database');



module.exports.askUserHeight = function () {
    return {status: 1, message: 'Give your height in cm, for example 176', type: 'text'};
}
module.exports.askUserWeight = function () {
    return {status: 1, message: 'Give your weight in kg, for example "76.4"', type: 'text'};
}
module.exports.informUser = async function (weight, height) {
    return {status: 1, message: `Saved your info with ${weight}kg and ${height}cm!`, type: 'text'};
}

module.exports.updateUserInfo = async function (userId, chatId, weight = 0, height = 0) {    
    let existing = await database.getUser(userId);

    if (existing && existing.length) {
        await database.updateUser(userId, chatId, weight, height);
        return {status: 1};
    }

    await database.insertUser(userId, chatId, weight, height);
    return {status: 1};
}