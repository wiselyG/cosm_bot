require("dotenv").config();
const { program } = require('commander');
const {
  PrivateKey,
  InjectiveStargate,
  InjectiveDirectEthSecp256k1Wallet,
} = require('@injectivelabs/sdk-ts');
const {
  Network, getNetworkInfo,
} = require('@injectivelabs/networks');
const { getStdFee } = require('@injectivelabs/utils');
const { ethers } = require('ethers');

const pKey = process.env.PRIVATE_KEY;

let wallet;
let walletAddress;
let client;

program
  .name("Injective ins bot")
  .version("0.0.1")

program
  .command("hello")
  .option('--test', "test model")
  .action((args, option) => {
    const rpc = option.test ? getNetworkInfo(Network.Testnet) : getNetworkInfo(Network.Mainnet);
    mintInjs(rpc);
  })

const mintInjs = async (url) => {
  const numpreloop = process.env.NUMPRELOOP || 5;
  const times = Math.floor(process.env.MINTNUM / numpreloop) || 2;
  const value=ethers.utils.parseEther(process.env.AMOUNT);
  const amount = {
    denom: 'inj',
    amount: value.toBigInt()
  }
  const rpcUrl = process.env.RPC_URL || url;
  const privateKey = PrivateKey.fromHex(pKey);
  walletAddress = privateKey.toBech32();
  console.log("start mint on wallet:", walletAddress);
  try {
    wallet = await InjectiveDirectEthSecp256k1Wallet.fromKey(Buffer.from(pKey, 'hex'));
    client = await InjectiveStargate.InjectiveSigningStargateClient.connectWithSigner(
      rpcUrl,
      wallet
    );
    let index = 0;
    do {
      for (let n = 0; n < numpreloop; n++) {
        console.log("*", index, "-", n);
        await sendTransaction(amount);
      }
      index++;
    } while (index < times);
  } catch (error) {
    console.log("get a Error");
    console.error(error.stack);
  }
}

const sendTransaction = async (amount) => {
  return new Promise((resolve, reject) => {
    console.log("amount:", amount);
    setTimeout(() => {
      const receiveAddress = process.env.RECEIVE;
      const memo = process.env.MEMO;
      client.getBalance(account.address, 'inj').then(result => {
        console.log("balance:", ethers.utils.formatEther(result.amount));
        resolve(result);
      })
      .catch(err => {
        reject(err);
      })

      // const txResponse = await client.sendTokens(account.address,receiveAddress,[amount],getStdFee(),memo);
      // console.log("response code:", txResponse.code);

    }, 1100);
  });

}

program.parse();
console.log("osmobot run");