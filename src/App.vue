<script setup lang="ts">
import CodeMirror from './components/CodeMirror.vue';
import { computed, ref, watch } from 'vue';
import { gen } from './gen.js';

let defaultCode = `
const secretSchema = /* #__DISPOSE__ */ {
  fields: {
    name: { type: "string" },
    age: { type: "number" },
    tel: { type: "string" },
  },
};

const tokens = /* #__DISPOSE__ */ ["token1", "token2", "token3", "token4", "token5", ...sys.tokens];

// ---------------------------------
// MAIN FUNCTION

function test() {
  const [, secondToken, , ...restTokens] = tokens;
  printToken(secondToken);
  printMoreTokens(restTokens);

  // ---------------------------------

  const source1 = /* #__PURE__ */ createRPCClient();
  const source1$schema = secretSchema;

  const { name: $nameField, ...restFields } = source1$schema.fields;
  printRestFieldIds(Object.keys(restFields));
  printRestFields(restFields);

  // ---------------------------------

  log('[name] type: ' + $nameField.type);
  log('[name] title: ' + ($nameField.title || "name"));
  log('[age]:', source1$schema.fields.age);

  // ----------------------------------

  return renderInput($nameField.type, { title: ($nameField.title || "name") })
}


/*#__DISPOSE__*/
function renderInput(type, props = {}) {
  if (type === 'string') return h('textInput', props);
  if (type === 'number') return h('numberInput', props);
}
`;

let code = ref(localStorage.getItem('lastCode') || defaultCode);
let result = ref('');
let error = ref<any>(null);

watch(
  code,
  () => {
    try {
      result.value = gen(code.value) || '';
      error.value = null;
    } catch (err) {
      error.value = err;
      console.error(err);
    }
  },
  { immediate: true },
);

watch(code, () => {
  localStorage.setItem('lastCode', code.value);
});

const reset = () => {
  localStorage.removeItem('lastCode');
  code.value = defaultCode;
};
</script>

<template>
  <h1>babel-disposable</h1>
  <p>
    <a href="https://github.com/lyonbot/babel-disposable">GitHub</a> |
    <a href="https://lyonbot.github.io/babel-disposable">Demo</a> |
    <a href="https://npmjs.org/babel-disposable">NPM</a>
  </p>

  <div style="display: flex">
    <div class="my-column">
      <h2>Input</h2>
      <CodeMirror v-model:code="code" />
      <button @click="reset">reset</button>
    </div>
    <div class="my-column">
      <h2>Output</h2>

      <div class="error-mark" v-if="error">{{ String(error) }}</div>

      <CodeMirror :code="result" />
    </div>
  </div>
</template>

<style scoped>
.error-mark {
  padding: 8px;
  background: #fcc;
  white-space: pre;
  margin-bottom: 8px;
  font-size: 12px;
  font-family: monospace;
  overflow: auto;
  min-width: 0;
}

.my-column {
  min-width: 0;
  flex: 1 0 0;
  margin: 8px;
}
</style>
