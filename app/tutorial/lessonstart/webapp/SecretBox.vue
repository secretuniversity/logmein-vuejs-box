<script setup lang="ts">
import { onMounted, ref, reactive,  } from 'vue'
import { SecretNetworkClient, Permit,  } from "secretjs"
import { 
  handleGenerateKeypairs, handleMintNft, handleTransferNft,
  handleGeneratePermit, 
  initSecretjsClient,
  handleQueryTokens,
queryPubKey,
} from "./ContractApi"
import type { 
  UserInputs, FormRow,
  TokensAnswer,
LoginRequest,
} from './Types'
import LogmeinService from './LogmeinService.vue'


const showAppContract= ref(true)
const showAppLmiService = ref(true)
let accounts: SecretNetworkClient[] = reactive([])

onMounted(async () => {
  window.addEventListener('scroll', handleScroll)

  // To create signer secret.js clients
  console.log("Initializing Secret.js client ...")
  accounts = await initSecretjsClient(accounts)
})

const props = defineProps<{
  title: string
}>()

function isLight() {
  return localStorage.getItem('theme') === 'light'
}

function isDark() {
  return localStorage.getItem('theme') === 'dark'
}

function handleScroll() {
  if (showAppContract) {
    // To collapse App when user scrolls:
    // showApp.value = false
  }
}

// -------------------

const loginRequest: LoginRequest = reactive({
  signature: Uint8Array.from([]),
  message: Uint8Array.from([]),
  tokenId: '',
})

/** The form inputs and buttons for contract execute functions
 * and generate permit (ie: those that require signing with private key)
 */
const formExecRows = reactive<FormRow[]>([{
    headerText: "Mint NFT",
    inputs: [{
      field: 'mintTokenId',
      placeholderText: "optional token id"
    }],
    buttons: [{
        onFunction: onMint, 
        buttonText: "Mint NFT",
    }]
  },
  {
    headerText: "Transfer NFT",
    inputs: [{
      field: 'transferRecipient',
      placeholderText: "account address",
    },
    {
      field: 'transferTokenId',
      placeholderText: "token_id",
    }
  ],
    buttons: [{
        onFunction: onTransferNft, 
        buttonText: "Transfer NFT",
    }]
  },
  {
    headerText: "Generate keypair",
    inputs: [{
        field: 'genKeypairTokenId',
        placeholderText: "token_id",
      }],
    buttons: [{
        onFunction: onGenerateKeypairs,  
        buttonText: "Generate keypair",
    }]
  },
  {
    headerText: "Generate permit",
    inputs: [{
        field: 'permitName',
        placeholderText: "Permit name",
      }],
    buttons: [{
        onFunction: onGeneratePermit,  
        buttonText: "Sign permit",
    }]
  },
])

/** The form inputs and buttons for contract query functions */
const formQueryRows = reactive<FormRow[]>([
  {
    headerText: "Update token ownership data and public key data",
    inputs: [],
    buttons: [{
        onFunction: onUpdateButton,  
        buttonText: "Query token data",
      }],
  }
])

/// selectively decide when to display forms depending on account and formRow
let renderForm = (account: string, formRow: FormRow) => {
  if (formRow.headerText === "Mint NFT" && account !== accounts[0].address) {
    return false
  } else {
    return true
  }
}

let inputs: UserInputs = reactive({
  mintTokenId: {},
  transferRecipient: {},
  transferTokenId: {},
  genKeypairTokenId: {},
  permitName: {},
  // queryTokenId: '',
  // queryPermitId: 0,
  lmiTokenId: '',
  lmiPermitId: 0,
})

let contractResponse = reactive({
  tokenList: {
      // account0: [''],
      // account1: [''],
      account0: {token_list: {tokens: []}} as TokensAnswer,
      account1: {token_list: {tokens: []}} as TokensAnswer,
    },
  
  // privMetadata: {
  //   private_metadata: {
  //     token_uri: undefined,
  //     extension: undefined,
  //   }
  // } as PrivateMetadataAnswer,

  permits: [{
    params: {
        permit_name: 'Unsigned permit',
        allowed_tokens: [''],
        chain_id: '',
        permissions: ['allowance'], // we need owner for this permit to work. Allowance set here to effectively have no permit
    },
    signature: {
      pub_key: {
        type: '',
        value: '',
      },
      signature: '<blank>',
    },
  }] as Permit[],
})
// // init contractResponse
// contractResponse.privMetadata = {
//   private_metadata: {
//     token_uri: undefined,
//     extension: undefined,
//   }
// }

