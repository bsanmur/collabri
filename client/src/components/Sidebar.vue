<template>
  <aside class="w-56 border-r p-4">
    <h2 class="text-xl mb-6 font-semibold">Collabrí</h2>
    <div>
      <h3 class="text-sm mb-2">Mis Proyectos</h3>
      <ul class="space-y-1">
        <li v-for="p in projects" :key="p.id">
          <Button variant="ghost" class="w-full justify-start" @click="selectAndGo(p)">{{ p.name }}</Button>
        </li>
      </ul>
      <div class="mt-2">
        <Button size="sm" @click="$emit('open-create')">+ Crear nuevo proyecto</Button>
      </div>
    </div>
    <div class="mt-6">
      <h3 class="text-sm mb-2">Proyectos Compartidos</h3>
      <ul class="space-y-1">
        <li v-for="p in shared" :key="p.id">
          <Button variant="ghost" class="w-full justify-start" @click="selectAndGo(p)">{{ p.name }}</Button>
        </li>
      </ul>
      <div class="mt-2">
        <Button size="sm" variant="secondary" @click="$emit('open-join')">+ Entrar a proyecto</Button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from "vue";
import { useProjectsStore } from "../features/projects/store/useProjectsStore";
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'

const router = useRouter()
const store = useProjectsStore();
const projects = computed(() => store.ownedProjects);
const shared = computed(() => store.sharedProjects);

function selectAndGo(p) {
  store.selectProject(p);
  router.push({ name: 'ProjectKanban', params: { id: p.id } });
}
</script>
