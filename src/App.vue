<script setup lang="ts">
import CodeMirror from "./components/CodeMirror.vue";
import { computed, ref, watch } from "vue";
import { gen } from "./gen";

let defaultCode = `
const secretSchema = /* #__DISPOSE__ */{
  fields: {
    name: { type: "string" },
    age: { type: 'number' },
    tel: { type: 'string' },
  },
}

const tokens = /* #__DISPOSE__ */[
  "token1",
  "token2",
  "token3",
  "token4",
  "token5",
  ...sys.tokens
]

// ---------------------------------
// MAIN FUNCTION

function test() {
  const [,secondToken,, ...restTokens] = tokens
  printToken(secondToken, restTokens)
  
  // ---------------------------------

  const source1 = /* #__PURE__ */ createRPCClient();
  const source1$schema = secretSchema;
  
  const { name: $nameField, ...restFields } = source1$schema.fields
  printRestFields(restFields)
  
  // ---------------------------------
  
  effect($nameField.type)
  effect($nameField.title || 'name')
  effect(source1$schema.fields.age)
  
  return (
    $nameField.type === 'string' ? h('textInput') :
    $nameField.type === 'number' ? h('numberInput') :
    null
  )
}
`

let code = ref(localStorage.getItem("lastCode") || defaultCode);
let minifiedCode = computed(() => gen(code.value));
watch(code, () => {
  localStorage.setItem("lastCode", code.value);
});

const reset = () => {
  localStorage.removeItem("lastCode");
  code.value = defaultCode;
};
</script>

<template>
  <CodeMirror v-model:code="code" />
  <button @click="reset">reset</button>
  <CodeMirror :code="minifiedCode" />
</template>