async function onMint(acc: SecretNetworkClient) {
  await handleMintNft(acc, inputs.mintTokenId[acc.address])  
  inputs.mintTokenId[acc.address] = ''
}

async function onTransferNft(acc: SecretNetworkClient) {
  // const acc = accounts[0]
  await handleTransferNft(acc, inputs.transferRecipient[acc.address], inputs.transferTokenId[acc.address])
  inputs.transferRecipient[acc.address] = ''
  inputs.transferTokenId[acc.address] = ''
}

async function onGeneratePermit(acc: SecretNetworkClient): Promise<void> {
  // const acc = accounts[0]
  const res = await handleGeneratePermit(acc, inputs.permitName[acc.address])
  inputs.permitName[acc.address] = ''
  contractResponse.permits.push(res)
}

async function queryTokens() {
  const res0 = await handleQueryTokens(accounts[0]); 
  const res1 = await handleQueryTokens(accounts[1]); 
  if (typeof res0 === "string" || typeof res1 === "string") {
    throw Error("Token ownership query returned error")
  } else {
    const tokenList = {
      // account0: res0.token_list.tokens,
      // account1: res1.token_list.tokens,
      account0: res0,
      account1: res1,
    }
    contractResponse.tokenList = tokenList
    return tokenList
  }
}

async function onGenerateKeypairs(acc: SecretNetworkClient) {
  const res = await handleGenerateKeypairs(acc, inputs.genKeypairTokenId[acc.address])
  inputs.genKeypairTokenId[acc.address] = ''
}

async function getAllPubKeys() {
  // const _tableData: TableData[] = []
  tableData.value = []
  for (const key in contractResponse.tokenList) {
    const accountInfo = contractResponse.tokenList[key as keyof typeof contractResponse.tokenList];
    for (const tokenId of accountInfo.token_list.tokens) {
      const pubKey = await queryPubKey(accounts[0], tokenId)
      // _tableData.push({
      tableData.value.push({
        tokenId,
        pubKey
      })
    }
  }
  // Convert to refs to ensure reactivity works properly
  // tableData= reactive(_tableData) as TableData[]
}

type TableData = {
  tokenId: string,
  pubKey: number[],
}

let tableData = ref([] as TableData[])

async function onUpdateButton() {
  const tokenList = await queryTokens()
  await getAllPubKeys()
}

// if not connected to smart contract: ------------

// let submitted = {

// }


</script>

