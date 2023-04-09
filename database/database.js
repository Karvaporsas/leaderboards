/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const AWS = require('aws-sdk');
const WAITING_QUERIES = process.env.TABLE_WAITING_QUERIES;
const USER_SCORE_LATEST = process.env.TABLE_USER_SCORE_LATEST;
const uuid = require('uuid');
const _ = require('lodash');
const dynamoDb = new AWS.DynamoDB.DocumentClient();



/**
 * Routes database calls to proper handlers and initializes db.
 */
module.exports.getWaitingQueries = async function(userId, chatId) {
    let params = {
        TableName: WAITING_QUERIES,
        ExpressionAttributeValues: {
            ":userid": "" + userId
        },
        ExpressionAttributeNames: {
            "#USERID": "USERID"
        },
        KeyConditionExpression: '#USERID = :userid',
        ProjectionExpression: 'USERID, CHATID, QUERYTYPE, EXERCISE, REPS, WEIGHT, ID'
    };

    console.log(`Getting waiting queries for ${userId} and ${chatId}`);

    let result = await dynamoDb.query(params).promise();    

    result = result.Items || [];

    return _.filter(result, ['CHATID', chatId]);
}

module.exports.putWaitingQuery = async function (userId, chatId, type, exercise, reps, weight) {
    let params = {
        TableName: WAITING_QUERIES,
        Item: {
            USERID: "" + userId,
            CHATID: chatId,
            QUERYTYPE: type,
            EXERCISE: exercise,
            REPS: reps,
            WEIGHT: weight,
            ID: uuid.v4()
        }
    };

    console.log("About to insert a query");
    try {
        await dynamoDb.put(params).promise();
        return {status: 1};
    } catch (e){
        console.log('Inserting query failed');
        console.log(e);
        return {status: -1, message: 'Insert failed'};
    }    
}

module.exports.deleteWaitingQuery = async function (userId, id) {
    let params = {
        TableName: WAITING_QUERIES,
        Key: {
            USERID: "" + userId,
            ID: id
        }
    };
    console.log(`deleting ${userId} and ${id}`);
    try {
        await dynamoDb.delete(params, () => {}).promise();
        console.log("Deletion done");
        return {status: 1};
    } catch (e){
        console.log("ASSHOLE");
        console.log(e);
        return {status: -1, message: 'Error deleting query'};
    }
}

module.exports.insertScore = async function (userId, chatId, exercise, reps, weight) {
    let params = {
        TableName: USER_SCORE_LATEST,
        Item: {
            USERID: "" + userId,
            CHATID: chatId,
            EXERCISE: exercise,
            REPS: reps,
            WEIGHT: weight,
            ID: uuid.v4()            
        }
    }

    try {        
        console.log('Inserting new score');
        await dynamoDb.put(params).promise();
        console.log('Done');
        return {status: 1};
    } catch (e) {
        console.log('Stupd ass mofo');
        console.log(e);
        return {status: -1, message: 'Score insert failed'};
    }    
}

module.exports.updateScore = async function (id, userId, chatId, exercise, reps, weight) {
    let params = {
        TableName: USER_SCORE_LATEST,
        Key: {
            "USERID": "" + userId,
            "ID": id
        },
        UpdateExpression: 'set #exercise = :exercise, #reps = :reps, #weight = :weight',
        ExpressionAttributeNames: {
            '#exercise': 'EXERCISE',
            '#reps': 'REPS',
            '#weight': 'WEIGHT'
        },
        ExpressionAttributeValues: {
            ':exercise': exercise,
            ':reps': reps,
            ':weight': weight
        }
    };
    console.log(`updating score ${id} of ${userId}`);
    try {
        await dynamoDb.update(params).promise();
        return {status: 1};
    } catch (e) {
        console.log('Update failed bad');
        console.log(e);
        return {status: -1};
    }    
}

module.exports.getScore = async function (userId, chatId, exercise) {
    let params = {
        TableName: USER_SCORE_LATEST,        
        ExpressionAttributeValues: {
            ':userid': "" + userId
        },
        ExpressionAttributeNames: {
            '#USERID': 'USERID'
        },
        KeyConditionExpression: '#USERID = :userid',
        ProjectionExpression: 'ID, USERID, CHATID, EXERCISE, REPS, WEIGHT'
    };   

    try {
        console.log(`Querying scores`);
        console.log(params);
        let result = await dynamoDb.query(params).promise();    
        result = result.Items || [];
        console.log('Got scores');
        console.log(result);

        return _.filter(result, function (s) {
            return s.CHATID === chatId && s.EXERCISE === exercise;
        });
    } catch (e) {
        console.log("oh noes");
        console.log(e);
        return false;
    }
}