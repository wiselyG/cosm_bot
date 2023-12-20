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
const startTask = async () => {
  const network = getNetworkInfo(Network.Testnet)
  const privateKeyHash =process.env.PRIVATE_KEY;
  const privateKey = PrivateKey.fromHex(privateKeyHash)
  const injectiveAddress = privateKey.toBech32()
  const publicKey = privateKey.toPublicKey().toBase64()

  /** Account Details **/
  const accountDetails = await new ChainRestAuthApi(network.rest).fetchAccount(
    injectiveAddress,
  )

  /** Prepare the Message */
  const amount = {
    amount: new BigNumberInBase(0.001).toWei().toFixed(),
    denom: 'inj',
  }

  const msg = MsgSend.fromJSON({
    amount,
    srcInjectiveAddress: injectiveAddress,
    dstInjectiveAddress: injectiveAddress,
  })

  /** Prepare the Transaction **/
  const { signBytes, txRaw } = createTransaction({
    message: msg,
    memo: process.env.MEMO,
    fee: DEFAULT_STD_FEE,
    pubKey: publicKey,
    sequence: parseInt(accountDetails.account.base_account.sequence, 10)+1,
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

  const txHash = TxClient.hash(txRaw);
  /** Calculate hash of the transaction */
  console.log(`Transaction Hash: ${txHash}`)

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
  return txHash;
  // if (txResponse.code !== 0) {
  //   console.log(`Transaction failed: ${txResponse.rawLog}`)
  // } else {
  //   console.log(
  //     `Broadcasted transaction hash: ${JSON.stringify(txResponse.txHash)}`,
  //   )
  // }

}

program.name("old test inj")
.version("0.2")

program
.command("start")
.action(()=>{
  startTask();
})

program.parse();