<template>
  <div v-if="open" class="fixed inset-0 flex items-center justify-center">
    <div class="bg-white p-4 border">
      <h3>Entrar a proyecto</h3>
      <input v-model="code" placeholder="Código del proyecto" />
      <div class="mt-2">
        <button @click="join">Entrar</button>
        <button @click="$emit('close')">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useProjectsStore } from "../features/projects/store/useProjectsStore";
import { toast } from "sonner";
const props = defineProps({ open: Boolean });
const emit = defineEmits(["close"]);
const code = ref("");
const store = useProjectsStore();

async function join() {
  try {
    await store.joinProject(code.value);
    emit("close");
  } catch (e) {
    toast.error(e.response?.data?.message || "Error al entrar");
  }
}
</script>
