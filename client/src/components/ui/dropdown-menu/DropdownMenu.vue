<script setup>
import { provide, ref } from 'vue'
const isOpen = ref(false)
function open() { isOpen.value = true }
function close() { isOpen.value = false }
function toggle() { isOpen.value = !isOpen.value }
provide('dm:isOpen', isOpen)
provide('dm:open', open)
provide('dm:close', close)
provide('dm:toggle', toggle)
</script>

<template>
  <div class="relative inline-block" @keydown.esc="close">
    <slot />
  </div>
</template>
