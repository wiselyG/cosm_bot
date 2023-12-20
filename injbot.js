require("dotenv").config();
const { getNetworkInfo, Network }= require('@injectivelabs/networks');
const {
  TxClient,
  PrivateKey,
  TxGrpcClient,
  ChainRestAuthApi,
  createTransaction,
}= require('@injectivelabs/sdk-ts');
const { MsgSend } = require('@injectivelabs/sdk-ts');
const { BigNumberInBase, DEFAULT_STD_FEE } = require('@injectivelabs/utils');
const { program } = require('commander');


/** MsgSend Example */
const sendTask = async (sid,NetTag) => {
  const network = getNetworkInfo(NetTag);
  const privateKeyHash = process.env.PRIVATE_KEY;
  const privateKey = PrivateKey.fromHex(privateKeyHash)
  const injectiveAddress = privateKey.toBech32()
  const publicKey = privateKey.toPublicKey().toBase64()

  console.log("Env:",network.env);
  /** Account Details **/
  const accountDetails = await new ChainRestAuthApi(network.rest).fetchAccount(
    injectiveAddress,
  )

  const tokenNum=Number(process.env.AMOUNT);
  /** Prepare the Message */
  const amount = {
    amount: new BigNumberInBase(tokenNum).toWei().toFixed(),
    denom: 'inj',
  }

  const msg = MsgSend.fromJSON({
    amount,
    srcInjectiveAddress: injectiveAddress,
    dstInjectiveAddress: injectiveAddress,
  })

  const gasplus = parseInt(process.env.GASPLUS);
  console.log("gasplus:",gasplus);
  const gasUpdate=Math.floor(Number(DEFAULT_STD_FEE.gas)*(1+gasplus/100));
  console.log("gasUpdate:",gasUpdate);
  DEFAULT_STD_FEE.gas=gasUpdate.toString();
  const sequence_id =sid;
  const accountNumber =parseInt(accountDetails.account.base_account.account_number,10,);
  console.log("sequence id:",sequence_id);
  console.log("accountNum:",accountNumber);
  console.log("default std fee:",DEFAULT_STD_FEE);

  /** Prepare the Transaction **/
  const { signBytes, txRaw } = createTransaction({
    message: msg,
    memo: process.env.MEMO,
    fee: DEFAULT_STD_FEE,
    pubKey: publicKey,
    sequence: sequence_id,
    accountNumber: parseInt(
      accountDetails.account.base_account.account_number,
      10,
    ),
    chainId: network.chainId,
  })

  /** Sign transaction */
  const signature = await privateKey.sign(Buffer.from(signBytes))

  /** Append Signatures */
  txRaw.signatures = [signature]

  const Txhash=TxClient.hash(txRaw);
  /** Calculate hash of the transaction */
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

program
.name("mint injs bot")
.version("0.0.2");

program
.command("inj")
.argument('<number>',"start sequence")
.option('--main',"change to mainnet")
.action((args,options)=>{
  const sid=parseInt(args);
  const netTag = options.main?Network.Mainnet:Network.Testnet;
  sendTask(sid,netTag).then(result=>{
    console.log("Hello world");
    console.log("Hash:",result);
  });
})


program.parse();
console.log("Hello injs");