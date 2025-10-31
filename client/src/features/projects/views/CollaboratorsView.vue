<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold">Colaboradores</h2>
    <div v-if="!project" class="text-sm text-muted-foreground">Seleccione un proyecto</div>
    <div v-else class="space-y-4">
      <Card>
        <div class="p-4 space-y-2">
          <div class="text-sm text-muted-foreground">Creador: {{ project.creator?.name || '—' }}</div>
          <ul class="space-y-1">
            <li v-for="c in collaborators" :key="c.id" class="text-sm">{{ c.name }} — {{ c.email }}</li>
          </ul>
        </div>
      </Card>
      <Card>
        <div class="p-4 space-y-3">
          <div class="font-medium">Invitar por email</div>
          <div class="flex items-center gap-2">
            <Input v-model="inviteEmail" placeholder="correo@ejemplo.com" class="flex-1" />
            <Button size="sm" @click="invite">Invitar</Button>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import api from "../../../lib/api";
import { useProjectsStore } from "../store/useProjectsStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "vue-sonner";

const store = useProjectsStore();
const project = computed(() => store.currentProject);
const collaborators = ref([]);
const inviteEmail = ref("");

onMounted(async () => {
  if (!project.value) return;
  const { data } = await api.get(`/projects/${project.value.id}/collaborators`);
  collaborators.value = data;
});

async function invite() {
  if (!inviteEmail.value) return;
  try {
    await api.post(`/projects/${project.value.id}/collaborators`, { email: inviteEmail.value });
    toast.success('Invitación enviada');
    inviteEmail.value = '';
    const { data } = await api.get(`/projects/${project.value.id}/collaborators`);
    collaborators.value = data;
  } catch (e) {
    toast.error(e.response?.data?.message || 'Error al invitar');
  }
}
</script>
