<template>
  <div>
    <h2 class="text-xl mb-4">{{ project?.name || "Kanban" }}</h2>
    <ejs-kanban v-if="boardData" :dataSource="boardData" keyField="status">
      <e-columns>
        <e-column headerText="Por hacer" key="todo"></e-column>
        <e-column headerText="En Progreso" key="doing"></e-column>
        <e-column headerText="Hecho" key="done"></e-column>
      </e-columns>
    </ejs-kanban>
  </div>
</template>

<script setup>
import { onMounted, computed } from "vue";
import { useProjectsStore } from "../store/useProjectsStore";
import api from "../../../lib/api";
import { KanbanPlugin } from "@syncfusion/ej2-vue-kanban";
import { useRouter } from "vue-router";
import { register } from "vue";
import { defineComponent } from "vue";
register ? null : null;

const store = useProjectsStore();
const router = useRouter();

const project = computed(() => store.currentProject);

let boardData = null;

onMounted(async () => {
  if (!project.value) {
    // si no hay proyecto seleccionado, intenta leer id de ruta
    const id = router.currentRoute.value.params.id;
    if (id) {
      const { data } = await api.get(`/projects/${id}`);
      store.selectProject(data);
    }
  }
  if (project.value) {
    const { data } = await api.get(`/projects/${project.value.id}/tasks`);
    boardData = data.map((t) => ({
      id: t.id,
      status: t.status,
      summary: t.title,
      description: t.description,
    }));
  }
});
</script>
