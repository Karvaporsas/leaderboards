/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const helper = require('./../helper');
const database = require('./../database/database');
const { chat } = require('../talker');

const supportedTypes = ["Bench press"];

module.exports.askScoreType = async function (userId, chatId, messageId) {
    return {status: 1, keyboard: helper.getButtonData(supportedTypes, 'scoretypes', [userId, chatId]), message: 'Which exercise score would you like to record?', type: 'text', hideKeyboard: true, messageId: messageId};
}
module.exports.askRepCount = async function (exercise = "") {    
    exercise = exercise.toLowerCase();
    return {status: 1, message: `Give rep count for ${exercise}`, type: 'text'};
}
module.exports.askWeight = async function (exercise = "") {
    exercise = exercise.toLowerCase();
    return {status: 1, message: `Give weight for ${exercise}`, type: 'text'};
}

module.exports.informUser = async function (exercise, reps, weight) {
    return {status: 1, message: `Saved ${exercise} with ${reps} reps of ${weight} kg!`, type: 'text'};
}

module.exports.updateScore = async function (userId, chatId, exercise, reps = 0, weight = 0) {
    //if (updateData.exercise) database.update
    console.log(`About to update ${userId}, ${chatId}, ${exercise}, ${reps}, ${weight}`);
    let existing = await database.getScore(userId, chatId, exercise);

    if (existing && existing.length) {
        await database.updateScore(existing[0].ID, userId, chatId, exercise, reps, weight);
        return {status: 1};
    }

    await database.insertScore(userId, chatId, exercise, reps, weight);
    return {status: 1};
}

module.exports.isSupportedScoreType = function (txt) {
    for (var i = 0; i < supportedTypes.length; i += 1) {        
        if (supportedTypes[i] == txt) return true;
    }

    return false;
}