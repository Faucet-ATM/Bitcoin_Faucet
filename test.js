const { broadcastTx } = require("./utils/btcManager");
const { sendBitcoin } = require("./index");

sendBitcoin('bcrt1qq7hu62zdqtr2xle9glt8lawz3wmcx47lgll37t', 1000000)
  .then(async txHex => {
    console.log('Transaction hex:', txHex);
    const result = await broadcastTx(txHex);
    console.log('Broadcast result:', result);
  });
