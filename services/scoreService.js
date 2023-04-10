/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const helper = require('./../helper');
const database = require('./../database/database');
const _ = require('lodash');
const logger = require('./../logger');

const WILKS_NEW = process.env.WILKS_NEW === 'ON';

const combined = 'Combined score';
const theBig3 = 'The Big 3';
const theBig5 = 'The Big 5';
const supportedTypes = ["Bench press", "Deadlift", "Squat", "Overhead press", "Curl"/*, "Chin up", "Pull up", "Push up"*/];
const groups = [
    {name: theBig3, members: [supportedTypes[0], supportedTypes[1], supportedTypes[2]]},
    {name: theBig5, members: [supportedTypes[0], supportedTypes[1], supportedTypes[2], supportedTypes[3], supportedTypes[4]]},
    /*{name: "Bodyweight", members: [supportedTypes[5], supportedTypes[6], supportedTypes[7]]}*/
]
const coeffsOld = {
    a: -216.0475144,
    b: 16.2606339,
    c: -0.002388645,
    d: -0.00113732, 
    e: 7.01863 * Math.pow(10, -6),
    f: -1.291 * Math.pow(10,-8),
    bigNumber: 500
}

const coeffsNew = {
    a: 47.46178854,
    b: 8.472061379,
    c: 0.07369410346,
    d: -0.001395833811, 
    e: 7.07665973070743 * Math.pow(10, -6),
    f: -1.20804336482315 * Math.pow(10,-8),
    bigNumber: 600
}

function wilksCoeff (weight) {
    let coeffs = WILKS_NEW ? coeffsNew : coeffsOld;
    return coeffs.bigNumber / (coeffs.a + (coeffs.b * weight) + (coeffs.c * Math.pow(weight, 2)) + (coeffs.d * Math.pow(weight, 3)) + (coeffs.e * Math.pow(weight, 4)) + (coeffs.f * Math.pow(weight, 5)));
}

function brzycki1RM (weight, reps) {
    return weight / (1.0278 - (0.0278 * reps));
}

function isFromGroup(txt) {
    let result = false;

    _.forEach(groups, function (g) {
        if (g.name == txt) result = true;
    });

    return result;
}

module.exports.askScoreType = async function (userId, chatId, messageId) {
    return {status: 1, keyboard: helper.getButtonData(supportedTypes, 'scoretypes', [userId, chatId]), message: 'Which exercise score would you like to record?', type: 'text', hideKeyboard: true, messageId: messageId};
}
module.exports.askLeaderboardType = async function (userId, chatId, messageId) {

    return {status: 1, keyboard: helper.getButtonData(_.concat(supportedTypes, combined, theBig3, theBig5), 'leaderboards', [userId, chatId]), message: 'Which leaderboard would you like to see?', type: 'text', hideKeyboard: true, messageId: messageId};
}
module.exports.askRepCount = async function (exercise = "") {    
    exercise = exercise.toLowerCase();
    return {status: 1, message: `Give rep count for ${exercise}`, type: 'text', removeKeyboard: true};
}
module.exports.askWeight = async function (exercise = "") {
    exercise = exercise.toLowerCase();
    return {status: 1, message: `Give weight for ${exercise}`, type: 'text'};
}
module.exports.informUser = async function (exercise, reps, weight) {
    return {status: 1, message: `Saved ${exercise} with ${reps} reps of ${weight} kg!`, type: 'text'};
}

module.exports.updateScore = async function (userId, chatId, exercise, reps = 0, weight = 0, username = "") {
    logger.debug(`About to update ${userId}, ${chatId}, ${exercise}, ${reps}, ${weight} for ${username}`);
    let existing = await database.getScore(userId, chatId, exercise);

    if (existing && existing.length) {
        await database.updateScore(existing[0].ID, userId, chatId, exercise, reps, weight, username);
        return {status: 1};
    }

    await database.insertScore(userId, chatId, exercise, reps, weight, username);
    return {status: 1};
}

