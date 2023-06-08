# Logmein Box Tutorial

This is a fork of SNIP721 commit ed7c59d, committed on 4th Jan 2023.

```rust
    GenerateKeypairs {
        token_id: String,
        entropy: Option<String>,
    },
```

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


---------------------------

## Implementing viewing keys

Viewing keys act a bit like passwords against the public key (which are like usernames). By creating a strong viewing key, it will be computationally infeasible for someone to have unauthorized access to your account by guessing your key. 

Our contract already implements the execute functions we need. However, the queries have not yet been implemented. At this point, the contract can accept two query messages `all_info` and `am_i_richest` but simply returns a blank response to the caller.

So let's do something about it.

Begin by opening the src/msg.rs file, and find the QueryMsg enum.

```rust
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    AllInfo { 
        addr: Addr,
        key: String,
    },
    AmIRichest {
        addr: Addr,
        key: String,
    },
    //
    // complete code here
    // 
}
```

The above code defines the QueryMsg variants for our two viewing key queries. Notice they each accept two fields: addr and key. These two fields are the minimum required for any viewing key query, as these two fields are used by the contract to authenticate a viewing key. If this is not clear to you, we explain this in more detail in our [viewing keys and permit pathway](https://scrt.university/pathways/33/implementing-viewing-keys-and-permits).

We decided to have an easy start. Everything is already done here, so there is nothing further for you to do. The incomplete code is for permits, which we will do later. Just examine the code above and make sure there is nothing unclear.

### Exercise: implement get_validation_params method

Complete the code implementing the `get_validation_params` method on QueryMsg. You will see this in the src/msg.rs file, which is the incomplete code for you to work on:

```rust
impl QueryMsg {
    pub fn get_validation_params(&self) -> (/* complete code here */) {
        //
        // complete code here
        //
    }
}
```

This method should return the address and viewing key for all possible viewing key query variants in QueryMsg. It’s also a good idea to verify that the address is in a valid format, which will require an additional input field.

<details> <summary> Hint 1:</summary>

The return type should be 
```
StdResult<(Addr, String)>
```
</details>

<details> <summary> Hint 2:</summary>

The method should look at the possible variants of QueryMsg, and return the corresponding address and key. So, first line of code in the method should be:
```
        match self {
```
</details>

<details> <summary> Solution: </summary>

```rust
impl QueryMsg {
    pub fn get_validation_params(&self, api: &dyn Api) -> StdResult<(Addr, String)> {
        match self {
            Self::AllInfo { addr, key } => {
                let address = api.addr_validate(addr.as_str())?;
                Ok((address, key.clone()))
            }
            Self::AmIRichest { addr, key } => {
                let address = api.addr_validate(addr.as_str())?;
                Ok((address, key.clone()))
            },
        }
    }
}
```
</details>

A note on the `&dyn Api` syntax:

To verify that the address is in a valid format, we use `addr_validate` method of the Api trait. In order to do this, we add the `api` input field which has the type signature `&dyn Api`. If you’re unfamiliar, this is the syntax for a trait object. A trait object is a concept in Rust, and is commonly used in CosmWasm. Essentially, trait objects do not specify the required concrete type, but instead it allows the function to accept any type that implements the required trait. The concrete type can only be known at runtime. Using trait objects instead of concrete types provides more flexibility, while retaining the safety guarantees that Rust provides. One downside is that Rust’s compiler cannot check for all possible errors at compile time. Another downside is a small performance penalty, which may be significant in systems engineering but is immaterial in the context of smart contracts. If you wish to learn more, The [Rust Book](https://doc.rust-lang.org/stable/book/ch17-02-trait-objects.html) provides an in-depth explanation of trait objects.


### Exercise: validate and handle viewing key queries

Next, open the src/contract.rs file. At the query entry point function, you will find these lines of incomplete code:

Here, we need to first obtain the address and viewing key from the query message. Then, we need to check if the viewing key is valid, and handle the success and error outcomes.


```rust
    let q_response = match msg {
        QueryMsg::AllInfo { .. } => {
            //
            // complete code here
            // 
            ()
        },
        QueryMsg::AmIRichest { .. } => {
            //
            // complete code here
            // 
            ()
        },
        // ...
    };
    to_binary( /* complete code here */ "placeholder")
```

<details> <summary> Hint 1:</summary>

We should utilize the method we just defined in msg.rs. 
</details>

<details> <summary> Hint 2:</summary>

The ViewingKey struct has an associated function called `check` which verifies the viewing key.
</details>


<details> <summary> Solution: </summary>

```rust
    let q_response = match msg {
        QueryMsg::AllInfo { .. } => {
            let (address, validated_key) = msg.get_validation_params(deps.api)?;
            let result = ViewingKey::check(deps.storage, address.as_str(), validated_key.as_str());
            match result.is_ok() {
                true => query_all_info(deps, address),
                false => Err(StdError::generic_err("Wrong viewing key for this address or viewing key not set")),
            }
        },
        QueryMsg::AmIRichest { .. } => {
            let (address, validated_key) = msg.get_validation_params(deps.api)?;
            let result = ViewingKey::check(deps.storage, address.as_str(), validated_key.as_str());
            match result.is_ok() {
                true => query_richest(deps, address),
                false => Err(StdError::generic_err("Wrong viewing key for this address or viewing key not set")),
            }
        },
        // ...
    };
    to_binary(&q_response?)
```
</details>

Note that the code above has repeated parts. We wrote it this way for clarity for this lesson, but you should normally modularize your code. In this case, because both queries accept the same arguments, we can do this:

```rust
#[entry_point]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    let q_response = match msg {
        QueryMsg::AllInfo { .. } => handle_viewing_key_query(deps, &msg, query_all_info),
        QueryMsg::AmIRichest { .. } => handle_viewing_key_query(deps, &msg, query_richest),
    };

    to_binary(&q_response?)
}

fn handle_viewing_key_query(
    deps: Deps,
    msg: &QueryMsg,
    query_fn: fn(Deps, Addr) -> StdResult<Binary>,
) -> StdResult<Binary> {
    let (address, validated_key) = msg.get_validation_params(deps.api)?;
    let result = ViewingKey::check(deps.storage, address.as_str(), validated_key.as_str());
    match result.is_ok() {
        true => query_fn(deps, address),
        false => Err(StdError::generic_err(
            "Wrong viewing key for this address or viewing key not set",
        )),
    }
}
```

Imagine if there were a large number of queries, consisting of non-authenticated queries, viewing key queries and permit queries. Separating these three types of queries would be immensely helpful.


## Implementing query permits

Query permits make use of digital signatures to validate a query. The account wishing to grant access creates a permit message that includes important information such as the permissions granted, tokens, and permit name. This message is signed by the account owner, creating a cryptographic digital signature that is infeasible to forge without access to the private key. This whole process is done off-chain. The permit iself is a data structure that contains the digital signature, the plaintext permit message, and the public key of the signer.

When a user wishes to make a permit query, they send this permit along with the query message. The contract verifies the signature against the message and public key of the signer. If it is valid, it proceeds with the private query by executing the query message. 

If you want to understand how all these work in more detail, we have an in-depth discussion in our [viewing keys and permit pathway](https://scrt.university/pathways/33/implementing-viewing-keys-and-permits).

Now, let's implement query permits. 

### Exercise: define permit query messages

At this point, the only query messages the contract accepts are the two viewing key queries. Let's now define the permit query messages that our contract can accept.

Add a new variant to the QueryMsg enum called `WithPermit`. It should accept two fields: `permit` and `query`.

```rust
pub enum QueryMsg {
    AllInfo { 
        addr: Addr,
        key: String,
    },
    AmIRichest {
        addr: Addr,
        key: String,
    },
    //
    // complete code here
    // 
}
```

Additionally, we have two other enums that are incomplete. These should give you hints on what types the fields in `WithPermit` should have.

```rust
pub enum QueryWithPermit {
    //
    // complete code here
    //
}

pub enum RichieRichPermissions {
    //
    // complete code here
    //
}
```
<details> <summary> Hint 1: </summary>
The QueryWithPermit type defines the set of query messages that our contract can accept when a permit is provided. In our case, we support two query messages: AllInfo and AmIRichest. 
</details>

<details> <summary> Hint 2: </summary>
The Permit type is a generic type that represents a permit for a specific set of permissions. We don't want the default permissions that are used for SNIPs, such as balance and history. Instead, we want our custom permissions to determine which of the two queries is allowed. We use the RichieRichPermissions enum to define this set of custom permissions that our contract supports.
</details>

<details> <summary> Solution: </summary>

```rust
pub enum QueryMsg {
    //...
    WithPermit {
        permit: Permit<RichieRichPermissions>,
        query: QueryWithPermit,
    },
}

pub enum QueryWithPermit {
    AllInfo {  },
    AmIRichest {  },
}

pub enum RichieRichPermissions {
    AllInfo,
    AmIRichest,
}
```

</details>

In our solution, RichieRichPermissions defines which of the two queries is allowed with a given permit. So, if the permit has the AmIRichest permission, the caller cannot query `am_i_richest`.

An alternative design is to have two variants along the lines of `AnyQuery` and `ResultOnly`. The first permission allows the caller to perform either query, while the second only allows the `am_i_richest` query. 

### Exercise: handle permit queries

Now let's look at src/contract.rs. The first thing to do is to add our new variant to the match arm in the query entry point.

```rust
#[entry_point]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    let q_response = match msg {
        // ...

        //
        // complete code here
        // 
    };

    to_binary( /* complete code here */ "placeholder")
}
```

<details> <summary> Hint 1: </summary>
This arm should call the `permit_queries` function. 
</details>

Now let's complete the permit_queries function, which has the bulk of the logic required to process permit queries.

```rust
fn permit_queries(deps: Deps, env: Env, permit: Permit /* add generic */, query: QueryWithPermit) -> (/* complete code here */) {
    // Validate permit content
    let contract_address = env.contract.address;
        //
        // complete code here
        // 

    // Permit validated! We can now execute the query.
        //
        // complete code here
        // 

}
```
<details> <summary> Hint 2: </summary> The permit argument should have a generic type parameter for RichieRichPermissions. This specifies that the permit is for the RichieRichPermissions type. </details>

<details> <summary> Hint 3: </summary> To validate the permit content, we can use the secret_toolkit::permit::validate function. This function takes in several arguments including deps, PREFIX_REVOKED_PERMITS, &permit, contract_address.into_string(), and None. It returns the account associated with the permit if validation is successful. </details>

<details> <summary> Hint 4: </summary> After the permit is validated, we can execute the query by matching on the query argument. For each variant of the QueryWithPermit enum, we need to check if the permit has the required permission using the check_permission method. If it does, we can call the appropriate query function. If it does not, we can return an error indicating that the permit does not have the required permission. </details>


<details> <summary> Solution: </summary>

```rust
fn permit_queries(deps: Deps, env: Env, permit: Permit<RichieRichPermissions>, query: QueryWithPermit) -> StdResult<QueryAnswer> {
    // Validate permit content
    let contract_address = env.contract.address;

    let account = secret_toolkit::permit::validate(
        deps,
        PREFIX_REVOKED_PERMITS,
        &permit,
        contract_address.into_string(),
        None,
    )?;

    // Permit validated! We can now execute the query.
    match query {
        QueryWithPermit::AllInfo {} => {
            if !permit.check_permission(&RichieRichPermissions::AllInfo) {
                return Err(StdError::generic_err(format!(
                    "No permission to query, got permissions {:?}",
                    permit.params.permissions
                )));
            }

            query_all_info(deps, deps.api.addr_validate(&account)?)
        }
        QueryWithPermit::AmIRichest {  } => {
            if !permit.check_permission(&RichieRichPermissions::AmIRichest) {
                return Err(StdError::generic_err(format!(
                    "No permission to query, got permissions {:?}",
                    permit.params.permissions
                )));
            }

            query_richest(deps, deps.api.addr_validate(&account)?)
        }
    }
}
```
</details>


## Redeploying contract

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

**(Optional)** You can interact with the contract using secretcli if you want. For example, you can have two users input their networth and perform a viewing key query. 

```sh
# get the new environment variables
source .env

# execute messages using the secretcli binary in our docker file
# submit networth for user `a` 
docker exec localsecret secretcli tx compute execute $SECRET_BOX_ADDRESS '{"submit_net_worth":{"networth":"100"}}' --from a -y


# submit networth for user `b` 
docker exec localsecret secretcli tx compute execute $SECRET_BOX_ADDRESS '{"submit_net_worth":{"networth":"500"}}' --from b -y


# set viewing key for user `a`
docker exec localsecret secretcli tx compute execute $SECRET_BOX_ADDRESS '{"set_viewing_key":{"key":"super_secret_key"}}' --from a -y

# perform viewing key query for user `a`
USER_A=$(docker exec localsecret secretcli keys show --address a)

docker exec localsecret secretcli q compute query $SECRET_BOX_ADDRESS '{"all_info":{"addr":"'"$USER_A"'", "key":"super_secret_key"}}'
```

You should see something like this:
```bash
{"AllInfo":{"richest":false,"networth":"100"}}
```



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
