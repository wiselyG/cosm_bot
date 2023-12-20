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

const pKey = process.env.PRIVATE_KEY;

program
  .name("Injective ins bot")
  .version("0.0.1")

program
  .command("hello")
  .action(() => {
    Injwallet();
  })

const Injwallet = async () => {
  const network = getNetworkInfo(Network.Mainnet);
  const rpc_url = "https://testnet.sentry.tm.injective.network:443";
  console.log("network-rpc:", network.rpc, " rest:", network.rest);
  const privateKeyHash = pKey;
  const privateKey = PrivateKey.fromHex(privateKeyHash);
  const injectiveAddress = privateKey.toBech32();
  console.log("inj wallet:", injectiveAddress);

  const wallet = await InjectiveDirectEthSecp256k1Wallet.fromKey(Buffer.from(privateKeyHash, 'hex'));
  const [account] = await wallet.getAccounts();
  console.log("from:", account.address);


  const receiveAddress = process.env.RECEIVE;
  const amount = {
    denom: 'inj',
    amount: '100000000'
  };
  const memo = "you memo words";
  try {

    const client = await InjectiveStargate.InjectiveSigningStargateClient.connectWithSigner(
      rpc_url,
      wallet
    );
    const balance = await client.getBalance(account.address);
    console.log(balance);
    // const txResponse = await client.sendTokens(account.address,receiveAddress,[amount],getStdFee(),memo);
    // console.log("response code:", txResponse.code);
  } catch (error) {
    console.log("get a error");
    console.log(error.stack);
  }
}

program.parse();
console.log("osmobot run");