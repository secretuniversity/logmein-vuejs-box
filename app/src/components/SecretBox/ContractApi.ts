import { Wallet, SecretNetworkClient, Permit, fromUtf8 } from "secretjs"
import type {
  PrivateMetadataResult, MintNftResult, 
  ExecuuteResult, QueryResult,
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
) => {

  const tx = await secretjs.tx.compute.executeContract(
  {
    sender: secretjs.address,
    contract_address: secretBoxAddress,
    code_hash: secretBoxHash,
    msg: {
      mint_nft: {  },
    },
  },
  {
    gasLimit: 1_000_000,
  })

  console.log(`Minted NFT ${fromUtf8(tx.data[0])}`)
}

export const handleTransferNft = async (
  secretjs: SecretNetworkClient,
  recipient: string,
  tokenId: string,
) => {
  const tx = await secretjs.tx.compute.executeContract(
  {
    sender: secretjs.address,
    contract_address: secretBoxAddress,
    code_hash: secretBoxHash,
    msg: {
      transfer_nft: { 
        recipient,
        tokenId
      },
    },
  },
  {
    gasLimit: 1_000_000,
  })

  console.log(`NFT ${tokenId} transferred to ${recipient}`)
}

export const handleGenerateKeypairs = async (
  secretjs: SecretNetworkClient,
  tokenId: string,
) => {

  const tx = await secretjs.tx.compute.executeContract(
  {
    sender: secretjs.address,
    contract_address: secretBoxAddress,
    code_hash: secretBoxHash,
    msg: {
      generate_keypairs: {  
        tokenId
      },
    },
  },
  {
    gasLimit: 1_000_000,
  })

  console.log(`Generated keypairs for token id ${tokenId}`)
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

  console.log(`Generated permit for ${account.address}`)

  return permit;
}

export async function handleQueryPrivMetadataWithPermit(
  secretjs: SecretNetworkClient,
  tokenId: string,
  permit: Permit,
) {
  const msg = { with_permit: {
    permit,
    query: { 
      private_metadata: { 
        tokenId,
      }
    }
  }};

  const response = (await secretjs.query.compute.queryContract({
    contract_address: secretBoxAddress,
    code_hash: secretBoxHash,
    query: msg,
  })) as PrivateMetadataResult

  console.log("Queried private metadata with permit")

  return response;
}