module.exports.isSupportedScoreType = function (txt) {
    for (var i = 0; i < supportedTypes.length; i += 1) {        
        if (supportedTypes[i] == txt) return true;
    }

    return false;
}

module.exports.isSupportedLeaderboardType = function (txt) {
    if (txt == combined) return true;    
    if (isFromGroup(txt)) return true;

    return this.isSupportedScoreType(txt);
}

module.exports.getLeaderboards = async function (chatId, exercise, messageId) {
    let isAggregated = exercise === combined || isFromGroup(exercise);
    let searchExercise = isAggregated ? '' : exercise;
    let rawScores = await database.getRelevantScores(chatId, searchExercise);
    
    if (isFromGroup(exercise)) {
        let group = _.find(groups, ['name', exercise]);
        rawScores = _.filter(rawScores, function (rs) {
            return _.find(group.members, (m) => {
                return m === rs.EXERCISE;
            });
        });
    }

    let usersByLatestChat = await database.getUsersInChat(chatId);
    
    let grouped = _.groupBy(rawScores, (rs) => {
        return rs.USERID;
    });
    
    let scores = [];
    _.forEach(grouped, function (preScores, key) {
        let total1RMestimation = 0;
        let totalWeight = 0;
        let hasEstimations = false;
        _.forEach(preScores, (ps) => {
            total1RMestimation += ps.REPS > 1 ? brzycki1RM(ps.WEIGHT, ps.REPS) : ps.WEIGHT;
            totalWeight += ps.WEIGHT;
            if (ps.REPS > 1) hasEstimations = true;
        });
         
        scores.push({
            USERID: key,
            USERNAME: preScores[0].USERNAME,
            estimated1RM: total1RMestimation,
            REPS: preScores[0].REPS,
            WEIGHT: preScores[0].WEIGHT,
            totalWeight: totalWeight,
            hasEstimations: hasEstimations
        });
    });    

    for (let i = 0; i < scores.length; i+= 1) {
        let s = scores[i];

        s.rawScoreDisplay = `${s.WEIGHT} (${s.REPS})`;
        s.wilksUsed = 0;
        let user = _.find(usersByLatestChat, ['USERID', s.USERID]);

        if (!user) {
            user = await database.getUser(s.USERID);
        }
        if (user && user.WEIGHT > 0) {
            s.wilksUsed = _.round((s.hasEstimations ? s.estimated1RM : s.totalWeight) * wilksCoeff(user.WEIGHT), 2);
        }
        s.estimated1RM = _.round(s.estimated1RM, 1);
    }

    let sortedScores = _.orderBy(scores, ['WEIGHT', 'REPS'], ['desc', 'desc']);
    let rawScoreCols = [
        {colProperty: 'USERNAME', headerName: 'Name'}        
    ];

    if (isAggregated) {
        rawScoreCols.push({colProperty: 'estimated1RM', headerName: 'kg est tot'});
    } else {
        rawScoreCols.push({colProperty: 'WEIGHT', headerName: 'kg'});
        rawScoreCols.push({colProperty: 'REPS', headerName: 'reps'});
        rawScoreCols.push({colProperty: 'estimated1RM', headerName: '1RM*'});
    }
    

    let wilksSortedScores = _.orderBy(scores, ['wilksUsed'], ['desc']);
    let wilksScoreCols = [
        {colProperty: 'USERNAME', headerName: 'Name'},        
        {colProperty: 'wilksUsed', headerName: 'Score'}
    ];
    let raws = helper.formatListMessage(exercise, '', sortedScores, rawScoreCols);
    let wilks = helper.formatListMessage('', 'Wilks coefficent', wilksSortedScores, wilksScoreCols);

    let suffix = '\n\n*If no 1RM is available, uses Brzycki\'s 1RM estimate'

    return {status: 1, type: 'text', message: `${raws}${wilks}${suffix}`, removeKeyboard: true, messageId: messageId };
}