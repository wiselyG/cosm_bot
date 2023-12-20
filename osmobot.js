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
const { getStdFee, DEFAULT_STD_FEE, BigNumberInBase } = require('@injectivelabs/utils');
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
  .option('--main', "test model")
  .action((options) => {
    console.log(options.test);
    const injnet = options.test ? getNetworkInfo(Network.Mainnet) : getNetworkInfo(Network.Testnet);
    console.log("rpc:", injnet);
    mintInjs(injnet.rpc);
  })

const mintInjs = async (url) => {
  const numpreloop = process.env.NUMPRELOOP || 5;
  const times = Math.floor(process.env.MINTNUM / numpreloop) || 2;
  // const value=ethers.utils.parseEther(process.env.AMOUNT);
  const value = new BigNumberInBase(Number(process.env.AMOUNT)).toWei().toFixed();
  const amount = {
    denom: 'inj',
    amount: value
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
    const [account] =await wallet.getAccounts();
    let index = 0;
    do {
      for (let n = 0; n < numpreloop; n++) {
        console.log("*", index, "-", n);
        await sendTransaction(amount,account.address);
      }
      index++;
      const balance = await client.getBalance(walletAddress, 'inj');
      console.log("balance:", balance);
    } while (index < times);
  } catch (error) {
    console.log("get a Error");
    console.error(error.stack);
  }
}

const sendTransaction = async (amount,acctaddr) => {
  return new Promise((resolve, reject) => {
    console.log("amount:", amount);
    if (!client) {
      reject(new Error("client is not inited."))
    }
    setTimeout(() => {
      const receiveAddress = process.env.RECEIVE;
      const memo = process.env.MEMO;
      console.log("memo:",memo);
      client.sendTokens(acctaddr, receiveAddress, [amount], DEFAULT_STD_FEE, memo)
        .then(result => {
          console.log(result);
          resolve(result);
        })
        .catch(err => reject(err));
      // console.log("response code:", txResponse.code);

    }, 400);
  });

}

program.parse();
console.log("osmobot run");