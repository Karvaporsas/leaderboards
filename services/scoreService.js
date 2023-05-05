/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const helper = require('./../helper');
const database = require('./../database/database');
const userService = require('./userService');
const _ = require('lodash');
const logger = require('./../logger');

const WILKS_NEW = process.env.WILKS_NEW === 'ON';

const combined = 'Combined score';
const theBig3 = 'The Big 3';
const theBig5 = 'The Big 5';
const bodyweightGroup = 'Bodyweight';
const supportedTypes = ["Bench press", "Deadlift", "Squat", "Overhead press", "Curl", "Dip", "Pull up"];
const _groups = [
    {name: theBig3, members: [supportedTypes[0], supportedTypes[1], supportedTypes[2]]},
    {name: theBig5, members: [supportedTypes[0], supportedTypes[1], supportedTypes[2], supportedTypes[3], supportedTypes[4]]},
    {name: bodyweightGroup, members: [supportedTypes[5], supportedTypes[6]]}
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

function isBodyWeightExercise(exercise) {
    let bwg = _.find(_groups, ['name', bodyweightGroup]);
    return _.includes(bwg.members, exercise);
}

function wilksCoeff (weight) {
    let coeffs = WILKS_NEW ? coeffsNew : coeffsOld;
    return coeffs.bigNumber / (coeffs.a + (coeffs.b * weight) + (coeffs.c * Math.pow(weight, 2)) + (coeffs.d * Math.pow(weight, 3)) + (coeffs.e * Math.pow(weight, 4)) + (coeffs.f * Math.pow(weight, 5)));
}

function brzycki1RM (weight, reps) {
    if (reps == 0) return 0;
    let divider = (1.0278 - (0.0278 * reps));
    if (divider == 0) return 0;

    return weight / divider;    
}

function bw1RM(weight, reps) {
    if (reps === 0) return 0;
    if (reps === 1) return 0;
    return  (weight*(100/(101-reps*1.75))) - weight;
}

function isFromGroup(txt) {
    let result = false;

    _.forEach(_groups, function (g) {
        if (g.name == txt) result = true;
    });

    return result;
}

module.exports.askScoreType = async function (userId, chatId, messageId) {
    return {status: 1, keyboard: helper.getButtonData(supportedTypes, 'scoretypes', [userId, chatId]), message: 'Which exercise score would you like to record?', type: 'text', hideKeyboard: true, messageId: messageId};
}
module.exports.askLeaderboardType = async function (userId, chatId, messageId) {
    return {status: 1, keyboard: helper.getButtonData(_.concat(supportedTypes, theBig3, theBig5, bodyweightGroup), 'leaderboards', [userId, chatId]), message: 'Which leaderboard would you like to see?', type: 'text', hideKeyboard: true, messageId: messageId};
}
module.exports.askRepCount = async function (exercise = "") {
    exercise = exercise.toLowerCase();
    return {status: 1, message: `Give rep count for ${exercise}`, type: 'text', removeKeyboard: true};
}
module.exports.askWeight = async function (exercise = "") {
    let isBW = isBodyWeightExercise(exercise);
    exercise = exercise.toLowerCase();
    let msg = isBW ? `Give excess weight or weight assistance for ${exercise}. Otherwise, give 0. \n\nFor example, if you had an extra weight of 10 kg, type 10, and if you had assistance, type -10 for 10kg worth of assistance.` : `Give weight for ${exercise}`
    return {status: 1, message: msg, type: 'text'};
}
module.exports.informUser = async function (exercise, reps, weight) {    
    let isBW = isBodyWeightExercise(exercise);
    let msg = isBW ? `Recording ${exercise} with ${reps} reps and ${weight} kg of extra weight.` : `Recording ${exercise} with ${reps} reps and ${weight} kg of weight.`;
    return {status: 1, message: msg, type: 'text'};
}

module.exports.updateScore = async function (userId, chatId, exercise, reps = 0, weight = 0, username = "") {
    logger.debug(`About to update ${userId}, ${chatId}, ${exercise}, ${reps}, ${weight} for ${username}`);
    let existing = await database.getScore(userId, chatId, exercise);
    await userService.addUserChat(userId, chatId);

    let userInfo = await userService.getUserInfo(userId) || {};

    if (existing && existing.length) {
        await database.updateScore(existing[0].ID, userId, chatId, exercise, reps, weight, username, userInfo.WEIGHT || 0);
        return {status: 1};
    }

    await database.insertScore(userId, chatId, exercise, reps, weight, username, userInfo.WEIGHT || 0);
    return {status: 1};
}

module.exports.isSupportedScoreType = function (txt) {
    for (var i = 0; i < supportedTypes.length; i += 1) {        
        if (supportedTypes[i] == txt) return true;
    }

    return false;
}

module.exports.isSupportedLeaderboardType = function (txt) {
    if (isFromGroup(txt)) return true;

    return this.isSupportedScoreType(txt);
}

module.exports.getLeaderboards = async function (chatId, exercise, messageId) {
    let isBWorBWGroup = isBodyWeightExercise(exercise) || exercise === bodyweightGroup;    
    let isAggregated = isFromGroup(exercise);
    let searchExercise = isAggregated ? '' : exercise;
    let rawScores = await database.getRelevantScores(searchExercise);
    
    if (isFromGroup(exercise)) {
        let group = _.find(_groups, ['name', exercise]);
        rawScores = _.filter(rawScores, function (rs) {
            return _.find(group.members, (m) => {
                return m === rs.EXERCISE;
            });
        });
    }

    let usersByChat = await database.getUsersInThisChat(chatId);
    rawScores = _.filter(rawScores, function (rs) {
        return _.find(usersByChat, ['USERID', rs.USERID]);
    });

    logger.debug(`rawScores: ${JSON.stringify(rawScores)}`);
    
    let grouped = _.groupBy(rawScores, (rs) => {
        return rs.USERID;
    });
    logger.debug(`grouped: ${JSON.stringify(grouped)}`);
    let scores = [];
    _.forEach(grouped, function (preScores, key) {        
        let total1RMestimation = 0;
        let totalWeight = 0;
        let excessWeight = 0;
        let hasEstimations = false;
        let isBodyWeightScore = false;
        let divider = 0;
        let totalUserWeight = 0;
        _.forEach(preScores, (ps) => {
            let isBW = isBodyWeightExercise(ps.EXERCISE);
            let effectiveWeight = isBW ? ps.USERWEIGHT + ps.WEIGHT : ps.WEIGHT;
            if (isBW) {
                total1RMestimation += (ps.REPS > 1 ? bw1RM(effectiveWeight, ps.REPS) : effectiveWeight) + ps.WEIGHT;// - ps.USERWEIGHT;
                logger.debug('total1RMestimation: ' + total1RMestimation);
            } else {
                total1RMestimation += ps.REPS > 1 ? brzycki1RM(effectiveWeight, ps.REPS) : effectiveWeight;
            }            
            
            totalWeight += effectiveWeight;
            excessWeight += ps.WEIGHT;
            totalUserWeight += ps.USERWEIGHT;
            if (ps.REPS > 1) hasEstimations = true;
            if (isBW) isBodyWeightScore = true;
            divider++;
        });
        if (divider === 0) divider = 1;
        
        scores.push({
            USERID: key,
            USERNAME: preScores[0].USERNAME,
            estimated1RM: total1RMestimation,
            REPS: preScores[0].REPS,
            WEIGHT: preScores[0].WEIGHT,
            totalWeight: totalWeight,
            hasEstimations: hasEstimations,
            USERWEIGHT: _.round(totalUserWeight / divider, 1),
            isBodyWeightScore: isBodyWeightScore,
            excessWeight: excessWeight,
        });
    });    
    
    for (let i = 0; i < scores.length; i+= 1) {
        let s = scores[i];
        let displayExtraWeightText = s.WEIGHT < 0 ? `${s.excessWeight}kg` : `+${s.excessWeight}kg`;
        s.rawBWScoreDisplay = `${s.USERWEIGHT}${displayExtraWeightText}`;
        s.wilksUsed = 0;
        let user = _.find(usersByChat, ['USERID', s.USERID]);

        if (!user) {
            continue;
        }
        let userWeightToUse = s.USERWEIGHT ? s.USERWEIGHT : user.WEIGHT;
        if (userWeightToUse) {
            let estimationToUse = s.estimated1RM;
            if (s.isBodyWeightScore) {
                estimationToUse += s.USERWEIGHT;
            }
            s.wilksUsed = _.round((s.hasEstimations ? estimationToUse : s.totalWeight) * wilksCoeff(userWeightToUse), 2);    
        }        

        s.estimated1RM = _.round(s.estimated1RM, 1);
        let displayExtraWeightTextOn1RMEstimate = s.estimated1RM < 0 ? `${s.estimated1RM}kg` : `+${s.estimated1RM}kg`;
        s.rawBW1RMEstimateDisplay = `${s.USERWEIGHT}${displayExtraWeightTextOn1RMEstimate}`;
    }

    let sortedScores = _.orderBy(scores, [(isAggregated ? 'totalWeight' : 'WEIGHT'), 'REPS'], ['desc', 'desc']);
    let rawScoreCols = [
        {colProperty: 'USERNAME', headerName: 'Name'}        
    ];

    if (isAggregated) {
        if (isBWorBWGroup) {
            rawScoreCols.push({colProperty: 'rawBW1RMEstimateDisplay', headerName: 'kg est tot'});
        } else {
            rawScoreCols.push({colProperty: 'estimated1RM', headerName: 'kg est tot'});
        }
    } else {
        if (isBWorBWGroup) {
            rawScoreCols.push({colProperty: 'rawBWScoreDisplay', headerName: 'kg'});
            rawScoreCols.push({colProperty: 'REPS', headerName: 'reps'});
            rawScoreCols.push({colProperty: 'rawBW1RMEstimateDisplay', headerName: '1RM*'});
        } else {
            rawScoreCols.push({colProperty: 'WEIGHT', headerName: 'kg'});
            rawScoreCols.push({colProperty: 'REPS', headerName: 'reps'});
            rawScoreCols.push({colProperty: 'estimated1RM', headerName: '1RM*'});
        }
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