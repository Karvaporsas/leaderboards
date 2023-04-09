/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const helper = require('./../helper');
const database = require('./../database/database');


module.exports.loadWaitingQueries = async function (userId, chatId) {
    return await database.getWaitingQueries(userId, chatId);
}
module.exports.addWaitingQuery = async function (userId, chatId, type, exercise = "", reps = 0, weight = 0) {
    console.log(`Adding waiting query ${userId}, ${chatId}, ${type}, ${exercise}, ${reps}, ${weight}`);
    return await database.putWaitingQuery(userId, chatId, type, exercise, reps, weight);
}
module.exports.deleteQueries = async function(queries) {
    for (let i = 0; i < queries.length; i += 1) {
        console.log(`About to delete ${i}`);
        await database.deleteWaitingQuery(queries[i].USERID, queries[i].ID);
        console.log(`DELETION DONE`);
    }

    return {status: 1};
}