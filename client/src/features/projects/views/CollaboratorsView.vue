<template>
  <div>
    <h2>Colaboradores</h2>
    <div v-if="!project">Seleccione un proyecto</div>
    <div v-else>
      <p>Creador: {{ project.creator?.name }}</p>
      <ul>
        <li v-for="c in collaborators" :key="c.id">
          {{ c.name }} - {{ c.email }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import api from "../../../lib/api";
import { useProjectsStore } from "../store/useProjectsStore";

const store = useProjectsStore();
const project = store.currentProject;
const collaborators = ref([]);

onMounted(async () => {
  if (!project) return;
  const { data } = await api.get(`/projects/${project.id}/collaborators`);
  collaborators.value = data;
});
</script>
