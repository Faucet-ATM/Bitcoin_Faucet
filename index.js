require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const bitcoin = require('bitcoinjs-lib');
// const axios = require('axios');
const { ECPairFactory } = require("ecpair");
const ecc = require("tiny-secp256k1");
const { getUTXOs, broadcastTx } = require('./utils/btcManager');

const app = express();
const port = process.env.PORT || 3000;

const ECPair = ECPairFactory(ecc);

app.use(bodyParser.json());

const network = bitcoin.networks.regtest;
const keyPair = ECPair.fromWIF(process.env.PRIVATE_KEY, network);

async function sendBitcoin(toAddress, amountSatoshis = 0.5) {
  // Public Key: 02d51208500f0249488a1f62b03c09de624b7441cd1b37635f3e1dfb0b4fc272fb
  // P2PKH Address: bcrt1qcr57zf4k40eawtnazl5nv0cc0cnv6pttsvx8lw
  const { address } = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network });


  // 实际环境中应从区块链API获取UTXO
  const utxos = await getUTXOs(address);
  const psbt = new bitcoin.Psbt({ network });

  let totalAmountAvailable = 0;

  utxos.forEach(utxo => {
    totalAmountAvailable += utxo.amount * 100000000;  // 累加UTXO的总金额
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: Buffer.from(utxo.scriptPubKey, 'hex'),
        value: utxo.amount * 100000000, // 将金额从比特币转换为聪
      }
    });
  });

  const fee = 10000; // 矿工费用，根据实际情况调整

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
      address, // 确保这里使用正确的找零地址
      value: change,
    });
  }

  psbt.data.inputs.forEach((input, index) => {
    psbt.signInput(index, keyPair);
  });
  psbt.finalizeAllInputs();

  return psbt.extractTransaction().toHex();
}

app.post('/bitcoin/request', async (req, res) => {
  const { address, amount } = req.body; // Alice bcrt1qq7hu62zdqtr2xle9glt8lawz3wmcx47lgll37t
  try {
    const transactionHex = await sendBitcoin(address, parseInt(amount));
    console.log('Transaction hex:', transactionHex);
    const result = await broadcastTx(transactionHex);
    console.log('Broadcast result:', result);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

module.exports = {
  sendBitcoin,
}
