require('dotenv').config();
const BlocknativeSdk = require('bnc-sdk');
const WebSocket = require('ws');
const { createAlchemyWeb3 } = require("@alch/alchemy-web3")

// gaslimit
const gasLimit = 1000000
// mint几只
const mintCount = 1
// 总价是多少
const totalPrice = 1
// mint function是什么
const mintMethod = "mint"
// 钱包之前成功发出几笔交易，如果是新创钱包从 0 开始
const nonce = 0
// 监听合约的控制地址
const ownerAddress = '0x2f83aCfb460748e6ad9C939d599B0463e7d484Be'
// 监听合约地址
const contractAddress = '0x253d8314b02D3a0670cF96e0d9A6bf09b5ad1ec7'
// 监听合约的 function
const methodName = "setStatus"

const options = {
    dappId: process.env.BN_DAPPID,
    networkId: 1,
    system: 'ethereum',
    transactionHandlers: [event => start(event.transaction)],
    ws: WebSocket,
    name: 'Metroverse',
    onerror: (error) => {console.log(error)}
}

const main = async () => {
    console.log("------开始监听-----")
    const sdk = new BlocknativeSdk(options)
    await sdk.configuration({
        scope: contractAddress,
        filters: [
            { from: ownerAddress },
            { "contractCall.methodName": methodName},
            { status: "pending" }
        ],
        watchAddress: true
    })
}

const readCSV = (callback) => {
    const fs = require('fs');
    const path = require('path');
    const { parse } = require('fast-csv');
  
    let rows = [];
    fs.createReadStream(path.resolve(__dirname, 'wallet.csv'))
      .pipe(parse({ ignoreEmpty: true }))
      .on('error', error => console.error(error))
      .on('data', row => rows.push(row))
      .on('end', () => callback(rows))
}

const start = (tx) => {
    console.log(tx)
    readCSV(rows => {
        rows.forEach(element => {
            mint(element[0], element[1], tx.maxFeePerGas, tx.maxPriorityFeePerGas)
        })
    })
}

const web3 = createAlchemyWeb3(process.env.WSS_URL);
const abi = require('./abi.json');
const nftContract = new web3.eth.Contract(JSON.parse(abi.result), contractAddress)
const mint = async (address, privateKey, maxFeePerGas, maxPriorityFeePerGas) => {
    const tx = {
        from: address,
        to: contractAddress,
        nonce: nonce,
        value: web3.utils.toWei(totalPrice + '', 'ether'),
        data: nftContract.methods[mintMethod](mintCount).encodeABI(),
    }
    tx["gas"] = gasLimit + "";
    tx["maxFeePerGas"] = maxFeePerGas
    tx["maxPriorityFeePerGas"] = maxPriorityFeePerGas;
    const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey)
    web3.eth.sendSignedTransaction(signedTx.rawTransaction)
        .on('transactionHash', hash => console.log('交易 Hash: ', hash))
        .on('confirmation', (confirmationNumber, receipt) => console.log('区块确认数: ', confirmationNumber, '\n收据: ', receipt))
        .on('error', console.error)
}

main()