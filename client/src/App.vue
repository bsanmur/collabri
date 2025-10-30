<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const authStore = useAuthStore()

onMounted(() => {
  // Verificar si hay un token guardado
  const token = localStorage.getItem('token')
  if (token) {
    authStore.setToken(token)
  }
})
</script>