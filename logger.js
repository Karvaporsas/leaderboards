/*jslint node: true */
/*jshint esversion: 6 */
'use strict';

const DEBUG_MODE = process.env.DEBUG_MODE === 'ON';

module.exports.debug = function (item) {
    if (DEBUG_MODE) console.log(item);
}
module.exports.fatal = function (item) {
    console.log("FATAL");
    console.error(item);
}
module.exports.error = function (item) {
    console.error(item);
}