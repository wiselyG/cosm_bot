require("dotenv").config();
const { getNetworkInfo, Network } = require('@injectivelabs/networks');
const {
  TxClient,
  PrivateKey,
  TxGrpcClient,
  ChainRestAuthApi,
  createTransaction,
} = require('@injectivelabs/sdk-ts');
const { MsgSend } = require('@injectivelabs/sdk-ts');
const { BigNumberInBase, DEFAULT_STD_FEE } = require('@injectivelabs/utils');
const { program } = require('commander');


/** MsgSend Example */
const mintTask = async (sid, NetTag) => {
  const network = getNetworkInfo(NetTag);
  const privateKeyHash = process.env.PRIVATE_KEY;
  const privateKey = PrivateKey.fromHex(privateKeyHash)
  const injectiveAddress = privateKey.toBech32()
  const publicKey = privateKey.toPublicKey().toBase64()

  console.log("Env:", network.env);
  console.log("Rest rpc:",network.rest);
  let restUsed=process.env.REST_URL||network.rest;
  if(NetTag == Network.TestnetSentry || NetTag == Network.Testnet){
    restUsed= network.rest;
  }
  /** Account Details **/
  const accountDetails = await new ChainRestAuthApi(restUsed).fetchAccount(
    injectiveAddress,
  )

  const tokenNum = Number(process.env.AMOUNT);
  /** Prepare the Message */
  const amount = {
    amount: new BigNumberInBase(tokenNum).toWei().toFixed(),
    denom: 'inj',
  }

  const accountNumber = parseInt(accountDetails.account.base_account.account_number, 10,);
  let totalNum = Number(process.env.MINTNUM);
  const gasplus = parseInt(process.env.GASPLUS);
  console.log("gasplus:", gasplus);
  let gaslimit = gasplus > 9 ? 10 : gasplus;
  const gasUpdate = Math.floor(Number(DEFAULT_STD_FEE.amount[0].amount) * gaslimit);
  console.log("gasUpdate:", gasUpdate);
  // DEFAULT_STD_FEE.gas = gasUpdate.toString();
  DEFAULT_STD_FEE.amount[0].amount = gasUpdate.toString();

  //这里开始循环调用
  let index = 0;
  let failed=0;
  let indexSid=sid;
  do {
    try {
      const hash = await sendTask(accountNumber, indexSid + index, publicKey, network, privateKey, amount, injectiveAddress);
      console.log("I:", index, "Hash:", hash);
    } catch (error) {
      failed++;
      console.log("**failed", index);
      // console.error(error.stack);
      console.log(typeof error.stack);
      const errorlog=error.stack.toString();
      if(errorlog.includes("account sequence mismatch")){
        let start=errorlog.indexOf("expected")+"expected".length;
        const seqStr = errorlog.substring(start);
        totalNum-=(index-1);
        indexSid = parseInt(seqStr);
        index=0;
        console.log("change sequence to:",indexSid);
      }
    }
    index++;
  } while (index < totalNum);
  return "finish mint:" + index.toString()+" Failed:"+failed.toString();
}

const sendTask = async (accountNumber, sid, publicKey, network, privateKey, amount, injectiveAddress) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const runone = async () => {
        const msg = MsgSend.fromJSON({
          amount,
          srcInjectiveAddress: injectiveAddress,
          dstInjectiveAddress: injectiveAddress,
        })


        console.log("gas amount:",DEFAULT_STD_FEE.amount[0].amount);
        const sequence_id = sid;
        console.log("sequence id:", sequence_id);

        /** Prepare the Transaction **/
        const { signBytes, txRaw } = createTransaction({
          message: msg,
          memo: process.env.MEMO,
          fee: DEFAULT_STD_FEE,
          pubKey: publicKey,
          sequence: sequence_id,
          accountNumber: accountNumber,
          chainId: network.chainId,
        })

        const signature = await privateKey.sign(Buffer.from(signBytes))
        txRaw.signatures = [signature]
        const Txhash = TxClient.hash(txRaw);
        const txService = new TxGrpcClient(network.grpc)

        /** Simulate transaction */
        const simulationResponse = await txService.simulate(txRaw);
        console.log(
          `Transaction simulation response: ${JSON.stringify(
            simulationResponse.gasInfo,
          )}`,
        );

        /** Broadcast transaction */
        txService.broadcast(txRaw)
        return Txhash;
      }
      runone()
        .then(result => { resolve(result); })
        .catch(err => reject(err))

    }, 1800);
  });

}

const viewSequence = async (NetTag) => {
  const network = getNetworkInfo(NetTag);
  const privateKeyHash = process.env.PRIVATE_KEY;
  const privateKey = PrivateKey.fromHex(privateKeyHash)
  const injectiveAddress = privateKey.toBech32()

  console.log("Env:", network.env);
  console.log("Rest rpc:", network.rest);
  console.log("Rpc:", network.rpc);
  /** Account Details **/
  let Restrpc = process.env.REST_URL || network.rest;
  if(NetTag == Network.TestnetSentry || NetTag == Network.Testnet){
    Restrpc = network.rest;
  }
  console.log("Used rest:", Restrpc);
  const accountDetails = await new ChainRestAuthApi(Restrpc).fetchAccount(
    injectiveAddress,
  )
  const sequence_now = parseInt(accountDetails.account.base_account.sequence, 10);
  return sequence_now;
}

program
  .name("mint injs bot")
  .version("0.0.2");

program
  .command("inj")
  .argument('<number>', "start sequence")
  .option('--main', "change to mainnet")
  .action((args, options) => {
    const sid = parseInt(args);
    const netTag = options.main ? Network.MainnetSentry : Network.TestnetSentry;
    mintTask(sid, netTag).then(result => {
      console.log(result);
    });
  })

program
  .command("nonce")
  .option('--test', "show Testnet sequence")
  .action((options) => {
    const netTag = options.test ? Network.TestnetSentry : Network.MainnetSentry;
    viewSequence(netTag)
    .then(result=>{
      console.log("Nextsequence:",result);
    })
  });


program.parse();
console.log("Hello injs");