'use strict'; 
const ip = require('request-ip');
const moment = require('moment');
const util = require('util');
const Log4js = require('log4js')

const accesslog = module.exports = log_category => {
    const logger = Log4js.getLogger(log_category);
    const DEFAULT = "%s %s -- %s %s HTTP/%s, %s %s";
    return (ctx, next) => {
        next().then(() => {
            const req = ctx.request, header = req.header, nodeReq = ctx.req;
            const remoteAddr = ip.getClientIp(nodeReq);
            const str = util.format(DEFAULT,
                moment().format("YYYY/MM/DD HH:mm:ss"),
                remoteAddr,
                req.method,
                req.url,
                nodeReq.httpVersion,
                req.length || null,
                header['user-agent']);
            logger.debug(str);
        });
    }
}

