# Logmein Box Tutorial

## Introduction

Welcome to the Logmein Box tutorial! In this tutorial, we will implement cryptography at the contract level, and use it as a log in tool. The this contract is mostly based on [this](TBC), although we implement it slightly differently in this box, particularly the front end.

We would like to note that using cryptography at the contract level can be complex for production-level dapps. Particularly, it is easy to have vulnerabilities, particularly if you don't fully understand the cryptography. Alas, this contract as it stands is definitely not suitable as a production-level contract. Our goal is to demonstrate concepts and help you learn new things to take with you to develop your own production-level dapps. We will discuss some of the issues later in the lesson, for your interest. Perhaps you could find ways to solve these issues and create an actual user-facing logmein dapp?

You can work through this Secret box using either Gitpod or your local environment. If you prefer to use your local environment, you can follow the “Getting Started” steps in the [README of this repo](https://github.com/secretuniversity/logmein-vuejs-box/blob/main/README.md) to set everything up.

## Contract overview

In our box, we have these hypothetical services:
- A web app called Secretbook, a hypothetical social media application that the user wishes to log into. From here, we will refer to our web app simply as `Secretbook` to mean "any web application that is able to accept a login using the Logmein service"
- Logmein, which is a service that sits in the middle between the user and the web app. This service could be offered by a third party (analogous to a password manager), or can be directly controlled by the user him/herself. The Logmein contract essentially implements this service.

The idea is to allow the user to log in to Secretbook by owning a Secret NFT. The The Logmein service enables users to prove ownership of the NFT without revealing their account address directly with Secretbook. This is done using a modified SNIP721 reference implementation contract (which implement's Secret Network's NFT standard with additional features). The modified NFT contract allows users to create a cryptographic keypair. The public key is stored in the public metadata, and the private key in the private metadata. 

When the user wishes to log into Secretbook, the follow steps occur:
- Secretbook randomly generates an arbitrary message and shares it with the user 
- the user connects with Logmein, which requests permission to view the private metadata
- Logmein then uses the private key stored in the private metadata to sign the message Secretbook generated, which produces a digital signature.
- The digital signature is then handed to the Secrebook to verify. Secretbook verifies the signature against the public key stored in the NFT's public metadata. If successfully verified, it means that the user indeed owns that NFT, as they would not have been able to access the private key to sign the randomly generated message otherwise.

Of course, there are some issues with this implementation, for example the need to trust the Logmein service. We will discuss this and other issues later in the lesson. But for our Secret Box exercise, our goal is to implement this design, which we can think of as the first step towards an actual login service.


## Web application overview

In addition to the contract itself, we also have a web application frontend as part of this box. We will use secret.js and Vue.js, walking through the required code to get a front end application to interact with the Secret contract. The frontend GUI design itself is intended to help developers understand the mechanics of the Logmein design. As with most of our other contract-focused boxes, the GUI is not streamlined in a way that is suitable or intended for end-users.

Of course, if you want, you can implement a GUI more suitable for an end-user facing app, which will primarily be a "pure" Web2 undertaking. We won't cover this, as our focus for ths box is the interface between the front-end and the contract, in addition to the signature verification process done by Secretbook.

## Tutorial starting point

Start by opening the Secret box on Gitpod or in your local environment. If you are using Gitpod, your environment should be properly set up and your workspace should include:
- A running LocalSecret blockchain instance
- An initial version of the contract uploaded to LocalSecret
- An incomplete web app launched, which includes this tutorial

Additionally, you should also have three terminal windows open:
- LocalSecret: The first terminal displays the blockchain starting up and producing blocks
- Secret Box workspace: The second terminal is where you will compile and deploy your contract and enter commands as you go through this tutorial
- Web application frontend: The third terminal is where you will launch your application server after LocalSecret is running and the Secret contract has been created

If you are running locally, make sure to have these three terminals open as well.

The files you will be working with are:
- src/* : these are the contract source files
- app/src/components/SecretBox/* : these are the front-end source files

In these files, look for sections marked with the comments `// complete code here`. These are the core parts of code required to implement authenticated queries.


## Logmein contract design

The Logmein contract is a modified Secret NFT. It has all the features of a SNIP721 token, with a few additions:
- it accepts an additional execute msg to generate a new keypair
- a new keypair gets generated when the token is transferred
- (optional): a keypair is automatically crated when the token is minted. 

The last item, which is optional, is not implemented in this Secret Box, although we left some incomplete code commented out for you to implement this if you are up for the challenge. Are are pros and cons to doing this. Automatically generating a keypair when a token gets minted means there will always be a keypair stored on the NFT, which may have some benefits if you definitely want to use this keypair feature.

As a modified NFT, a logical first step is to fork the SNIP721 reference implementation. This contract is a fork of the [SNIP721 reference implementation](https://github.com/baedrik/snip721-reference-impl). Specifically, this particular box forked commit ed7c59d, which was made on 4th Jan 2023.

There are probably more scalable ways than forking the SNIP721 reference contract, such as importing the SNIP721 contract or creating a mod. However, that is beyond the scope of this Secret Box.


## Exercise: Defining the GenerateKeypairs message

Our modified SNIP721 needs to accept an execute message with this JSON schema:

```json
{
    "generate_keypairs": {
        "token_id": "string",
        "entropy": "string"
    }
}
```

...where the entropy field is optional.

In other words, if a user wishes to generate a new keypair on an NFT, they send this execute message specifying the token_id and an optional entropy string which is used to randomly generate a new private and public key in the NFT metadata.

Navigate to msg.rs. Your task is to add this variant to the ExecuteMsg enum.

<details> <summary> Solution: </summary>

```rust
pub enum ExecuteMsg {
    // ...
    GenerateKeypairs {
        token_id: String,
        entropy: Option<String>,
    },
}
```
</details>

## Exercise: Adding keypair to the Extension struct

Next let's modify the token. In the token.rs file, we define the `Token` struct, which stores important information about the token. We also define the Metadata struct, which has all the information that can be stored in the token's metadata. These are part of the standard SNIP721 implementation. Notice Metadata has a field called extension, which stores on optional Extension type. In the Extension struct, let's add the ability to store the keypair required for Logmein. Let's call the field `auth_key`. This should be a 32-byte array, which represents a 256-bit number. Note a byte can be represented by a u8 type.

Your task is to add this field in the Extension type.

<details> <summary> Solution: </summary>

```rust
pub struct Extension {
    // ...
    pub auth_key: Option<[u8; 32]>
}
```
</details>

## Exercise: defining a method to add auth_key

We want the Metadata type to have a method called `add_auth_key` which accepts a 32-byte array and makes that the token's auth_key. It should not modify any existing information in the token's metadata. 

There are several ways to implement this. In our code, we have implemented this method on both Metadata and Extension. Your task is to complete this code. Note that if there is a token_uri (ie: metadata that is stored off-chain), it will throw an error.

<details> <summary> Solution: </summary>

```rust
impl Metadata {
    pub fn add_auth_key(&self, new_key: &[u8; 32]) -> StdResult<Metadata> {
        // ...

        let ext = &self.extension.clone().unwrap_or_default();

        Ok(
            Metadata {
                token_uri: None,
                extension: Some(ext.add_auth_key(new_key)),
            }
        )
    }
}

impl Extension {
    fn add_auth_key(&self, new_key: &[u8; 32]) -> Extension {
        Extension {
            auth_key: Some(*new_key),
            ..self.clone()
        }
    }
}
```
</details>

## Exercise: handling the GenerateKeypairs execute message

In the execute entry point function, we need to handle the new variant we defined in ExecuteMsg. Add that in the match arm of the execute entry point function.


<details> <summary> Solution: </summary>

```rust
    ExecuteMsg::GenerateKeypairs { token_id, entropy } => metadata_generate_keypair(
        deps,
        &info.sender, 
        env, 
        &config, 
        &token_id, 
        entropy
    )
```
</details>



## Functions that generate keypairs

We have a total of four new functions in contract.rs to handle generating keypairs. 
- metadata_generate_keypair checks that the message caller is indeed authorized to generate keypairs for the token. If so, we call the next function, metadata_generate_keypair_impl. Otherwise, we throw an error.
- metadata_generate_keypair_impl calls the generate_keypair function using the prng seed as input, then updating this seed. Then, it updates the NFT's private and public metadata with the private and public keys respectively.
- generate_keypair calls the new_entropy function to produce a random byte array based on the Optional user input and prng_seed. It then uses this byte array output to generate an ed25519 keypair using the ed25519 Rust package. 
- new_entropy takes an entropy input and the prng_seed stored in the contract as inputs. It then mixes this with some additional entropy, such as the block time and height, to produce a random 256-bit number.

> **A note of caution generating random numbers this way**
>
> Generating numbers fully on-chain is challenging to do in a secure way. Even with the ability to have a hidden prng_seed does not solve problems for all use cases. For this use case, generating random numbers like this is mostly secure. For most other applications, we recommend using Secret Networks VRF.

## Exercise: authenticating the caller

We have defined the error message. Your task is to write the logic that authenticates the message sender. The rule is to allow the following addresses to proceed:
- token_id owner 
- contract admin
- minters, only if minter_may_update_metadata (a configuration setting) is set to true


<details> <summary> Solution: </summary>

```rust
    if !( sender_raw == token.owner || sender_raw == config.admin ) {
        let minters: Vec<CanonicalAddr> =
            may_load(deps.storage, MINTERS_KEY)?.unwrap_or_default();
        if !config.minter_may_update_metadata || !minters.contains(&sender_raw) {
            return Err(StdError::generic_err(custom_err));
        }
    }
```
</details>


## Exercise: using prng_seed to call generate_keypair

Navigate to the metadata_generate_keypair_impl function. Notice there are three blocks of code to complete. Let's start with the first block, which should call the generate_keypair function using the prng_seed as input.


<details> <summary> Hint 1: </summary>
We need to call the valued stored in PRNG_SEED_KEY, which is used as an input to generate a keypair. Once we use this seed, we need to modify it so we are not reusing the same seed the next time a keypair is generated with this contract. Notice the generate_keypair function returns a new prng_seed, which we should use.
</details>

<details> <summary> Solution: </summary>

```rust
pub fn metadata_generate_keypair_impl(
    // ...
) -> StdResult<Response> {
    // generate the new public/private key pair
    let prng_seed: Vec<u8> = load(deps.storage, PRNG_SEED_KEY).unwrap();
    let (pubkey, scrtkey, new_prng_seed) = generate_keypair(env, sender, prng_seed, entropy);
    save(deps.storage, PRNG_SEED_KEY, &new_prng_seed).unwrap();

    // ...
}

pub fn instantiate(
    // ...
) -> StdResult<Response> {
    // ...
    save(deps.storage, PRNG_SEED_KEY, &prng_seed)?;
    // ... 
}

```
</details> 

## Exercise: updating the metadata

Now that we have the public and private keys, we need to update the NFT's metadata. Your task is to write the code for this.


<details> <summary> Hint 1: </summary>
We want to update the auth_key field only, and keep any other metadata unchanged. This means we need to first load the existing metadata.
</details>

<details> <summary> Hint 2: </summary>
We should use the add_auth_key method we defined earlier for the Metadata type.
</details>


<details> <summary> Hint 3: </summary>
There may be no metadata stored in the NFT. In this situation, we should create a metadata entry with default values. We will need to import token::Extension to do this.
</details>


<details> <summary> Solution for last two exercises: </summary>

```rust
use crate::token::Extension;

pub fn metadata_generate_keypair_impl(
    deps: &mut DepsMut,
    sender: &Addr,
    env: &Env,
    entropy: Option<String>,
    idx: u32,
) -> StdResult<Response> {
    // generate the new public/private key pair
    let prng_seed: Vec<u8> = load(deps.storage, PRNG_SEED_KEY).unwrap();
    let (pubkey, scrtkey, new_prng_seed) = generate_keypair(env, sender, prng_seed, entropy);
    save(deps.storage, PRNG_SEED_KEY, &new_prng_seed).unwrap();

    // update private metadata with the private key.
    let mut priv_meta_store = PrefixedStorage::new(deps.storage, PREFIX_PRIV_META);
    let maybe_priv_meta: Option<Metadata> = may_load(&priv_meta_store, &idx.to_le_bytes())?;
    let priv_meta = maybe_priv_meta.unwrap_or(
        Metadata {
            token_uri: None,
            extension: Some(Extension::default()),
        }
    );
    let new_priv_meta =  priv_meta.add_auth_key(&scrtkey.to_bytes())?;
    save(&mut priv_meta_store, &idx.to_le_bytes(), &new_priv_meta)?;

    // update public metadata with the public key
    let mut pub_meta_store = PrefixedStorage::new(deps.storage, PREFIX_PUB_META);
    let maybe_pub_meta: Option<Metadata> = may_load(&pub_meta_store, &idx.to_le_bytes())?;
    let pub_meta = maybe_pub_meta.unwrap_or(
        Metadata {
            token_uri: None,
            extension: Some(Extension::default()),
        }
    );
    let new_pub_meta =  pub_meta.add_auth_key(&pubkey.to_bytes())?;
    save(&mut pub_meta_store, &idx.to_le_bytes(), &new_pub_meta)?;


    Ok(
        Response::new().set_data(to_binary(&ExecuteAnswer::GenerateKeypairs {
            status: Success,
        })?),
    )
}

pub fn instantiate(
    // ...
) -> StdResult<Response> {
    // ...
    save(deps.storage, PRNG_SEED_KEY, &prng_seed)?;
    // ... 
}
```
</details> 

## Exercise: generating the ed25519 keypair

Your task is to generate the keypair, which involves the following steps:
- generate new prng seed, which should call the new_entropy function 
- use this prng seed as input to a ChaChaRng algorithm to generate random bytes 
- use this random bytes output to create an ed25519 keypair

<details> <summary> Hint 1: </summary>
We need to handle the fact that user entropy is an optional input. If the user did not provide entropy, we can use the prng_seed or any other substitute entropy.
</details>

<details> <summary> Hint 2: </summary>
We have already imported the ChaChaRng package. Use this to generate a seed from the entropy.
</details>

<details> <summary> Hint 3: </summary>
The ed25519_dalek::Keypair struct has an associated function called generate. Use this to generate a keypair from the seed.
</details>


<details> <summary> Solution: </summary>

```rust
pub fn generate_keypair(
    // ...
) -> (PublicKey, SecretKey, Vec<u8>) {

    // generate new rng seed
    let new_prng_bytes: [u8; 32] = match user_entropy {
        Some(s) => new_entropy(env, sender, prng_seed.as_ref(), s.as_bytes()),
        None => new_entropy(env, sender, prng_seed.as_ref(), prng_seed.as_ref()),
    };

    // generate and return key pair
    let mut rng = ChaChaRng::from_seed(new_prng_bytes);
    let keypair = Keypair::generate(&mut rng);

    (keypair.public, keypair.secret, new_prng_bytes.to_vec())
}
```
</details>

> **What is ed25519?**
>
> TBC

> **Why did we need so many steps?**
>
> The generate_keypair function involved two separate things: generating a random number and creating an ed25519 keypair.
> 
> Random number generation is a complex topic, and often vulnerable in a blockchain context. In general, generating random numbers involves two steps. Collecting entropy, and running a deterministic random byte generator (?). TBC
>
> ed25519 TBC


## Exercise: adding entropy

The final function new_entropy gathers entropy from various sources and outputs a 256-bit number. Your task is to add additional entropy then return a [u8;32] array.

<details> <summary> Hint 1: </summary>
We need to add the user entropy and seed to the rng entropy.
</details>

<details> <summary> Hint 2: </summary>
We can also add block time in nanoseconds, which is quite difficult to guess ahead of time.
</details>


<details> <summary> Solution: </summary>

```rust
pub fn new_entropy(
    // ...
)-> [u8;32] {
    // 16 here represents the lengths in bytes of the block height and time.
    let entropy_len = 16 + sender.to_string().len() + entropy.len();
    let mut rng_entropy = Vec::with_capacity(entropy_len);
    rng_entropy.extend_from_slice(&env.block.height.to_be_bytes());
    rng_entropy.extend_from_slice(&env.block.time.nanos().to_be_bytes());
    rng_entropy.extend_from_slice(sender.to_string().as_bytes());
    rng_entropy.extend_from_slice(entropy);

    let mut rng = Prng::new(seed, &rng_entropy);

    rng.rand_bytes()
}
```
</details>


## Exercise: changing keypair on ownership transfer

We want our NFT to generate a new keypair when it changes ownership. Your task is to work what code to add, andwhich function to add this to.

<details> <summary> Hint 1: </summary>
We have written this commented `// complete this code` where you should be adding code. This basically answers the question on where to add the code.
</details>

<details> <summary> Hint 2: </summary>
The code should call one of the four functions we wrote earlier in contract.rs.
</details>

<details> <summary> Solution: </summary>

```rust
fn transfer_impl(
    // ...
) -> StdResult<CanonicalAddr> {
    // ...
    metadata_generate_keypair_impl(deps, &deps.api.addr_humanize(sender)?, env, None, idx)?;
    // ...
}
```
</details>


## Redeploying contract

We have unit tests written for handle functions and some specifically focusing on the keypair generation function we added. Navigate to lib.rs and uncomment:
- mod unittest_handles
- mod unittest_auth

This would bring these two unit test mods into scope. When we run unit tests in the next step, it will ensure that our contract is working the way we intended.

Our contract is now complete. Let's make sure it compiles, then redeploy it to our local blockchain. In your second terminal, run the following commands:

```sh
# optional first line
cargo check && make test

# compile and compress the contract into a wasm bytecode
make build

# run the shellscript to upload and instantiate an updated contract
./scripts/create_secret_box.sh
```

> **Stuck? Tests failing? Not compiling?** 
>
> The complete contract and front-end app code can be found in the app/solutions folder.


The shellscript additionally changes the environment variables, such as SECRET_BOX_ADDRESS. By doing this, our front end will interact with the new contract.


-------------------------------------------------------

## Revising the frontend

Let's now switch over to the frontend webapp. 

This part of the tutorial will focus on how to use secret.js to:
- integrate a frontend app with a Secret smart contract 
- allow users to create and sign permits

In this box, we use Vue.js as our web development framework. However, our focus is on secret.js. The secret.js code should be similar, if not identical, regardless of which web framwork you choose to use. The exercises below don't cover specific Vue.js concepts, but all the source code is available for you to view for you to understand how it all sticks together. You can then apply the same logic to your preferred web framework.


### Exercise: initialize secret.js client

First, navigate to the app/src/components/SecretBox/ContractApi.ts file. This file contains all the functions related to interacting with our RichieRich smart contract. It is imported by the SecretBox.vue component, and you can see the SecretBox component is used in the App.vue top-level parent component. 

Your task is to complete the code to initialize the secret.js Secret Network client. The code here would be similar to what you do in Secret Counter Box, which is an introductory box. SecretNetworkClient is a class that contains account information and useful methods for performing transactions, queries and so on.


```ts
export const initSecretjsClient = async (accounts: SecretNetworkClient[]) => {
  //
  // complete code here
  //
  return accounts
}
```

<details> <summary> Hint 1: </summary>

You can initialize SecretNetworkClient like you would with any class in javascript/typescript:

```ts
new SecretNetworkClient({ ... })
```

The values of the fields to initialize it with is imported at the top of the file from the .env file we populated when we ran the create_secret_box.sh script. For example, localSecretUrl takes a value from the environment variables.

```ts
// Get environment variables from .env
const localSecretUrl: string = import.meta.env.VITE_LOCALSECRET_LCD
```
</details>

### Exercise: define contract api

In the same file (ContractApi.ts), you will see the functions for each message we can send to the contract. 

Complete the code for these functions.

```ts
export const handleSubmitNetworth = async (
  secretjs: SecretNetworkClient,
  networth: string
) => {
  const tx = await secretjs.tx.compute.executeContract(
  {
    sender: secretjs.address,
    contract_address: secretBoxAddress,
    code_hash: secretBoxHash,
    msg: {
      //
      // complete code here
      //
    },
  },
  {
    gasLimit: 1_000_000,
  })

  console.log("Submitted networth")
}
```

<details> <summary> Hint 1: </summary>

The message schema should match exactly with our contract. Recall we defined the valid messages in the msg.rs file of our contract. We wrote the variant names in CamelCase in Rust, but they should be in snake_case in typescript. This is because we converted them to snake_case when we serialized them:

```rust
// we had this macro in our contract to serialize our messages to snake_case
#[serde(rename_all = "snake_case")]
```

Additionally, the exact type syntax differs between Rust and Typescript. Note that CosmWasm's `Uint128` would correspond to a Typscript `string`, not `number`. However, we have already written this for you in the function input signatures. 

</details>

<details> <summary> Solution: </summary>

`handleSubmitNetworth` should have the following code. You need to do the same for the other functions, based on the valid messages we defined in msg.rs.

```ts
export const handleSubmitNetworth = async (
  secretjs: SecretNetworkClient,
  networth: string
) => {
  const tx = await secretjs.tx.compute.executeContract(
  {
    sender: secretjs.address,
    contract_address: secretBoxAddress,
    code_hash: secretBoxHash,
    msg: {
      submit_net_worth: { networth },
    },
  },
  {
    gasLimit: 1_000_000,
  })

  console.log("Submitted networth")
}
```
</details>


### Exercise: create permit

Remember that permits are signed off-chain. This means it is critical for us create a frontend to sign permits. The ContractApi.ts file also includes the function for this.

Navigate to the bottom of the file and complete the code to generate permits:

```ts
export async function handleGeneratePermit(
  account: SecretNetworkClient,
  permitName: string,
  permissions: CustomPermission[],
): Promise<Permit> {
    //
    // complete code here
    //
  // @ts-ignore
  const permit = "placeholder" as Permit

  console.log(`Generated permit for ${account.address}`)

  return permit;
}

```


<details> <summary> Hint 1: </summary>

SecretNetworkClient has a method to sign permits: 

```ts
SecretNetworkClient.utils.accessControl.permit.sign(
```

Secret.js defines the `sign` function this way:

```ts
  sign(
    owner: string,
    chainId: string,
    permitName: string,
    allowedContracts: string[],
    permissions: Permission[],
    keplr: boolean = true,
  ): Promise<Permit> {
    this._checkSigner();

    return newPermit(
      //@ts-ignore
      this.signer,
      owner,
      chainId,
      permitName,
      allowedContracts,
      permissions,
      keplr,
    );
  }
```
</details>

<details> <summary> Hint 2: </summary>

We need to use RichieRich's custom permissions for this permit. Recall the custom permissions were defined in the contract as:

```rust
pub enum RichieRichPermissions {
    AllInfo,
    AmIRichest,
}
```

We already defined the same custom permission in our SecretBox component's Types.ts file:

```ts
export type CustomPermission = "all_info" | "am_i_richest" | ""
```

CustomPermission type is already in the function input signature.

</details>


<details> <summary> Solution: </summary>

```ts
export async function handleGeneratePermit(
  account: SecretNetworkClient,
  permitName: string,
  permissions: CustomPermission[],
): Promise<Permit> {
  const permit = await account.utils.accessControl.permit.sign(
    account.address,
    "secret-4",
    permitName,
    [secretBoxAddress],
    // @ts-ignore
    permissions, // ["owner"],
    false,
  );

  console.log(`Generated permit for ${account.address}`)

  return permit;
}

```

</details>

## Using the front-end app

- At this point your front end app should look like this: ![screenshot](./illustrations/richierich-app-screenshot.png)

The app is designed to help developers understand how viewing keys and permits work by interacting with a graphical user interface (GUI). The GUI is divided into two sections:
- Account-level messages
- Query messages

The first section, account-level messages, are for execute messages (on-chain) and permit generation (off-chain). There are four sub-sections, each specific to one of the four accounts we created in our `SecretNetworkClient` initialization.

To submit net worth, enter a number in the first box and click the “Submit Networth” button. To set a viewing key, type any string as the viewing key and click “Set viewing key”. You will need to remember this key for later use.

To generate a permit, enter any string as the permit name and enter the permission which should be either `all_info` or `am_i_richest`. Recall that these are our two custom permissions that we defined. Generating permits is done by the front-end app with no interaction with the contract. If successful, you will see the newly generated permit added to the list of permits towards the bottom of the app. We index each permit generated with an integer; the first permit you generate should be numbered `1`. This is for convenience when you later perform query permits. Instead of typing the entire permit JSON, you only need to specify the index and the app pulls the correct permit to send with the query.

The contract only accepts one round. Once two players have submitted their networth, the contract will reject any further networth inputs. If you want to play another round, you can redeploy a new contract by running either script below:

```sh
# run the shellscript that deploys a new contract and sets the environment variables to point to this new contract 
./scripts/create_secret_box.sh

# does the exact same thing, but using the Makefile script we've defined
make deploybox
``` 


The second section, queries, are for performing viewing key or permit queries, and then viewing the results. These are not account-specific, as contracts cannot verify the caller for queries securely (otherwise there may not be a need for viewing keys in the first place). The query section represents “any” party who wishes to send a query message.

To perform a viewing key query, enter one of the four public addresses in the first field (e.g., `secret1ap26qrlp8mcq2pg6r47w43l0y8zkqm8a450s03`) and the viewing key that you created earlier for that specific account. When you click one of the buttons “VK Query: All Info” or “VK Query: Am I Richest”, you will see the result of your query appear at the box at the bottom of the app. Viewing keys will work for both query messages.

To perform a permit query, enter the index of the permit you created (e.g. try inputting `1` or `2`) and click either of the two "Permit Query" buttons. If the permit has the correct permission for the query type, you will see the result at the bottom box. If the permission is wrong, there will be an error. As you can see, standard implementations for permits allow more fine-grained access control. Note that you also don’t need to enter the address of the account you wish to query because the permit itself already contains the public address of the signer.


> **Is it possible to improve the user experience by allowing more than one round?**
> Yes, it is possible. If you are interested, you can improve the contract such that after taking two inputs, another round begins. You can even allow multiple rounds to run concurrently. Doing this does not increase or decrease the severity of the vulnerability described earlier. It is not difficult to implement these changes; it just requires more lines of code. It is not required for our purposes though, as we can easily instantiate new contracts each time we wish to start a new round.

> **Additional exercise: revoking permits**
>
> Notice that we do not have a revoke permit functionality in this Secret Box. A bonus exercise is to implement this functionality in this contract. We describe the steps on how to do this in our [viewing keys and permit pathway](https://scrt.university/pathways/33/implementing-viewing-keys-and-permits).


Congratulations on completing this tutorial!

We at [Secret University](https://scrt.university) hope you've not only enjoyed working through the **Exercise** steps, but that you've also learned a bit of what Secret Contracts are all about.

## Further Reading

- Our [viewing keys and permit pathway](https://scrt.university/pathways/33/implementing-viewing-keys-and-permits) discusses authenticated queries in detail. 

- If you're new to the Rust programming language, check out the [Rust Book](https://doc.rust-lang.org/book/) or the [Rustlings](https://github.com/rust-lang/rustlings) course.

- Another fun way to learn Rust that's interactive is [Tour of Rust](https://tourofrust.com).

- Secret's CosmWasm is based on vanilla CosmWasm, but there are some differences due to the privacy capabilities of the network. However, the CosmWasm [docs](https://docs.cosmwasm.com/docs/1.0/) are still an excellent resource for anyone looking to develop smart contracts in the Cosmos ecosystem.

- For connecting the frontend to Secret Network and interacting, we recommend studying the [Secret.js](https://secretjs.scrt.network/) docs.

- If you're not familiar with Javascript or Typescript, we recommend these resources: 

    - [Learn Javascript Online](https://learnjavascript.online)
    - [Learn Typescript](https://www.typescriptlang.org/docs)



> **What's the issue with this simple implementation?**
> 
> Our focus with RichieRich is to demonstrate viewing keys and permits. So these parts are secure. However, the core contract itself has a critical privacy vulnerability. A side channel attack can reveal the networth of the other user. 
>
> Let's start with the most naive implementation of all, where two users submit their networth, and are able to revise their inputs any time. Suppose one user (Alice) has submitted her networth, then the other user (Bob) can submit “dummy” inputs starting from 0 SCRT and progressively increment the amount until he sees the result switch from is_richest == False to is_richest == True. This effectively reveals Alice’s exact networth. Notice that Alice can also perform the same attack on Bob, assuming that Bob does not perform the attack first.  
>
> This attack cannot be done on the RichieRich contract, as it only allows one input per user. Once it accepts two user inputs, it stops accepting anything else. This prevents someone from entering values arbitrarily as described above. However, this exact attack can still be performed by the second user, by utilizing a side channel. Bob could create many forks of the mainnet and try different networth inputs on each, until he determines Alice’s exact networth. While this attack is more complex and only compromises the first user, it is still relatively trivial for a determined attacker. This vulnerability is also described in the Secret docs’ [description of some vulnerabilities](https://docs.scrt.network/secret-network-documentation/overview-ecosystem-and-technology/techstack/privacy-technology/theoretical-attacks#more-advanced-tx-replay-attacks-search-to-decision-for-millionaire-s-problem).
