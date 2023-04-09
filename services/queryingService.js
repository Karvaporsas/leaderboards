/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const helper = require('./../helper');
const database = require('./../database/database');


module.exports.loadWaitingQueries = async function (userId, chatId) {
    return await database.getWaitingQueries(userId, chatId);
}
module.exports.addWaitingQuery = async function (userId, chatId, type, exercise = "", reps = 0, weight = 0) {
    return await database.putWaitingQuery(userId, chatId, type, exercise, reps, weight);
}
module.exports.deleteQueries = async function(queries) {
    let queriesToDelete = await database.getWaitingQueries(userId, chatId);

    for (let i = 0; i < queriesToDelete.length; i += 1) {
        await database.deleteWaitingQuery(userId, queriesToDelete[i].ID);
    }

    return {status: 1};
}