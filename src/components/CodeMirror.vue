<template>
  <div ref="domEl" style="text-align: left"></div>
</template>

<script setup lang="ts">
import * as CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/lib/codemirror.css';

import { ref, onMounted, watch } from 'vue';

const props = defineProps<{ code: string }>();
const emit = defineEmits(['update:code']);

const domEl = ref<HTMLDivElement>();

let view;

onMounted(() => {
  // Create an editor instance from a textarea element
  var editor = CodeMirror(domEl.value, {
    value: props.code,
    lineNumbers: true,
    mode: 'javascript',
  });

  watch(
    () => props.code,
    (code) => {
      if (editor.getValue() !== code) editor.setValue(code);
    }
  );

  editor.on('changes', () => {
    const val = editor.getValue();
    if (val !== props.code) emit('update:code', val);
  });
});
</script>
