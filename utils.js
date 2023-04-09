/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const INTERNAL_STEPS = {
    QUERYING_SCORETYPES: 'scoretypes',
    QUERYING_REPS: 'reps',
    QUERYING_WEIGHT: 'weight',
    READY_TO_SAVE: 'readytosave'
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
