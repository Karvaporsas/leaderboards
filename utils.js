/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const INTERNAL_STEPS = {
    QUERYING_SCORETYPES: 'scoretypes',
    QUERYING_REPS: 'reps',
    QUERYING_WEIGHT: 'weight',
    READY_TO_SAVE: 'readytosave',
    QUERYING_USER_WEIGHT: 'userweight',
    QUERYING_USER_HEIGHT: 'userheight',
    READY_TO_SAVE_USER_INFO: 'readytosaveuser',
    QUERYING_SCORETYPE_FOR_LEADERBOARD: 'scoretypesforleaderboards'
}

/**
 * Utils
 */
module.exports.getStandardRepsonse = function (message = "") {
    return {status: 1, message: message}
}

module.exports.getInternalSteps = function () {
    return INTERNAL_STEPS;
}

    /**
     * Performs scan for database. Results are sent to resolve function
     *
     * @param {Object} dynamoDb db object
     * @param {Object} params of
     * @param {Promise.resolve} resolve called on success
     * @param {Promise.reject} reject called on failure
     */
module.exports.performScan = async function(dynamoDb, params) {
    return new Promise((resolve, reject) => {
        function chatScan(err, data) {
            if (err) {
                console.log("error while scanning");
                console.log(err);
                reject(err);
            } else if (!data) {
                console.log("no data, no error");
                resolve(allResults);
            }
            allResults = allResults.concat(data.Items);

            // continue scanning if we have more, because
            // scan can retrieve a maximum of 1MB of data
            if (typeof data.LastEvaluatedKey != "undefined") {
                console.log("Scanning for more...");
                params.ExclusiveStartKey = data.LastEvaluatedKey;
                dynamoDb.scan(params, chatScan);
            } else {
                resolve(allResults);
            }
        }

        var allResults = [];

        dynamoDb.scan(params, chatScan);
    });    
}