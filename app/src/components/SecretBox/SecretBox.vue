<script setup lang="ts">
import { onMounted, ref, reactive, computed } from 'vue'
import { SecretNetworkClient, Permit } from "secretjs"
import { 
  handleGenerateKeypairs, handleMintNft, handleQueryPrivMetadataWithPermit, handleTransferNft,
  handleGeneratePermit, 
  initSecretjsClient,
} from "./ContractApi"
import type { 
  UserInputs, FormRow,
  QueryResult,
} from './Types'


const showApp = ref(true)
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
  if (showApp) {
    // To collapse App when user scrolls:
    // showApp.value = false
  }
}

// -------------------

/** The form inputs and buttons for contract execute functions
 * and generate permit (ie: those that require signing with private key)
 */
const formExecRows = reactive<FormRow[]>([{
    headerText: "Execute functions",
    inputs: [  ],
    buttons: [{
        onFunction: onMint, 
        buttonText: "Mint NFT",
    }]
  },
  {
    headerText: "",
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
const formQueryRows = reactive<FormRow[]>([{
    headerText: "Permit queries",
    inputs: [{
        field: 'queryTokenId',
        placeholderText: "enter token id",
    },
    {
        field: 'permitId',
        placeholderText: "enter permit id number",
    }],
    buttons: [{
        onFunction: onQueryPrivMetadataWithPermit,  
        buttonText: "Permit Query: private metadata",
      }],
  },
])

let inputs: UserInputs = reactive({
  transferRecipient: {},
  transferTokenId: {},
  genKeypairTokenId: {},
  permitName: {},
  queryTokenId: '',
  permitId: 0,
})


let contractResponse = reactive({
  query: {
    token_uri: undefined,
    extension: undefined,
  } as QueryResult,

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
// init contractResponse
contractResponse.query=''

async function onMint(acc: SecretNetworkClient) {
  await handleMintNft(acc)  
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

async function onQueryPrivMetadataWithPermit() {
  const acc = accounts[0]
  const res = await handleQueryPrivMetadataWithPermit(acc, inputs.queryTokenId, contractResponse.permits[inputs.permitId])
  contractResponse.query = res
}

async function onGenerateKeypairs(acc: SecretNetworkClient) {
  const res = await handleGenerateKeypairs(acc, inputs.genKeypairTokenId[acc.address])
}

// if not connected to smart contract: ------------

// let submitted = {

// }


</script>

<template>
  <div class="grid items-center grid-cols-2">
    <div class="flex pb-2 self-center">
      <img src="../../assets/title_star.svg" alt="Richie Rich app">
      <h2 class="ml-2 text-2xl font-medium tracking-widest text-[#200E32] dark:text-white"></h2>
    </div>

    <img @click="showApp = false" class="justify-self-end cursor-pointer" v-if="showApp && isLight()" src="../../assets/up.svg" alt="Hide application">
    <img @click="showApp = true" class="justify-self-end cursor-pointer" v-if="!showApp && isLight()" src="../../assets/down.svg" alt="Show application">

    <img @click="showApp = false" class="justify-self-end cursor-pointer" v-if="showApp && isDark()" src="../../assets/up_white.svg" alt="Hide application">
    <img @click="showApp = true" class="justify-self-end cursor-pointer" v-if="!showApp && isDark()" src="../../assets/down_white.svg" alt="Show application">
  </div>

  <div v-if="showApp">
    <h1 class="text-xl font-bold mt-10">Contract Interface</h1>
    <div v-for="account in accounts.slice(0,2)">
      <h2 class="mt-4">Account: {{ account.address }}</h2>
      <div v-for="row in formExecRows" class="w-full justify-items-center mt-2 ml-4 mb-4">
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
            <button class="w-4/5 bg-box-yellow self-center px-1 py-1 rounded-md ml-4"> 
              {{ row.buttons[0].buttonText }} 
            </button>
          </div>
        </form>
      </div>
      <hr class="border-gray-300">
    </div>
  </div>

  <!-- <div v-if="showApp">
    <h1 class="text-xl font-bold mt-10">Account-level messages</h1>
    <div v-for="account in accounts">
      <h2 class="mt-4">Account: {{ account.address }}</h2>
      <div v-for="row in formExecRows" class="w-full justify-items-center mt-2 ml-4 mb-4">
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
            <button class="w-4/5 bg-box-yellow self-center px-1 py-1 rounded-md ml-4"> 
              {{ row.buttons[0].buttonText }} 
            </button>
          </div>
        </form>
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
          class="w-4/5 col-start-3 bg-box-yellow self-center px-1 py-1 rounded-md ml-4 mt-1 mb-1"> 
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

    <div class="rounded-md outline text-center ml-3 mt-10 mb-10 py-3 bg-yellow-50">
      <p class="font-semibold ">Query response:</p>
      <p>{{ contractResponse.query }}</p>
    </div>
    
  </div> -->
</template>
