# API


## GET /api/getbalance

```
{"success":1,"result":{"balance":{"XRP":"25.15413","IOU:ISSUER":"0"}}}
```

## GET /api/getaddress

```
{"success":1,"result":{"address":"ripple address"}}
```

## GET /api/getinfo

```
{"success":1,"result":{"validatedLedger":{"age":5,"hash":"60CF623E34CFD74542822DA16E8424BCB925BEF2CBCB6438EB73C4F857BE0991","baseFeeXRP":"0.00001","reserveBaseXRP":"20","reserveIncrementXRP":"5","ledgerVersion":29894372}}}
```

## POST /api/gettx

* input

```
{"txid":"ripple txid"}
```

* output

```
{ success: 1,
  result: 
   { txid: 'ripple txid',
     time: 1494911700,
     ledger: 29795946 } }
```

## POST /api/send

* input


```
{"address":"ripple address","destination_tag":9999999,"amount":"0.1"}
```

* output

```
{ success: 1,
  result: 
   { txid: 'ripple txid',
     fee: '0.006726',
     feeDrops: '6726',
     amount: '0.100000',
     amountDrops: '100000',
     raw: 'ripple raw transaction' } }
```
