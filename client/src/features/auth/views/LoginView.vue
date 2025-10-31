<template>
  <div class="p-6 max-w-md mx-auto">
    <h1 class="text-2xl mb-4 font-semibold">Iniciar sesión</h1>
    <form @submit.prevent="onSubmit" class="space-y-4">
      <div class="space-y-2">
        <Label for="email">Email</Label>
        <Input id="email" v-model="email" type="email" placeholder="tucorreo@ejemplo.com" />
      </div>
      <div class="space-y-2">
        <Label for="password">Contraseña</Label>
        <Input id="password" v-model="password" type="password" placeholder="••••••••" />
      </div>
      <div class="flex items-center gap-3">
        <Button type="submit">Ingresar</Button>
        <router-link to="/auth/register" class="text-sm text-primary underline-offset-4 hover:underline">Crear cuenta</router-link>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const router = useRouter();
const auth = useAuthStore();
const email = ref("");
const password = ref("");

async function onSubmit() {
  await auth.login({ email: email.value, password: password.value });
  router.push({ path: "/projects" });
}
</script>
