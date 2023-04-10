/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const AWS = require('aws-sdk');
const utils = require('./../utils');
const WAITING_QUERIES = process.env.TABLE_WAITING_QUERIES;
const USER_SCORE_LATEST = process.env.TABLE_USER_SCORE_LATEST;
const USER = process.env.TABLE_USER;
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
        ProjectionExpression: 'USERID, CHATID, QUERYTYPE, EXERCISE, REPS, WEIGHT, ID, USERHEIGHT, USERWEIGHT'
    };

    console.log(`Getting waiting queries for ${userId} and ${chatId}`);

    let result = await dynamoDb.query(params).promise();    

    result = result.Items || [];

    return _.filter(result, ['CHATID', chatId]);
}

module.exports.getRelevantScores = async function (chatId, exercise = "") {
    let filterExpression = exercise ? '#CHATID = :chatId and #EXERCISE = :exercise' : '#CHATID = :chatId';
    let params = {
        TableName: USER_SCORE_LATEST,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: {
            '#CHATID': 'CHATID'
        },
        ExpressionAttributeValues: {
            ':chatId': chatId
        },
        ProjectionExpression: 'USERID, CHATID, EXERCISE, REPS, WEIGHT, USERNAME, ID'
    };

    if (exercise) {
        params.ExpressionAttributeNames['#EXERCISE'] = 'EXERCISE';
        params.ExpressionAttributeValues[':exercise'] = exercise;
    }

    return await utils.performScan(dynamoDb, params).then((result) => {
        result = result || [];

        return _.filter(result, function (r) {
            return r.REPS > 0;
        });
    });
}

module.exports.putWaitingQuery = async function (userId, chatId, type, exercise, reps, weight, userHeight, userWeight) {
    let params = {
        TableName: WAITING_QUERIES,
        Item: {
            USERID: "" + userId,
            CHATID: chatId,
            QUERYTYPE: type,
            EXERCISE: exercise,
            REPS: reps,
            WEIGHT: weight,
            USERHEIGHT: userHeight,
            USERWEIGHT: userWeight,
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

module.exports.insertScore = async function (userId, chatId, exercise, reps, weight, username) {
    let params = {
        TableName: USER_SCORE_LATEST,
        Item: {
            USERID: "" + userId,
            CHATID: chatId,
            EXERCISE: exercise,
            REPS: reps,
            WEIGHT: weight,
            USERNAME: username,
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

module.exports.insertUser = async function (userId, chatId, weight, height) {
    let params = {
        TableName: USER,
        Item: {
            USERID: "" + userId,
            WEIGHT: weight,
            CHATID: chatId,
            HEIGHT: height         
        }
    }

    try {        
        console.log('Inserting new user');
        await dynamoDb.put(params).promise();
        console.log('Done');
        return {status: 1};
    } catch (e) {
        console.log('Stupd ass mofo');
        console.log(e);
        return {status: -1, message: 'User insert failed'};
    }
}

module.exports.updateScore = async function (id, userId, chatId, exercise, reps, weight, username) {
    let params = {
        TableName: USER_SCORE_LATEST,
        Key: {
            "USERID": "" + userId,
            "ID": id
        },
        UpdateExpression: 'set #exercise = :exercise, #reps = :reps, #weight = :weight, #username = :username',
        ExpressionAttributeNames: {
            '#exercise': 'EXERCISE',
            '#reps': 'REPS',
            '#weight': 'WEIGHT',
            '#username': 'USERNAME'
        },
        ExpressionAttributeValues: {
            ':exercise': exercise,
            ':reps': reps,
            ':weight': weight,
            ':username': username
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

module.exports.updateUser = async function (userId, chatId, weight, height) {
    let params = {
        TableName: USER,
        Key: {
            "USERID": "" + userId            
        },
        UpdateExpression: 'set  #weight = :weight, #height = :height, #chatId = :chatId',
        ExpressionAttributeNames: {
            '#weight': 'WEIGHT',
            '#height': 'HEIGHT',
            '#chatId': 'CHATID'
        },
        ExpressionAttributeValues: {
            ':weight': weight,
            ':height': height,
            ':chatId': chatId
        }
    };

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

module.exports.getUser = async function (userId) {
    let params = {
        TableName: USER,
        Key: {
            USERID: "" + userId
        },
        ProjectionExpression: 'USERID, WEIGHT, HEIGHT, CHATID'
    };
    
    try {
        console.log(`Getting user ${userId}`);
        let result = await dynamoDb.get(params).promise();    
        console.log(result);
        result = result.Item;
        console.log('Got user');        

        return result;
    } catch (e) {
        console.log("oh noes");
        console.log(e);
        return false;
    }
}

module.exports.getUsersInChat = async function (chatId) {
    let params = {
        TableName: USER,
        FilterExpression: '#CHATID = :chatId',
        ExpressionAttributeNames: {
            '#CHATID': 'CHATID'            
        },
        ExpressionAttributeValues: {
            ':chatId': chatId
        },
        ProjectionExpression: 'USERID, WEIGHT, HEIGHT, CHATID'
    };

    return await utils.performScan(dynamoDb, params).then((result) => {
        result = result || [];

        return result;
    });
}