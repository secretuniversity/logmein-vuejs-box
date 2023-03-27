<script setup lang="ts">
import { reactive } from 'vue'
import * as ed from '@noble/ed25519'
import { FormRow, UserInputs } from './Types'
import { handleQueryPrivMetadataWithPermit } from './ContractApi';
import { Permit, SecretNetworkClient } from 'secretjs';

const props = defineProps<{
  accounts: SecretNetworkClient[];
  permits: Permit[];
}>();

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
      onFunction: onLmiSign,  
      buttonText: "Create signature with LogMeIn",
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

async function onLmiSign() {
  // const privKey = ed.utils.randomPrivateKey(); // Secure random private key
  const privKey = await queryAuthKey()

  if (typeof privKey === 'undefined') {
    throw Error("auth key query error")
  } 

  const message = Uint8Array.from([0xab, 0xbc, 0xcd, 0xde]);
  const signature = await ed.signAsync(message, Uint8Array.from(privKey));
  console.log(`created signature: ${signature}`)
}

</script>

<template>
  <h1 class="text-xl font-bold mt-5">Queries</h1>
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
</template>
