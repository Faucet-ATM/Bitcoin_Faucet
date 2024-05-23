require('dotenv').config();
const bitcoinRpc = require('node-bitcoin-rpc');

bitcoinRpc.init('localhost', 18443, process.env.RPCUSER, process.env.RPCPASSWORD);

function getUTXOs(address) {
  return new Promise((resolve, reject) => {
    // bitcoinRpc.call('listunspent', ['-regtest', '-rpcuser=111111', '-rpcpassword=111111', '-rpcwallet=demo', 0, 9999999, [address]], function (err, res) {
    bitcoinRpc.call('listunspent', [0, 9999999, [address]], function(err, res) {
      if (err !== null) {
        reject('Error: ' + err);
      } else if (res.error !== null) {
        reject('Error: ' + res.error);
      } else {
        resolve(res.result);
      }
    });
  });
}

function broadcastTx(txHex) {
  return new Promise((resolve, reject) => {
    bitcoinRpc.call('sendrawtransaction', [txHex], function(err, res) {
      if (err !== null) {
        reject('Error: ' + err);
      } else if (res.error !== null) {
        reject('Error: ' + res.error);
      } else {
        resolve(res.result);
      }
    });
  });
}

module.exports = {
  getUTXOs,
  broadcastTx,
}

// getUTXOs('bcrt1qcr57zf4k40eawtnazl5nv0cc0cnv6pttsvx8lw')
// .then(res => console.log(res))
// .catch(err => console.log(err));

/*
 [
 {
 txid: 'da14d04941f94618614a3e650ae3f739485e912e9b44655bde2bc0e52b0351cf',
 vout: 0,
 address: 'bcrt1qcr57zf4k40eawtnazl5nv0cc0cnv6pttsvx8lw',
 label: '',
 scriptPubKey: '0014c0e9e126b6abf3d72e7d17e9363f187e26cd056b',
 amount: 50,
 confirmations: 104,
 spendable: true,
 solvable: true,
 desc: "wpkh([ea12e682/84'/1'/0'/0/0]02d51208500f0249488a1f62b03c09de624b7441cd1b37635f3e1dfb0b4fc272fb)#dedf5x0r",
 parent_descs: [
 "wpkh(tpubD6NzVbkrYhZ4XCqzp7Ptcz2Fz7fFKtz2KUkqUGCGvG2Wdum9nq3uJZCLzBAEjFEAQ9ZpAD2NKraY5J9TVh4ntiGyDne6gZgZiwtHk8kJZV5/84'/1'/0'/0/*)#afs59k3v"
 ],
 safe: true
 }
 ]
 */
