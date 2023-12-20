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

/** MsgSend Example */
const sendTask = async () => {
  const network = getNetworkInfo(Network.Testnet)
  const privateKeyHash = process.env.PRIVATE_KEY;
  const privateKey = PrivateKey.fromHex(privateKeyHash)
  const injectiveAddress = privateKey.toBech32()
  const publicKey = privateKey.toPublicKey().toBase64()

  /** Account Details **/
  const accountDetails = await new ChainRestAuthApi(network.rest).fetchAccount(
    injectiveAddress,
  )

  /** Prepare the Message */
  const amount = {
    amount: new BigNumberInBase(0.015).toWei().toFixed(),
    denom: 'inj',
  }

  const msg = MsgSend.fromJSON({
    amount,
    srcInjectiveAddress: injectiveAddress,
    dstInjectiveAddress: injectiveAddress,
  })

  const sequence_id =parseInt(accountDetails.account.base_account.sequence,10);
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
    sequence: sequence_id+1,
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

sendTask().then((result)=>{
  console.log("Hello world");
  console.log("Hash:",result);
})
console.log("Hello injs");