<template>
  <div class="border border-gray-400 rounded-md pt-2 px-6 mb-3">
    <div class="grid items-center grid-cols-2">
      <div class="flex pb-2 self-center">
        <img src="../../assets/title_star.svg" alt="Richie Rich app">
        <h2 class="ml-2 text-2xl font-medium tracking-widest text-[#200E32] dark:text-white">Contract Interface</h2>
      </div>

      <img @click="showAppContract = false" class="justify-self-end cursor-pointer" v-if="showAppContract && isLight()" src="../../assets/up.svg" alt="Hide application">
      <img @click="showAppContract = true" class="justify-self-end cursor-pointer" v-if="!showAppContract && isLight()" src="../../assets/down.svg" alt="Show application">

      <img @click="showAppContract = false" class="justify-self-end cursor-pointer" v-if="showAppContract && isDark()" src="../../assets/up_white.svg" alt="Hide application">
      <img @click="showAppContract = true" class="justify-self-end cursor-pointer" v-if="!showAppContract && isDark()" src="../../assets/down_white.svg" alt="Show application">
    </div>

    <div v-if="showAppContract">
      <div v-for="account in accounts.slice(0,2)">
        <h2 class="mt-4">Account: {{ account.address }}</h2>
        <div v-for="row in formExecRows" class="w-full justify-items-center mt-2 ml-4 mb-4">
          <div v-if="renderForm(account.address, row)">
            <p class="italic mb-2">{{ row.headerText }}</p>
            <form @submit.prevent=row.buttons[0].onFunction(account)>
              <div class="grid grid-cols-3 grid-flow-col h-full leading-none">
                <input v-for="input in row.inputs" 
                  :class='row.inputs.length !== 2 
                    ? "col-span-2 rounded-md ml-4 outline" 
                    : "rounded-md ml-4 outline"'
                  :placeholder=input.placeholderText
                  v-model="//@ts-ignore implicit any for second field
                    inputs[input.field][account.address]"
                >
                <button class="w-4/5 bg-box-yellow dark:bg-gray-500 self-center px-1 py-1 rounded-md ml-4"> 
                  {{ row.buttons[0].buttonText }} 
                </button>
              </div>
            </form>
          </div>
        </div>
        <hr class="border-gray-300">
      </div>

      <h1 class="text-xl font-bold mt-5">Queries</h1>
      <div v-for="qrow in formQueryRows" class="w-full justify-items-center mt-4 ml-4 mb-4">
        <p class="italic mb-2">{{ qrow.headerText }}</p>
        <div class="grid grid-cols-3 grid-flow-col h-full leading-none">
          <input v-for="input in qrow.inputs" 
            class="rounded-md ml-4 outline"
            :placeholder=input.placeholderText
            v-model="inputs[input.field]"
          >
        </div>
        <div class="grid grid-cols-3 mt-2 mb-2">
          <button v-for="button in qrow.buttons"
            @click=button.onFunction
            class="w-4/5 col-start-3 bg-box-yellow dark:bg-gray-500 self-center px-1 py-1 rounded-md ml-4 mt-1 mb-1"> 
            {{ button.buttonText }} 
          </button>
        </div>
      </div>

      <p class="font-semibold">Permits
        <span class="text-sm font-normal">(These are stored on the front-end client, not on-chain):</span>
      </p>
      <ol start="0" class="list-decimal list-inside text-left text-xs mb-6"> 
        <li v-for="(permit, id) in contractResponse.permits">
          Permit name: {{ permit.params.permit_name }}; Signature: {{ permit.signature.signature }}
        </li>
      </ol>

      <div class="rounded-md outline text-center ml-3 mt-10 mb-10 py-3 bg-yellow-50 dark:bg-gray-800">
        <p class="font-semibold ">Tokens minted:</p>
        <p>{{ contractResponse.tokenList }}</p>
        <table class="table-auto border border-collapse mt-8 mx-3 border-gray-400">
          <thead>
            <tr>
              <th class="border border-gray-400 px-4 py-2">token_id</th>
              <th class="border border-gray-400 px-4 py-2">Public auth_key</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in tableData" :key="entry.tokenId">
              <td class="border border-gray-400 px-4 py-2">{{ entry.tokenId }}</td>
              <td class="border border-gray-400 px-4 py-2 text-xs">{{ entry.pubKey }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="border border-gray-400 rounded-md pt-2 px-6 mb-3">
    <div class="grid items-center grid-cols-2">
      <div class="flex pb-2 self-center">
        <img src="../../assets/title_star.svg" alt="Richie Rich app">
        <h2 class="ml-2 text-2xl font-medium tracking-widest text-[#200E32] dark:text-white">Log Me In</h2>
      </div>

      <img @click="showAppLmiService = false" class="justify-self-end cursor-pointer" v-if="showAppLmiService && isLight()" src="../../assets/up.svg" alt="Hide application">
      <img @click="showAppLmiService = true" class="justify-self-end cursor-pointer" v-if="!showAppLmiService && isLight()" src="../../assets/down.svg" alt="Show application">

      <img @click="showAppLmiService = false" class="justify-self-end cursor-pointer" v-if="showAppLmiService && isDark()" src="../../assets/up_white.svg" alt="Hide application">
      <img @click="showAppLmiService = true" class="justify-self-end cursor-pointer" v-if="!showAppLmiService && isDark()" src="../../assets/down_white.svg" alt="Show application">
    </div>

    <div v-if="showAppLmiService">
      <LogmeinService :accounts="accounts" :permits="contractResponse.permits" />
    </div>
  </div>

</template>
