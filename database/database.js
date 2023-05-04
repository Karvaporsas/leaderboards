/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const AWS = require('aws-sdk');
const utils = require('./../utils');
const logger = require('./../logger');
const WAITING_QUERIES = process.env.TABLE_WAITING_QUERIES;
const USER_SCORE_LATEST = process.env.TABLE_USER_SCORE_LATEST;
const USER = process.env.TABLE_USER;
const USER_CHATS = process.env.TABLE_USER_CHATS;
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

    logger.debug(`Getting waiting queries for ${userId} and ${chatId}`);

    let result = await dynamoDb.query(params).promise();    

    result = result.Items || [];

    return result;
}

module.exports.getRelevantScores = async function (exercise = "") {
    let filterExpression = exercise ? '#EXERCISE = :exercise AND #REPS > :reps' : '#REPS > :reps';
    let params = {
        TableName: USER_SCORE_LATEST,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: {
            '#REPS': 'REPS'
        },
        ExpressionAttributeValues: {
            ':reps': 0
        },
        ProjectionExpression: 'USERID, CHATID, EXERCISE, REPS, WEIGHT, USERNAME, ID, USERWEIGHT'
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

    logger.debug("About to insert a query");
    try {
        await dynamoDb.put(params).promise();
        return {status: 1};
    } catch (e){
        logger.debug('Inserting query failed');
        logger.debug(e);
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
    logger.debug(`deleting ${userId} and ${id}`);
    try {
        await dynamoDb.delete(params, () => {}).promise();
        logger.debug("Deletion done");
        return {status: 1};
    } catch (e){
        logger.debug("ASSHOLE");
        logger.debug(e);
        return {status: -1, message: 'Error deleting query'};
    }
}

module.exports.insertScore = async function (userId, chatId, exercise, reps, weight, username, userWeight) {
    let params = {
        TableName: USER_SCORE_LATEST,
        Item: {
            USERID: "" + userId,
            CHATID: chatId,
            EXERCISE: exercise,
            REPS: reps,
            WEIGHT: weight,
            USERNAME: username,
            USERWEIGHT: userWeight,
            ID: uuid.v4()
        }
    }

    try {                
        await dynamoDb.put(params).promise();        
        return {status: 1};
    } catch (e) {
        logger.debug('Stupd ass mofo');
        logger.debug(e);
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
        await dynamoDb.put(params).promise();        
        return {status: 1};
    } catch (e) {
        logger.debug('Stupd ass mofo');
        logger.debug(e);
        return {status: -1, message: 'User insert failed'};
    }
}

module.exports.updateScore = async function (id, userId, chatId, exercise, reps, weight, username, userWeight) {
    let params = {
        TableName: USER_SCORE_LATEST,
        Key: {
            "USERID": "" + userId,
            "ID": id
        },
        UpdateExpression: 'set #exercise = :exercise, #reps = :reps, #weight = :weight, #username = :username, #userweight = :userweight',
        ExpressionAttributeNames: {
            '#exercise': 'EXERCISE',
            '#reps': 'REPS',
            '#weight': 'WEIGHT',
            '#username': 'USERNAME',
            '#userweight': 'USERWEIGHT'
        },
        ExpressionAttributeValues: {
            ':exercise': exercise,
            ':reps': reps,
            ':weight': weight,
            ':username': username,
            ':userweight': userWeight
        }
    };
    logger.debug(`updating score ${id} of ${userId}`);
    try {
        await dynamoDb.update(params).promise();
        return {status: 1};
    } catch (e) {
        logger.debug('Update failed bad');
        logger.debug(e);
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
        logger.debug('Update failed bad');
        logger.debug(e);
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
        ProjectionExpression: 'ID, USERID, CHATID, EXERCISE, REPS, WEIGHT, USERWEIGHT'
    };   

    try {
        logger.debug(`Querying scores`);
        logger.debug(params);
        let result = await dynamoDb.query(params).promise();    
        result = result.Items || [];
        logger.debug('Got scores');
        logger.debug(result);

        return _.filter(result, function (s) {
            return s.EXERCISE === exercise;
        });
    } catch (e) {
        logger.debug("oh noes");
        logger.debug(e);
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
        let result = await dynamoDb.get(params).promise();            
        result = result.Item;        

        return result;
    } catch (e) {
        logger.debug("oh noes");
        logger.debug(e);
        return false;
    }
}

module.exports.getUsersInThisChat = async function (chatId) {    
    let params = {
        TableName: USER_CHATS,
        FilterExpression: '#CHATID = :chatId',
        ExpressionAttributeNames: {
            '#CHATID': 'CHATID'
        },
        ExpressionAttributeValues: {
            ':chatId': "" + chatId
        },
        ProjectionExpression: 'USERID, CHATID'
    };
    logger.debug(`Getting user from chat ${chatId}`);

    try {
        var usrs = [];
        
        await utils.performScan(dynamoDb, params).then((result) => {
            usrs = result || [];       
        });

        let wholeUsers = [];
        for (let i = 0; i < usrs.length; i++) {
            let r = usrs[i];
            let usr = await this.getUser(r.USERID);
            if (usr) wholeUsers.push(usr);
        }

        logger.debug(wholeUsers);

        return wholeUsers;
                                
    } catch (e) {
        logger.debug("oh noes");
        logger.error(e);
        return false;
    }
}

module.exports.getUserChat = async function (userId, chatId) {
    let params = {
        TableName: USER_CHATS,
        Key: {
            USERID: "" + userId,
            CHATID: "" + chatId
        },
        ProjectionExpression: 'USERID, CHATID'
    };

    try {
        let result = await dynamoDb.get(params).promise();
        result = result.Item;

        return result;
    } catch (e) {
        logger.debug("FFFF");
        logger.error(e);

        return false;
    }
}

module.exports.insertUserChat = async function (userid, chatId) {
    let params = {
        TableName: USER_CHATS,
        Item: {
            USERID: "" + userid,
            CHATID: "" + chatId
        }
    };

    try {        
        await dynamoDb.put(params).promise();        
        return {status: 1};
    } catch (e) {
        logger.debug('Why u do this to me');
        logger.debug(e);
        return {status: -1, message: 'User insert failed'};
    }
}