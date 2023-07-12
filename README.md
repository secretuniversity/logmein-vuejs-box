## LogMeIn Box

_(Brought to you by [Secret University](https://scrt.university))_


The LogMeIn Box offers a hands-on experience in implementing cryptography at the contract level, and use it as a log in tool.

This is not an entry-level box. If you are unfamiliar with the basics of instantiating a secret contract, and handling execute and query calls, we suggest doing the [Secret Counter box](https://github.com/secretuniversity/secret-counter-vuejs-box).


## Getting Started

We recommend working through this `Secret Box` in your local environment. Gitpod is not supported for this particular `Secret Box`, although we have a gitpod.yml file which may work, if you wish to try doing this on Gitpod. 

### Local Environment Setup

Use the [Setting Up Your Environment](/docs/setting-up-your-environment.md) guide to install the required infrastructure, if you haven't already. The guide will also walk you through launching the `LocalSecret` blockchain, building, testing and deploying a contract. And lastly, launching the frontend. 

Note that the guide is written with Secret Counter in mind, which is our introductory box. If you are unfamiliar with using your local environment, we recommend starting with Secret Counter first. You should then be able to follow the same steps for any Secret contract, including Secret Boxes.

After you follow the steps in the link above (on this repo, rather than the Secret Counter repo), this [guide](/app/tutorial/guide.md) should appear in your front-end app. This walks you through the steps to complete the Secret Box!

## Commands & Usage

The commands are broken into the following categories:

- working with the Secret contract
- setting up and launching the dapp

### Working with the Secret contract

The following commands are run from the root of the project, from a terminal and apply to the Secret contracts:

| Command                | Action                                                    |
|:---------------------  |:--------------------------------------------------------  |
| `make build`           | Compiles the secret contract                              |
| `make schema`          | Generates the JSON schema for messages and state files    |
| `make test`            | Runs the secret contract unit tests                       |
| `make localsecret`     | Launches the dockerized `localsecret` developer instance  |
| `make deploy`          | Stores the compiled/optimized contract on `localsecret`   |

### Setting up and launching the dapp

These commands apply to the frontend of the Secret Box and are run from the `app` directory:


| Command        | Action                                                   |
|:-------------- |:-------------------------------------------------------- |
| `yarn`         | Installs dependencies                                    |
| `yarn dev`     | Starts local Vite dev server at `http://localhost:5173`  |
| `yarn build`   | Build your production site to `./dist/`                  |
| `yarn preview` | Preview your build locally, before deploying             |

## LocalSecret LCD

`LocalSecret` implements an LCD (REST API), available on port 1317, that communicates with the Remote 
Procedure Call (RPC) endpoint and allows you to use HTTP to communicate with the node.

### Local Developer Environment

From within a local development environment, you can query and post transactions using: http://localhost:1317.

Checkout the http://localhost:1317/swagger/ UI which makes it easy to interact with the node. Or use 
http://localhost:1317/openapi/ to view the queries, transactions and parameters that are available.
 
# Resources
- [Secret Network](https://docs.scrt.network) - official Secret Network documentation and guides
- [Gitpod](https://www.gitpod.io/docs) - Gitpod documentation
- [Vite](https://vitejs.dev/guide) - Guide on using Vite, a lean and fast development server
- [Vue](https://vuejs.org) - Progressive javascript framework

# Contributors
- Laura SecretChainGirl [Github](https://github.com/secetchaingirl) - secret contract development
- DDT [Github](https://github.com/DDT5) - secret contract development
- Alex Sinplea [Github](https://github.com/sinplea) - frontend development
- Jeff SecretMickey - [Telegram](https://t.me/secretMickey) Lead UI/UX design
- Kate Unakatu [Telegram](https://t.me/unakatu) - UI/UX design and graphics (Loreum Ipsem and Geek.pics founding team member)