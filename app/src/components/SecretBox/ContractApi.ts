import { Wallet, SecretNetworkClient, Permit, fromUtf8, TxResponse } from "secretjs"
import type {
  PrivateMetadataResult, MintNftResult, 
  ExecuteResult, QueryResult, TokensResult, NftInfoResult, 
} from './Types'

// Get environment variables from .env
const localSecretUrl: string = import.meta.env.VITE_LOCALSECRET_GRPC
const secretBoxCode: number = import.meta.env.VITE_SECRET_BOX_CODE
const secretBoxHash: string = import.meta.env.VITE_SECRET_BOX_HASH
const secretBoxAddress: string = import.meta.env.VITE_SECRET_BOX_ADDRESS

console.log(`local gRPC = ${localSecretUrl}`)
console.log(`code id = ${secretBoxCode}`)
console.log(`contract hash = ${secretBoxHash}`)
console.log(`contract address = ${secretBoxAddress}`)

// secret1ap26qrlp8mcq2pg6r47w43l0y8zkqm8a450s03
// secret1fc3fzy78ttp0lwuujw7e52rhspxn8uj52zfyne
// secret1ajz54hz8azwuy34qwy9fkjnfcrvf0dzswy0lqq
// secret1ldjxljw7v4vk6zhyduywh04hpj0jdwxsmrlatf
const mnemonics = [
  "grant rice replace explain federal release fix clever romance raise often wild taxi quarter soccer fiber love must tape steak together observe swap guitar",
  "jelly shadow frog dirt dragon use armed praise universe win jungle close inmate rain oil canvas beauty pioneer chef soccer icon dizzy thunder meadow",
  "chair love bleak wonder skirt permit say assist aunt credit roast size obtain minute throw sand usual age smart exact enough room shadow charge",
  "word twist toast cloth movie predict advance crumble escape whale sail such angry muffin balcony keen move employ cook valve hurt glimpse breeze brick",
]

export const initSecretjsClient = async (accounts: SecretNetworkClient[]) => {
  for (const mnemonic of mnemonics) {
    const wallet = new Wallet(mnemonic)
    // let secretjs = await SecretNetworkClient.create({
    let secretjs = new SecretNetworkClient({
      //grpcWebUrl: "http://localhost:9091",
      url: localSecretUrl,
      chainId: "secretdev-1",
      wallet: wallet,
      walletAddress: wallet.address,
    })
    accounts.push(secretjs)
    console.log(`Created client for wallet address: ${secretjs.address}`)
  } 
  return accounts
}


// Smart contract interface -------------------------------

export const handleMintNft = async (
  secretjs: SecretNetworkClient,
  token_id: string,
) => {

  const tx = await secretjs.tx.compute.executeContract(
  {
    sender: secretjs.address,
    contract_address: secretBoxAddress,
    code_hash: secretBoxHash,
    msg: {
      mint_nft: {
        token_id
      },
    },
  },
  {
    gasLimit: 1_000_000,
  })

  // console.log(`Minted NFT ${fromUtf8(tx.data[0])}`)
  if (tx.code === 0) {
    console.log(`Minted NFT: ${token_id}`)
  } else {
    console.log(`Tx error: ${tx.rawLog}`)
  }
}

export const handleTransferNft = async (
  secretjs: SecretNetworkClient,
  recipient: string,
  token_id: string,
) => {
  const tx = await secretjs.tx.compute.executeContract(
  {
    sender: secretjs.address,
    contract_address: secretBoxAddress,
    code_hash: secretBoxHash,
    msg: {
      transfer_nft: { 
        recipient,
        token_id
      },
    },
  },
  {
    gasLimit: 1_000_000,
  })

  if (tx.code === 0) {
    console.log(`NFT ${token_id} transferred to ${recipient}`)
  } else {
    console.log(`Tx error: ${tx.rawLog}`)
  }
}

export const handleGenerateKeypairs = async (
  secretjs: SecretNetworkClient,
  token_id: string,
) => {

  const tx: TxResponse = await secretjs.tx.compute.executeContract(
  {
    sender: secretjs.address,
    contract_address: secretBoxAddress,
    code_hash: secretBoxHash,
    msg: {
      generate_keypairs: {  
        token_id
      },
    },
  },
  {
    gasLimit: 1_000_000,
  })

  if (tx.code === 0) {
    console.log(`Generated keypairs for token id ${token_id}`)
  } else {
    console.log(`Tx error: ${tx.rawLog}`)
  }
}

export async function handleGeneratePermit(
  account: SecretNetworkClient,
  permitName: string,
): Promise<Permit> {
  const permit = await account.utils.accessControl.permit.sign(
    account.address,
    "secret-4",
    permitName,
    [secretBoxAddress],
    ["owner"],
    false,
  );

  console.log(`Generated permit for ${account.address}: ${JSON.stringify(permit)}`)

  return permit;
}

export async function handleQueryPrivMetadataWithPermit(
  secretjs: SecretNetworkClient,
  token_id: string,
  permit: Permit,
) {
  const msg = { with_permit: {
    permit,
    query: { 
      private_metadata: { 
        token_id,
      }
    }
  }};

  const response = (await secretjs.query.compute.queryContract({
    contract_address: secretBoxAddress,
    code_hash: secretBoxHash,
    query: msg,
  })) as PrivateMetadataResult

  console.log(`Queried private metadata with permit. Response: ${JSON.stringify(response)}`)

  return response;
}

export async function handleQueryTokens(
  secretjs: SecretNetworkClient,
) {
  const owner = secretjs.address

  const msg = { tokens: {
    owner
  }};
  
  const response = (await secretjs.query.compute.queryContract({
    contract_address: secretBoxAddress,
    code_hash: secretBoxHash,
    query: msg,
  })) as TokensResult

  console.log(`Queried token ownership for ${secretjs.address}`)
  
  return response;
}

export async function handleNftInfo(
  secretjs: SecretNetworkClient,
  token_id: string,
) {
  const msg = { nft_info: {
    token_id
  }}
  
  const response = (await secretjs.query.compute.queryContract({
    contract_address: secretBoxAddress,
    code_hash: secretBoxHash,
    query: msg,
  })) as NftInfoResult
  
  console.log(`Queried info of token_id: ${token_id}. Response: ${JSON.stringify(response)}`)

  return response
}

/** Queries the public key stored in the public metadata in the contract */
export async function queryPubKey(
  secretjs: SecretNetworkClient,
  token_id: string,
): Promise<number[]> {
  const res = await handleNftInfo(secretjs, token_id); 

  if (typeof res !== 'string') {
    // returns public metadata auth_key, ie: public key
    const pubkey = res.nft_info.extension?.auth_key
    console.log(`queried public auth_key: ${pubkey}`)
    if ( pubkey === undefined ) {
      return []
    } else {
      return pubkey
    }
  } else {
    throw Error(`returned error ${res}`)
  }
}