<script setup lang="ts">
import { SecretNetworkClient } from "secretjs"
import * as ed from '@noble/ed25519'
import { PropType } from "vue"

const props = defineProps({
  accounts: { type: Array<SecretNetworkClient>, required: true }
})

// const emit = defineEmits<{
//   (e: "formResponses", val: LmiUserInputs): void;
// }>();
async function verifySignature(
  signature: Uint8Array, 
  message: Uint8Array, 
  pubKey: Uint8Array
) {
  const isValid = await ed.verifyAsync(signature, message, pubKey);
  console.log(`checked signature valid: ${isValid}`)
}

</script>

<template>
  <div>
    <!-- <p>{{ accounts[0].address }}</p> -->
  </div>
</template>
