require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const bitcoin = require('bitcoinjs-lib');
const { ECPairFactory } = require("ecpair");
const ecc = require("tiny-secp256k1");
const { getUTXOs, broadcastTx } = require('./utils/btcManager');

const app = express();
const port = process.env.PORT || 3000;

const ECPair = ECPairFactory(ecc);

app.use(bodyParser.json());

app.post('/bitcoin/request', async (req, res) => {
  const { network: networkName, address } = req.body;
  const network = bitcoin.networks[networkName]; // 从请求中获取网络
  if (!network) {
    return res.status(400).json({ success: false, message: "Invalid network specified" });
  }

  const keyPair = ECPair.fromWIF(process.env.PRIVATE_KEY, network);

  try {
    const amountSatoshis = 50000; // 例如，固定数额或可以根据需要从请求中获取
    const transactionHex = await sendBitcoin(address, amountSatoshis, network, keyPair);
    console.log('Transaction hex:', transactionHex);
    const txid = await broadcastTx(transactionHex);
    console.log('Broadcast result:', txid);
    res.json({
      success: true,
      tx_id: txid,
      explorer_url: `https://${networkName}.blockexplorer.com/tx/${txid}` // 示例URL, 根据实际使用的区块浏览器调整
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

async function sendBitcoin(toAddress, amountSatoshis, network, keyPair) {
  const { address } = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network });

  const utxos = await getUTXOs(address);
  const psbt = new bitcoin.Psbt({ network });

  let totalAmountAvailable = 0;

  utxos.forEach(utxo => {
    totalAmountAvailable += utxo.amount * 100000000;
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: Buffer.from(utxo.scriptPubKey, 'hex'),
        value: utxo.amount * 100000000,
      }
    });
  });

  const fee = 10000;

  if (totalAmountAvailable < amountSatoshis + fee) {
    throw new Error('Insufficient funds');
  }

  psbt.addOutput({
    address: toAddress,
    value: amountSatoshis,
  });

  const change = totalAmountAvailable - amountSatoshis - fee;
  if (change > 0) {
    psbt.addOutput({
      address,
      value: change,
    });
  }

  psbt.data.inputs.forEach((input, index) => {
    psbt.signInput(index, keyPair);
  });
  psbt.finalizeAllInputs();

  return psbt.extractTransaction().toHex();
}

module.exports = {
  sendBitcoin,
}
