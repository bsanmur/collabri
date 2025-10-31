<script setup>
import { inject } from 'vue'
const toggle = inject('dm:toggle')
</script>

<template>
  <span @click="toggle">
    <slot />
  </span>
</template>
