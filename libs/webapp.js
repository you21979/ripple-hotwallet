'use strict'; 
const ripple = require('ripple-lib');
const connect = require('connect');
const connectRoute = require('connect-route');
const ip = require('request-ip');
//const accesslog = require('./middleware/accesslog');
const RippleCli = require('./ripple-cli');
const assert = require("assert")

const fs = require('fs');
const initialize = (dirname, ctx) => {
    
    const wallet = JSON.parse(fs.readFileSync(dirname + '/config/wallet.json', 'utf8'));
    ctx.cli = new RippleCli(wallet.address, wallet.secret)
    ctx.cli.connect().then( () => {
        heartbeat(ctx)
    })
}

const heartbeat = (ctx) => {
    ctx.cli.getLedger().then((r) => {
        setTimeout(() => {
            heartbeat(ctx)
        }, 1000 * 10)
    }).catch(e => {
        setTimeout(() => {
            heartbeat(ctx)
        }, 1000 * 60)    
    })
}

const commonerror = e => {
    const fmt = (r) => ({
        success : 0,
        result : {
            message : r.message
        }
    })
    return JSON.stringify(fmt(e));
}

const moment = require('moment')
const accesslog = (req) => console.log(moment().format('YYYY-MM-DD HH:mm:ss'), req.method, req.originalUrl, req.params, req.rawpost)

const healthcheck = (sv, req, res) => Promise.resolve().then( () => {
    accesslog(req)
    res.end("OK");
}).catch(e => res.end(commonerror(e) ))

const getbalance = (sv, req, res) => Promise.resolve().then( () => {
    accesslog(req)
    return sv.cli.balance().then(r => {
        const fmt = (r) => ({
            success : 1,
            result : {
                balance : r,
            }
        })
        res.end(JSON.stringify(fmt(r.reduce((r,v)=>{
            if(v.currency === "XRP"){
                r[v.currency] = v.value
            }else{
                r[v.currency + ":" + v.counterparty] = v.value
            }
            return r
        }, {XRP:0}))));
    })
}).catch(e => res.end(commonerror(e) ))

const getfee = (sv, req, res) => Promise.resolve().then( () => {
    accesslog(req)
    return sv.cli.getFee().then(r => {
        const fmt = (r) => ({
            success : 1,
            result : {
                fee : r,
            }
        })
        res.end(JSON.stringify(fmt(r)));
    })
}).catch(e => res.end(commonerror(e) ))

const getaddress = (sv, req, res) => Promise.resolve().then( () => {
    accesslog(req)
    return sv.cli.address().then(r => {
        const fmt = (r) => ({
            success : 1,
            result : {
                address : r,
            }
        })
        res.end(JSON.stringify(fmt(r)));
    })
}).catch(e => res.end(commonerror(e) ))

const getinfo = (sv, req, res) => Promise.resolve().then( () => {
    accesslog(req)
    return sv.cli.getServerInfo().then( r => {
        const fmt = (r) => ({
            success : 1,
            result : {
                validatedLedger: r.validatedLedger,
            }
        })
        res.end(JSON.stringify(fmt(r)));
    })
}).catch(e => res.end(commonerror(e) ))

const gettransaction = (sv, req, res) => Promise.resolve().then( () => {
    accesslog(req)
    const params = JSON.parse(req.rawpost)
    assert(params instanceof Object, "params : must be object")

    return sv.cli.transaction(params.txid).then(r => {
        const fmt = (r) => ({
            success : 1,
            result : {
                txid : r.id,
                time : new Date(r.outcome.timestamp) / 1000 | 0,
                ledger : r.outcome.ledgerVersion,
            }
        })
        res.end(JSON.stringify(fmt(r)));
    })
}).catch(e => res.end(commonerror(e) ))

const get_balance = (sv) => {
    return sv.cli.balance().then(r => {
        return r.reduce((r,v)=>{
            if(v.currency === "XRP"){
                r[v.currency] = v.value
            }else{
                r[v.currency + ":" + v.counterparty] = v.value
            }
            return r
        }, {XRP:"0"})
    })
}

const send = (sv, req, res) => Promise.resolve().then( () => {
    accesslog(req)
    const params = JSON.parse(req.rawpost)
    assert(params instanceof Object, "params : must be object")
    return get_balance(sv).then(r => {
        const xrp = parseFloat(r['XRP']) - 20
        if(xrp < parseFloat(params.amount)){
            throw new Error('Insufficient XRP balance to send.')
        }
        return sv.cli.payment(params.address, params.amount, params).then(r => {
            const fmt = (r) => ({
                success : 1,
                result : {
                    txid : r.txid,
                    fee: (r.Fee * 1e-6).toFixed(6),
                    feeDrops: r.Fee,
                    amount : (r.Amount * 1e-6).toFixed(6),
                    amountDrops : r.Amount,
                    raw: r.hex,
                }
            })
            res.end(JSON.stringify(fmt(r)));
        })
    })
}).catch(e => res.end(commonerror(e) ))

const start = exports.start = dirname => {
    const sv = {
        cli : void 0
    };
    initialize(dirname, sv)

    const app = connect();

    app.use((req, res, next) => {
        req.ipaddr = ip.getClientIp(req);
        if(req.method === 'POST'){
            let body = '';
            req.on('data', (data) => {
                body += data;
            });
            req.on('end', () => {
                req.rawpost = body;
                next();
            });
        }else{
            next();
        }
    })

    app.use(connectRoute((router) => {
        router.get('/healthcheck', (req, res, next) => healthcheck(sv, req, res) )
        router.get('/api/getfee', (req, res, next) => getfee(sv, req, res) )
        router.get('/api/getbalance', (req, res, next) => getbalance(sv, req, res) )
        router.post('/api/getbalance', (req, res, next) => getbalance(sv, req, res) )
        router.get('/api/getaddress', (req, res, next) => getaddress(sv, req, res) )
        router.post('/api/getaddress', (req, res, next) => getaddress(sv, req, res) )
        router.get('/api/getinfo', (req, res, next) => getinfo(sv, req, res) )
        router.post('/api/getinfo', (req, res, next) => getinfo(sv, req, res) )

        router.post('/api/gettx', (req, res, next) => gettransaction(sv, req, res) )

        router.post('/api/send', (req, res, next) => send(sv, req, res) )
    }))

    return app;
}

