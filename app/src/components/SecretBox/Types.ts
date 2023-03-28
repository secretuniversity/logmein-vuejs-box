import { SecretNetworkClient, } from "secretjs"


// =========================================
// Contract interface
// =========================================
export type MintNftAnswer = {
  token_id: string,
}

export type PrivateMetadataAnswer = { 
  private_metadata: {
    token_uri: string | undefined,
    extension: Extension | undefined,
  }
}

export type NftInfoAnswer = { 
  // public metadata
  nft_info: {
    token_uri: string | undefined,
    extension: Extension | undefined,
  }
}

export type TokensAnswer = {
  token_list: {
    tokens: string[],
  }
}

type Extension = {
    // /// url to the image
    // image: string | undefined,
    // /// raw SVG image data (not recommended). Only use this if you're not including the image parameter
    // image_data: string | undefined,
    // /// url to allow users to view the item on your site
    // external_url: string | undefined,
    // /// item description
    // description: string | undefined,
    // /// name of the item
    // name: string | undefined,
    // /// item attributes
    // attributes: Vec<Trait>,
    // /// background color represented as a six-character hexadecimal without a pre-pended #
    // background_color: string | undefined,
    // /// url to a multimedia attachment
    // animation_url: string | undefined,
    // /// url to a YouTube video
    // youtube_url: string | undefined,
    // /// media files as specified on Stashh that allows for basic authenticatiion and decryption keys.
    // /// Most of the above is used for bridging public eth NFT metadata easily, whereas `media` will be used
    // /// when minting NFTs on Stashh
    // media: Vec<MediaFile> | undefined,
    // /// a select list of trait_types that are in the private metadata.  This will only ever be used
    // /// in public metadata
    // protected_attributes: Vec<string> | undefined,
    // /// token subtypes used by Stashh for display groupings (primarily used for badges, which are specified
    // /// by using "badge" as the token_subtype)
    // token_subtype: string | undefined,
    // /// represents public and privite key pair for authentication in public and private metadata respectively.
    auth_key: number[] | undefined
}

type errorResponse = string

export type PrivateMetadataResult = PrivateMetadataAnswer | errorResponse
export type NftInfoResult = NftInfoAnswer | errorResponse
export type TokensResult = TokensAnswer | errorResponse
export type QueryResult = PrivateMetadataResult | NftInfoResult | TokensResult

export type MintNftResult = MintNftAnswer | errorResponse
export type ExecuteResult = MintNftResult


// =========================================
// App UI 
// =========================================

export type UserInputs = {
  // mintNft message
  mintTokenId: AccountLevelInputs<string>,
  // for transferNft message
  transferRecipient: AccountLevelInputs<string>,
  transferTokenId: AccountLevelInputs<string>,
  // to generate keypairs
  genKeypairTokenId: AccountLevelInputs<string>,
  // for generate permit
  permitName: AccountLevelInputs<string>,
  // for permit query
  // queryTokenId: string,
  // queryPermitId: number,
  lmiTokenId: string,
  lmiPermitId: 0,
} 

type AccountLevelInputs<T> = {
  // key is the account address
  [key: string]: T;
}

export type FormRow<T = UserInputs> = {
  headerText: string
  inputs: FormInput<T>[],
  buttons: FormButton<SecretNetworkClient>[],
}

export type FormInput<T = UserInputs> = {
  field: keyof T,
  placeholderText: string,
}

export type FormButton<T> = {
  onFunction: (acc: T) => Promise<void>,// | (() => Promise<void>),
  buttonText: string,
}

// =========================================
// LogMeIn service
// =========================================

export type LoginRequest = {
  signature: Uint8Array,
  message: Uint8Array,
  tokenId: string,
}