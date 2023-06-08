<script setup lang="ts">
import * as ed from '@noble/ed25519'
import { FormRow, LoginRequest, UserInputs } from './Types'
import { handleQueryPrivMetadataWithPermit, queryPubKey } from './ContractApi';
import { Permit, SecretNetworkClient } from 'secretjs';
import { reactive, ref, } from "vue"


const props = defineProps<{
  accounts: SecretNetworkClient[];
  permits: Permit[];
}>();

let loginRequest = reactive({} as LoginRequest)

const formRows = reactive<FormRow<LmiUserInputs>[]>([{
    headerText: "Create LogMeIn signature",
    inputs: [{
      field: 'lmiTokenId',
      placeholderText: "enter token id",
    },
    {
      field: 'lmiPermitId',
      placeholderText: "enter permit id number",
    }],
    buttons: [{
      onFunction: onButtonClicked,
      buttonText: "Create signature with LogMeIn, and attempt to sign in to Secretbook app",
    }],
  }
])


type LmiUserInputs = Pick<UserInputs, 'lmiTokenId' | 'lmiPermitId'>

let inputs: LmiUserInputs = reactive({
  lmiTokenId: '',
  lmiPermitId: 0,
})

async function queryAuthKey() {
  const acc = props.accounts[0]
  const res = await handleQueryPrivMetadataWithPermit(
    acc, 
    inputs.lmiTokenId, 
    props.permits[inputs.lmiPermitId]
  )
  
  if (typeof res === 'string') {
    console.log(`failed to query private metadata: ${res}`)
  } else {
    return res.private_metadata.extension?.auth_key
  }
}

async function lmiSign() {
  // const privKey = ed.utils.randomPrivateKey(); // Secure random private key
  const privKey = await queryAuthKey()

  if (typeof privKey === 'undefined') {
    throw Error("Failed to log in. Could not query auth key, likely because permit is invalid")
  } 

  const message = Uint8Array.from([0xab, 0xbc, 0xcd, 0xde]);
  const signature = await ed.signAsync(message, Uint8Array.from(privKey));

  console.log(`created signature: ${signature}`)
  console.log(`the public key should be ${await ed.getPublicKeyAsync(Uint8Array.from(privKey))}`)

  return {
    signature,
    message,
    tokenId: inputs.lmiTokenId,
  } as LoginRequest
}

async function verifySignature(
  signature: Uint8Array, 
  message: Uint8Array, 
  pubKey: Uint8Array
) {
  const isValid = await ed.verifyAsync(signature, message, pubKey);
  return isValid
}

const verifyLogin = async (
  loginRequest: LoginRequest,
) => {
  console.log(`verifying login for token_id: ${loginRequest.tokenId}; with signature: ${loginRequest.signature}; message: ${loginRequest.message}`)
  const pubKey = await queryPubKey(props.accounts[0], loginRequest.tokenId)
  if (pubKey !== undefined ) {
    const isValid = await verifySignature(
      loginRequest.signature,
      loginRequest.message,
      Uint8Array.from(pubKey),
    )
    console.log(`checked signature valid: ${isValid}`)
    loginAttemptResult.value = isValid
    return isValid
  } else {
    throw Error("failed to verify signature: could not determine if valid or not")
  }
}

let loginAttemptResult = ref(false)

async function onButtonClicked() {
  // to make sure that app renders success or failure even if LMI fails to sign, eg: if permit is invalid
  loginRequest.tokenId = inputs.lmiTokenId
  loginAttemptResult.value = false

  // LMI generates signature
  loginRequest = await lmiSign()

  // Third Party App verifies siganture
  verifyLogin(loginRequest)
}

</script>

<template>
  <h1 class="text-xl font-bold mt-5">Log Me In service</h1>
  <div v-for="row in formRows" class="w-full justify-items-center mt-4 ml-4 mb-4">
    <p class="italic mb-2">{{ row.headerText }}</p>
    <div class="grid grid-cols-3 grid-flow-col h-full leading-none">
      <input v-for="input in row.inputs" 
        class="rounded-md ml-4 outline"
        :placeholder=input.placeholderText
        v-model="inputs[input.field]"
      >
    </div>
    <div class="grid grid-cols-3 mt-2 mb-2">
      <button v-for="button in row.buttons"
        @click=button.onFunction
        class="w-4/5 col-start-3 bg-box-yellow dark:bg-gray-500 self-center px-1 py-1 rounded-md ml-4 mt-1 mb-1"> 
        {{ button.buttonText }} 
      </button>
    </div>
  </div>

  <hr class="border-gray-300">
  
  <div>
    <h1 class="text-xl font-bold mt-5">Secretbook app</h1>
    <p>Secretbook is a hypothetical social media application where users can create personal profiles and share their life stories, post memes and chat with friends.</p>
    <p class="mt-8 text-center">Attempted to log in with token_id: {{ loginRequest.tokenId }}</p>
    <div v-if="loginAttemptResult !== null" class="flex justify-center mt-1 mb-5">
    <div :class="{ 'bg-green-100': loginAttemptResult, 'bg-red-100': !loginAttemptResult }" class="p-4 rounded-lg">
      <p :class="{ 'text-green-700': loginAttemptResult, 'text-red-700': !loginAttemptResult }" class="font-medium">
        {{ loginAttemptResult ? 'Login success' : 'Login failed' }}
      </p>
    </div>
  </div>
  </div>
</template>
