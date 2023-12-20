import {
  PrivateKey,
  InjectiveStargate,
  InjectiveDirectEthSecp256k1Wallet,
} from "@injectivelabs/sdk-ts";
import { config } from 'dotenv';
import { OfflineDirectSigner } from "@cosmjs/proto-signing";
import { Network, getNetworkInfo } from "@injectivelabs/networks";
import { getStdFee } from "@injectivelabs/utils";
config();

(async () => {
  const network = getNetworkInfo(Network.Testnet);
  const privateKeyHash = process.env.PRIVATE_KEY;
  const privateKey = PrivateKey.fromHex(privateKeyHash);
  const injectiveAddress = privateKey.toBech32();

  const wallet = (await InjectiveDirectEthSecp256k1Wallet.fromKey(
    Buffer.from(privateKeyHash, "hex")
  ));// as OfflineDirectSigner;
  const [account] = await wallet.getAccounts();
  console.log("Account",account);

  const client =
    await InjectiveStargate.InjectiveSigningStargateClient.connectWithSigner(
      network.rpc, //as string,
      wallet
    );

  const recipient = injectiveAddress;
  const amount = {
    denom: "inj",
    amount: "1000000000",
  };

  const txResponse = await client.sendTokens(
    account.address,
    recipient,
    [amount],
    getStdFee(),
    "Have fun with your star coins"
  );

  if (txResponse.code !== 0) {
    console.log(`Transaction failed: ${txResponse.rawLog}`);
  } else {
    console.log(
      `Broadcasted transaction hash: ${JSON.stringify(
        txResponse.transactionHash
      )}`
    );
  }
})();