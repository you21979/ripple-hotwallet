'use strict'
const Log4js = require('log4js');
const main = require('./libs/main');

(dirname => {
    Log4js.configure(dirname + '/config/log.json');
    process.on('uncaughtException', err => {
        console.log(err.stack);
        throw err;
    })
    return main(dirname);
})(__dirname)

