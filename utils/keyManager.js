require('dotenv').config();
const bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');
const { BIP32Factory } = require('bip32');
const { ECPairFactory } = require('ecpair');

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

const network = bitcoin.networks.regtest;

// 获取环境变量中的描述符
const descriptor = process.env.desc;

// 解析描述符获取扩展私钥和路径
const extractXprivAndPath = (desc) => {
  const xprivRegex = /pkh\(([^)]+)\)/;
  const match = xprivRegex.exec(desc);
  if (!match) {
    throw new Error('Invalid descriptor format.');
  }
  const fullPath = match[1];
  const xpriv = fullPath.split('/')[0]; // 提取出纯扩展私钥
  const path = `m${fullPath.substring(fullPath.indexOf('/'))}`; // 提取出以 'm' 开始的路径

  return { xpriv, path };
};

// 根据扩展私钥和指定的地址索引生成私钥
const generatePrivateKey = ({xpriv, path}, index = 0) => {
  const adjustedPath = path.replace('*', index.toString());

  const node = bip32.fromBase58(xpriv, network);
  const child = node.derivePath(adjustedPath);

  return child.toWIF(); // 转换为 Wallet Import Format
};

try {
  const {xpriv, path} = extractXprivAndPath(descriptor);
  const privateKeyWIF = generatePrivateKey({xpriv, path});
  console.log("Generated Private Key:", privateKeyWIF);

  // 从 WIF 格式导入私钥创建 keyPair
  const keyPair = ECPair.fromWIF(privateKeyWIF, network);  // 确保网络是 testnet 或者根据你的需求选择其他网络

  // 从 keyPair 导出公钥
  const publicKey = keyPair.publicKey;

  // 生成 P2PKH 地址
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: publicKey,
    network: network  // 同样确保这里的网络设置正确
  });

  console.log("Public Key:", publicKey.toString('hex'));
  console.log("P2PKH Address:", address);

  // 导出私钥
  module.exports = { privateKeyWIF };
} catch (error) {
  console.error("Error generating private key:", error);
}
