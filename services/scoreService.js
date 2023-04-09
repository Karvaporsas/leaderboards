/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const helper = require('./../helper');
const database = require('./../database/database');
const { chat } = require('../talker');

const supportedTypes = ["Bench press"];

module.exports.askScoreType = async function (userId, chatId) {
    return {status: 1, keyboard: helper.getButtonData(supportedTypes, 'scoretypes', [userId, chatId]), message: 'Which exercise score would you like to record?', type: 'text'};
}
module.exports.askRepCount = async function (userid, chatId) {
    return {status: 1, message: 'Give rep count for that exercise', type: 'text'};
}
module.exports.askWeight = async function (userid, chatId) {
    return {status: 1, message: 'Give weight for exercise', type: 'text'};
}
module.exports.updateScore = async function (userId, chatId, exercise, reps = 0, weight = 0) {
    //if (updateData.exercise) database.update
    let existing = await database.getScore(userId, chatId, exercise);
    
    if (existing) {
        await database.updateScore(existing.ID, userId, chatId, exercise, reps, weight);
        return {status: 1};
    }

    await database.insertScore(userId, chatId, exercise, reps, weight);
    return {status: 1};
}