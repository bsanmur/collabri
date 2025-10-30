<template>
  <aside class="w-56 border-r p-4">
    <h2 class="text-xl mb-6">Collabrí</h2>
    <div>
      <h3 class="text-sm mb-2">Mis Proyectos</h3>
      <ul>
        <li v-for="p in projects" :key="p.id">
          <button @click="select(p)">{{ p.name }}</button>
        </li>
      </ul>
      <button @click="$emit('open-create')">+ Crear nuevo proyecto</button>
    </div>
    <div class="mt-6">
      <h3 class="text-sm mb-2">Proyectos Compartidos</h3>
      <ul>
        <li v-for="p in shared" :key="p.id">{{ p.name }}</li>
      </ul>
      <button @click="$emit('open-join')">+ Entrar a proyecto</button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from "vue";
import { useProjectsStore } from "../features/projects/store/useProjectsStore";

const store = useProjectsStore();
const projects = computed(() => store.ownedProjects);
const shared = computed(() => store.sharedProjects);

function select(p) {
  store.selectProject(p);
}
</script>
