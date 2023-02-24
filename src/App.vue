<script setup lang="ts">
import CodeMirror from "./components/CodeMirror.vue";
import { computed, ref, watch } from "vue";
import { gen } from "./gen";

let defaultCode = `
function test() {
  const source1$schema = /* #__DISPOSE__ */{
    fields: {
      name: { type: "string" },
      age: { type: 'number' + /* #__PURE__ */a() },
    }
  }
  const source1 = {
    data: {},
  }
  
  const $nameField = source1$schema.fields.name
  effect($nameField.type)
  effect($nameField.title || 'name')

  /* #__PURE__ */removeMe()
  effect(source1$schema.fields.age)
  
  return (
    $nameField.type === 'string' ? h('textInput') :
    $nameField.type === 'number' ? h('numberInput') :
    null
  )
}

`;

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
