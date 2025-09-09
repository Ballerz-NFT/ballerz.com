import { generateNonce } from "@/lib/nonces";
import * as fcl from "@onflow/fcl";

// your own app identifier
export const appIdentifier = "Ballerz.com";

type AccountProofData = {
  // e.g. "75f8587e5bd5f9dcc9909d0dae1f0ac5814458b2ae129620502cb936fde7120a" - minimum 32-byte random nonce as hex string
  nonce: string;
};

type AccountProofDataResolver = () => Promise<AccountProofData | null>;

// need a resolver function for account proofing
const accountProofDataResolver: AccountProofDataResolver = async () => {
  const { nonce } = await generateNonce();
  return {
    nonce,
  };
};

fcl.config({
  "accessNode.api": "https://rest-mainnet.onflow.org",
  "discovery.wallet": "https://fcl-discovery.onflow.org/authn",
  "discovery.authn.endpoint": "https://fcl-discovery.onflow.org/api/authn",
  "discovery.authn.include": ["0xead892083b3e2c6c"],
  "flow.network": "mainnet",
  "fcl.accountProof.resolver": accountProofDataResolver,
  "app.detail.title": appIdentifier,
  "walletconnect.projectId": "15b471a96f110f47ae94b9e41da217d8",
});

export { fcl };
