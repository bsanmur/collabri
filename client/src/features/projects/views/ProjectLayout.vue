<template>
  <div class="flex h-screen flex-col">
    <Topbar />
    <div class="flex flex-1 overflow-hidden">
      <Sidebar @open-create="createOpen = true" @open-join="joinOpen = true" />
      <main class="flex-1 p-4 overflow-auto">
        <div v-if="!project">
          <div class="text-center">
            <p>Crea nuevo proyecto</p>
            <button @click="createOpen = true">Crear proyecto</button>
          </div>
        </div>
        <div v-else>
          <nav class="mb-4">
            <router-link
              :to="{ name: 'ProjectKanban', params: { id: project.id } }"
              >Kanban</router-link
            >
            <router-link
              :to="{ name: 'ProjectReports', params: { id: project.id } }"
              >Reportes</router-link
            >
            <router-link
              :to="{ name: 'ProjectCollaborators', params: { id: project.id } }"
              >Colaboradores</router-link
            >
          </nav>
          <router-view />
        </div>
      </main>
    </div>

    <CreateProjectModal :open="createOpen" @close="createOpen = false" />
    <JoinProjectModal :open="joinOpen" @close="joinOpen = false" />
  </div>
</template>

<script setup>
import Topbar from "../../../components/Topbar.vue";
import Sidebar from "../../../components/Sidebar.vue";
import CreateProjectModal from "../../../components/CreateProjectModal.vue";
import JoinProjectModal from "../../../components/JoinProjectModal.vue";
import { computed, ref, onMounted } from "vue";
import { useProjectsStore } from "../store/useProjectsStore";

const store = useProjectsStore();
const createOpen = ref(false);
const joinOpen = ref(false);

onMounted(() => {
  store.fetchProjects();
});

const project = computed(() => store.currentProject);
</script>
