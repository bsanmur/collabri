<template>
  <div class="p-6">
    <h1 class="text-2xl mb-4">Iniciar sesión</h1>
    <form @submit.prevent="onSubmit">
      <div class="space-y-4">
        <input v-model="email" placeholder="Email" />
        <input v-model="password" type="password" placeholder="Contraseña" />
        <button type="submit">Ingresar</button>
        <router-link to="/auth/register">Crear cuenta</router-link>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../store/useAuthStore";

const router = useRouter();
const auth = useAuthStore();
const email = ref("");
const password = ref("");

async function onSubmit() {
  await auth.login({ email: email.value, password: password.value });
  router.push({ path: "/projects" });
}
</script>
