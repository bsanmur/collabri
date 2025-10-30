<template>
  <div v-if="open" class="fixed inset-0 flex items-center justify-center">
    <div class="bg-white p-4 border">
      <h3>Crear proyecto</h3>
      <input v-model="name" placeholder="Nombre del proyecto" />
      <div class="mt-2">
        <button @click="create">Crear</button>
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
const name = ref("");
const store = useProjectsStore();

async function create() {
  try {
    await store.createProject({ name: name.value });
    emit("close");
  } catch (e) {
    toast.error(e.response?.data?.message || "Error creando proyecto");
  }
}
</script>
