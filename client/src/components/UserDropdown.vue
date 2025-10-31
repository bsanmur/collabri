<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button class="w-8 h-8 rounded-full border flex items-center justify-center">
        {{ initials }}
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent class="w-48">
      <div class="px-2 py-1.5 font-medium">{{ userName }}</div>
      <button class="w-full text-left px-2 py-1.5 hover:bg-accent" @click="logout">Cerrar sesión</button>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup>
import { computed } from "vue";
import { useAuthStore } from "../features/auth/store/useAuthStore";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu'

const auth = useAuthStore();
const userName = computed(() => auth.user?.name || "Usuario");
const initials = computed(() => (auth.user?.name || 'U').split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase());
function logout() {
  auth.logout();
  location.href = "/auth/login";
}
</script>
