<template>
  <div class="p-6 max-w-md mx-auto">
    <h1 class="text-2xl mb-4 font-semibold">Registro</h1>
    <form @submit.prevent="onSubmit" class="space-y-4">
      <div class="space-y-2">
        <Label for="name">Nombre</Label>
        <Input id="name" v-model="name" placeholder="Tu nombre" />
      </div>
      <div class="space-y-2">
        <Label for="email">Email</Label>
        <Input id="email" v-model="email" type="email" placeholder="tucorreo@ejemplo.com" />
      </div>
      <div class="space-y-2">
        <Label for="password">Contraseña</Label>
        <Input id="password" v-model="password" type="password" placeholder="••••••••" />
      </div>
      <div class="flex items-center gap-3">
        <Button type="submit">Registrarse</Button>
        <router-link to="/auth/login" class="text-sm text-primary underline-offset-4 hover:underline">Ya tengo cuenta</router-link>
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
const name = ref("");
const email = ref("");
const password = ref("");

async function onSubmit() {
  await auth.register({ name: name.value, email: email.value, password: password.value });
  router.push({ path: "/projects" });
}
</script>
