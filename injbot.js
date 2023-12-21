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
  /** Account Details **/
  const accountDetails = await new ChainRestAuthApi(network.rest).fetchAccount(
    injectiveAddress,
  )

  const tokenNum = Number(process.env.AMOUNT);
  /** Prepare the Message */
  const amount = {
    amount: new BigNumberInBase(tokenNum).toWei().toFixed(),
    denom: 'inj',
  }

 


  const accountNumber = parseInt(accountDetails.account.base_account.account_number, 10,);
  const totalNum = Number(process.env.MINTNUM);
  //这里开始循环调用
  let index = 0;
  do {
    try {
      const hash = await sendTask(accountNumber, sid + index, publicKey, network, privateKey,amount,injectiveAddress);
      console.log("success", "index--", index, "hash:", hash);
    } catch (error) {
      console.log("failed index**", index);
      console.error(error.stack);
    }
    index++;
  } while (index < totalNum);
  return "finish mint:"+index.toString();
}

const sendTask = async (accountNumber, sid, publicKey, network, privateKey,amount,injectiveAddress) => {
  return new Promise((resolve,reject) => {
    setTimeout(() => {
      const runone = async () => {
        const msg = MsgSend.fromJSON({
          amount,
          srcInjectiveAddress: injectiveAddress,
          dstInjectiveAddress: injectiveAddress,
        })

        const gasplus = parseInt(process.env.GASPLUS);
        console.log("gasplus:", gasplus);
        let gaslimit =gasplus>9?10:gasplus;
        const gasUpdate = Math.floor(Number(DEFAULT_STD_FEE.amount[0].amount) * gaslimit);
        console.log("gasUpdate:", gasUpdate);
        // DEFAULT_STD_FEE.gas = gasUpdate.toString();
        DEFAULT_STD_FEE.amount[0].amount = gasUpdate.toString();
        console.log(DEFAULT_STD_FEE);
        const sequence_id = sid;
        console.log("sequence id:", sequence_id);
        console.log("accountNumber-",accountNumber);

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
        console.log(`Transaction Hash: ${Txhash}`)
        const txService = new TxGrpcClient(network.grpc)

        /** Simulate transaction */
        const simulationResponse = await txService.simulate(txRaw)
        console.log(
          `Transaction simulation response: ${JSON.stringify(
            simulationResponse.gasInfo,
          )}`,
        )

        /** Broadcast transaction */
        txService.broadcast(txRaw)
        return Txhash;
      }
      runone()
      .then(result=>{ resolve(result); })
      .catch(err=>reject(err))

    }, 3000);
  });

}

const viewSequence = async (NetTag) => {
  const network = getNetworkInfo(NetTag);
  const privateKeyHash = process.env.PRIVATE_KEY;
  const privateKey = PrivateKey.fromHex(privateKeyHash)
  const injectiveAddress = privateKey.toBech32()

  console.log("Env:", network.env);
  console.log("Rest rpc:",network.rest);
  console.log("Rpc:",network.rpc);
  /** Account Details **/
  const Restrpc=process.env.REST_URL||network.rest;
  console.log("Used rest:",Restrpc);
  const accountDetails = await new ChainRestAuthApi(Restrpc).fetchAccount(
    injectiveAddress,
  )
  const sequence_now = parseInt(accountDetails.account.base_account.sequence, 10);
  const nextSequence = sequence_now;
  console.log("NextSequence:", nextSequence);
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
    viewSequence(netTag);
  });


program.parse();
console.log("Hello injs");