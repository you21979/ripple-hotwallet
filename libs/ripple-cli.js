'use strict'; 
const RippleAPI = require('ripple-lib').RippleAPI;

const createRipple = (uri) => {
    const api = new RippleAPI({server: uri});
    api.on('connected', () => {
        console.log('Connection is open now.');
    });
    api.on('disconnected', (code) => {
        if (code !== 1000) {
            console.log('Connection is closed due to error.');
        } else {
            console.log('Connection is closed normally.');
        }
    });
    return api
}

const createPaymentXRP = (source_address, dest_address, amount, options) => {
    const symbol = "XRP"
    const result = {
      "source": {
        "address": source_address,
        "maxAmount": {
          "value": amount.toString(),
          "currency": symbol,
        }
      },
      "destination": {
        "address": dest_address,
        "amount": {
          "value": amount.toString(),
          "currency": symbol,
        }
      }
    };
    if(options.destination_tag) result.destination.tag = options.destination_tag
    return result
}


class RippleCli{
    constructor(address, secret, uri){
        this.uri = uri
        this.wallet = {
            address : address,
            secret : secret,
        }
        this.sendparameter = {
            min_fee : 100,
            wait_ledger : 5,
        }
        this.api = createRipple(uri || 'wss://s1.ripple.com:443');
    }
    connect(){
        return this.api.connect()
    }
    disconnect(){
        return this.api.disconnect()
    }
    balance(){
        return this.api.getBalances(this.wallet.address)
    }
    address(){
        return Promise.resolve().then(() => this.wallet.address)
    }
    broadcast(signedtx){
        return this.api.submit(signedtx)
    }
    transaction(txid){
        return this.api.getTransaction(txid)
    }
    payment(address, amount, options){
        const instructions = {maxLedgerVersionOffset: this.sendparameter.wait_ledger};
        return this.api.preparePayment(this.wallet.address, createPaymentXRP(this.wallet.address, address, amount, options), instructions).
            then(prepared => this.onPreparedPayment(prepared))
            then(prepared => {
                const sign = this.api.sign(prepared.txJSON, this.wallet.secret);
                const tx = JSON.parse(prepared.txJSON)
                tx.txid = sign.id
                tx.hex = sign.signedTransaction
                return this.api.submit(sign.signedTransaction).then(res => {
                    if(res.resultCode !== 'tesSUCCESS'){
                        throw new Error(res.resultMessage)
                    }
                    return tx
                })
            });
    }
    onPreparedPayment(prepared){
        const tx = JSON.parse(prepared.txJSON)
        if(this.sendparameter.min_fee > tx.Fee) tx.Fee = this.sendparameter.min_fee
        prepared.txJSON = JSON.stringify(tx)
        return prepared
    }
    getFee(){
        return this.api.getFee()
    }
    getServerInfo(){
        return this.api.getServerInfo()
    }
}

module.exports = RippleCli
