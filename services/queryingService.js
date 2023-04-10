/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const database = require('./../database/database');
const logger = require('./../logger');


module.exports.loadWaitingQueries = async function (userId, chatId) {
    return await database.getWaitingQueries(userId, chatId);
}
module.exports.addWaitingQuery = async function (userId, chatId, type, exercise = "", reps = 0, weight = 0, userHeight = 0, userWeight = 0) {    
    return await database.putWaitingQuery(userId, chatId, type, exercise, reps, weight, userHeight, userWeight);
}
module.exports.deleteQueries = async function(queries) {
    for (let i = 0; i < queries.length; i += 1) {
        logger.debug(`About to delete ${i}`);
        await database.deleteWaitingQuery(queries[i].USERID, queries[i].ID);
        logger.debug(`DELETION DONE`);
    }

    return {status: 1};
}