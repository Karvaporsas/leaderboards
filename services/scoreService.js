/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const helper = require('./../helper');
const database = require('./../database/database');
const _ = require('lodash');

const combined = 'Combined score';
const supportedTypes = ["Bench press", "Deadlift", "Squat"];
/*const coeffs = {
    a: -216.0475144,
    b: 16.2606339,
    c: -0.002388645,
    d: -0.00113732, 
    e: 7.01863 * Math.pow(10, -6),
    f: -1.291 * Math.pow(10,-8)
}*/

const coeffs = {
    a: 47.46178854,
    b: 8.472061379,
    c: 0.07369410346,
    d: -0.001395833811, 
    e: 7.07665973070743 * Math.pow(10, -6),
    f: -1.20804336482315 * Math.pow(10,-8)
}

function wilksCoeff (weight) {
    return 600 / (coeffs.a + (coeffs.b * weight) + (coeffs.c * Math.pow(weight, 2)) + (coeffs.d * Math.pow(weight, 3)) + (coeffs.e * Math.pow(weight, 4)) + (coeffs.f * Math.pow(weight, 5)));
}

function brzycki1RM (weight, reps) {
    return weight / (1.0278 - (0.0278 * reps));
}

module.exports.askScoreType = async function (userId, chatId, messageId) {
    return {status: 1, keyboard: helper.getButtonData(supportedTypes, 'scoretypes', [userId, chatId]), message: 'Which exercise score would you like to record?', type: 'text', hideKeyboard: true, messageId: messageId};
}
module.exports.askLeaderboardType = async function (userId, chatId, messageId) {

    return {status: 1, keyboard: helper.getButtonData(_.concat(supportedTypes, combined), 'leaderboards', [userId, chatId]), message: 'Which leaderboard would you like to see?', type: 'text', hideKeyboard: true, messageId: messageId};
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

module.exports.updateScore = async function (userId, chatId, exercise, reps = 0, weight = 0, username = "") {
    //if (updateData.exercise) database.update
    console.log(`About to update ${userId}, ${chatId}, ${exercise}, ${reps}, ${weight} for ${username}`);
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

module.exports.getLeaderboards = async function (chatId, exercise) {
    let isAggregated = exercise === combined;
    console.log('Getting scores');
    let searchExercise = isAggregated ? '' : exercise;
    let rawScores = await database.getRelevantScores(chatId, searchExercise);
    console.log(rawScores);
    console.log('Getting users');
    let usersByLatestChat = await database.getUsersInChat(chatId);
    console.log(usersByLatestChat);
    
    /*let scoreUsers = [];
    let scoreUserHash = {};
    _.forEach(rawScores, (rs) => {
        if (!scoreUserHash[rs.USERID]) {
            scoreUserHash[rs.USERID] = true;
            scoreUsers.push(rs.USERID);
        }
    });*/
    
    let grouped = _.groupBy(rawScores, (rs) => {
        return rs.USERID;
    });
    console.log(grouped);
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
    })
    console.log(scores);
    _.forEach(scores, (s) => {
        s.rawScoreDisplay = `${s.WEIGHT} (${s.REPS})`;
        let user = _.find(usersByLatestChat, ['USERID', s.USERID]);
        
        if (!user) {
            user = database.getUser(s.USERID);
        }
        if (user && user.WEIGHT > 0) {
            console.log(s.hasEstimations);
            console.log(s.estimated1RM * wilksCoeff(user.WEIGHT));
            console.log(s.totalWeight * wilksCoeff(user.WEIGHT));
            s.wilks500 = _.round((s.hasEstimations ? s.estimated1RM : s.totalWeight) * wilksCoeff(user.WEIGHT), 2);
        }
        s.estimated1RM = _.round(s.estimated1RM, 1);
    });

    let sortedScores = _.orderBy(scores, ['WEIGHT', 'REPS'], ['desc', 'desc']);
    let rawScoreCols = [
        {colProperty: 'USERNAME', headerName: 'Name'}        
    ];

    if (isAggregated) {
        rawScoreCols.push({colProperty: 'estimated1RM', headerName: 'kg est tot'})
    } else {
        rawScoreCols.push({colProperty: 'rawScoreDisplay', headerName: 'kg (reps)'});
        rawScoreCols.push({colProperty: 'estimated1RM', headerName: '1RM est'});
    }
    

    let wilksSortedScores = _.orderBy(scores, ['wilks500'], ['desc']);
    let wilksScoreCols = [
        {colProperty: 'USERNAME', headerName: 'Name'},        
        {colProperty: 'wilks500', headerName: 'Score'}
    ];
    let raws = helper.formatListMessage(exercise, '', sortedScores, rawScoreCols);
    let wilks = helper.formatListMessage('', 'Wilks coefficent', wilksSortedScores, wilksScoreCols);

    return {status: 1, type: 'text', message: `${raws}${wilks}`};
}