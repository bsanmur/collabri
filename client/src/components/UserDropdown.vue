<template>
  <div class="relative">
    <button @click="open = !open" class="w-8 h-8 rounded-full border">
      JP
    </button>
    <div v-if="open" class="absolute right-0 mt-2 w-48 border bg-white p-2">
      <div class="font-medium">{{ userName }}</div>
      <button @click="logout">Cerrar sesión</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useAuthStore } from "../features/auth/store/useAuthStore";
const open = ref(false);
const auth = useAuthStore();
const userName = computed(() => auth.user?.name || "Usuario");
function logout() {
  auth.logout();
  location.href = "/auth/login";
}
</script>
