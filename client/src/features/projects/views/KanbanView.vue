<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">{{ project?.name || "Kanban" }}</h2>
      <Button size="sm" @click="openCreateTask = true">+ Nueva tarea</Button>
    </div>
    <Card>
      <div class="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div class="mb-2 font-medium">Por hacer</div>
          <draggable
            v-model="todo"
            group="tasks"
            item-key="id"
            @end="onDragEnd('todo')"
          >
            <template #item="{ element }">
              <div
                class="mb-2 rounded-md border p-2 bg-background cursor-pointer"
                @click="openEdit(element)"
              >
                <div class="font-medium text-sm">{{ element.title }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ element.description }}
                </div>
              </div>
            </template>
          </draggable>
        </div>
        <div>
          <div class="mb-2 font-medium">En progreso</div>
          <draggable
            v-model="doing"
            group="tasks"
            item-key="id"
            @end="onDragEnd('doing')"
          >
            <template #item="{ element }">
              <div
                class="mb-2 rounded-md border p-2 bg-background cursor-pointer"
                @click="openEdit(element)"
              >
                <div class="font-medium text-sm">{{ element.title }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ element.description }}
                </div>
              </div>
            </template>
          </draggable>
        </div>
        <div>
          <div class="mb-2 font-medium">Hecho</div>
          <draggable
            v-model="done"
            group="tasks"
            item-key="id"
            @end="onDragEnd('done')"
          >
            <template #item="{ element }">
              <div
                class="mb-2 rounded-md border p-2 bg-background cursor-pointer"
                @click="openEdit(element)"
              >
                <div class="font-medium text-sm">{{ element.title }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ element.description }}
                </div>
              </div>
            </template>
          </draggable>
        </div>
      </div>
    </Card>

    <!-- Crear tarea -->
    <Dialog
      :open="openCreateTask"
      @update:open="(val) => (openCreateTask = val)"
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear tarea</DialogTitle>
        </DialogHeader>
        <div class="p-4 space-y-3">
          <div class="space-y-1">
            <Label for="title">Título</Label>
            <Input id="title" v-model="form.title" />
          </div>
          <div class="space-y-1">
            <Label for="desc">Descripción</Label>
            <Input id="desc" v-model="form.description" />
          </div>
          <div class="space-y-1">
            <Label for="assignee">Asignar a</Label>
            <select
              id="assignee"
              v-model="form.assignee_id"
              class="border rounded-md h-9 px-2 w-full"
            >
              <option :value="null">Sin asignar</option>
              <option v-for="c in collaborators" :key="c.id" :value="c.id">
                {{ c.name }} ({{ c.email }})
              </option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button @click="createTask">Crear</Button>
          <Button variant="secondary" @click="openCreateTask = false"
            >Cancelar</Button
          >
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Editar tarea -->
    <Dialog :open="openEditTask" @update:open="(val) => (openEditTask = val)">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar tarea</DialogTitle>
        </DialogHeader>
        <div class="p-4 space-y-3">
          <div class="space-y-1">
            <Label for="etitle">Título</Label>
            <Input id="etitle" v-model="form.title" />
          </div>
          <div class="space-y-1">
            <Label for="edesc">Descripción</Label>
            <Input id="edesc" v-model="form.description" />
          </div>
          <div class="space-y-1">
            <Label for="eassignee">Asignar a</Label>
            <select
              id="eassignee"
              v-model="form.assignee_id"
              class="border rounded-md h-9 px-2 w-full"
            >
              <option :value="null">Sin asignar</option>
              <option v-for="c in collaborators" :key="c.id" :value="c.id">
                {{ c.name }} ({{ c.email }})
              </option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button @click="updateTask">Guardar</Button>
          <Button variant="destructive" @click="deleteTask">Eliminar</Button>
          <Button variant="secondary" @click="openEditTask = false"
            >Cerrar</Button
          >
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup>
import { onMounted, computed, ref } from "vue";
import { useProjectsStore } from "../store/useProjectsStore";
import api from "../../../lib/api";
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import draggable from "vuedraggable";
import { toast } from "vue-sonner";

const store = useProjectsStore();
const router = useRouter();
const project = computed(() => store.currentProject);
const openCreateTask = ref(false);
const openEditTask = ref(false);

const todo = ref([]);
const doing = ref([]);
const done = ref([]);
const collaborators = ref([]);

const form = ref({ id: null, title: "", description: "", assignee_id: null });

onMounted(async () => {
  if (!project.value) {
    const id = router.currentRoute.value.params.id;
    if (id) {
      const { data } = await api.get(`/projects/${id}`);
      store.selectProject(data);
    }
  }
  if (project.value) {
    await refreshTasks();
    const { data: cols } = await api.get(
      `/projects/${project.value.id}/collaborators`
    );
    collaborators.value = cols;
  }
});

async function refreshTasks() {
  const { data } = await api.get(`/projects/${project.value.id}/tasks`);
  const tasks = data.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    assignee_id: t.assignee_id || null,
  }));
  todo.value = tasks.filter((t) => t.status === "todo");
  doing.value = tasks.filter((t) => t.status === "doing");
  done.value = tasks.filter((t) => t.status === "done");
}

async function onDragEnd(targetStatus) {
  const lists = [
    { status: "todo", list: todo.value },
    { status: "doing", list: doing.value },
    { status: "done", list: done.value },
  ];
  for (const { status, list } of lists) {
    for (const t of list) {
      if (t.status !== status) {
        try {
          await api.put(`/projects/${project.value.id}/tasks/${t.id}`, {
            status,
          });
          t.status = status;
        } catch (e) {
          toast.error(e.response?.data?.message || "Error al mover tarea");
        }
      }
    }
  }
}

function openEdit(task) {
  form.value = {
    id: task.id,
    title: task.title,
    description: task.description,
    assignee_id: task.assignee_id || null,
  };
  openEditTask.value = true;
}

async function createTask() {
  if (!form.value.title) return;
  try {
    const payload = {
      title: form.value.title,
      description: form.value.description,
      assignee_id: form.value.assignee_id,
    };
    await api.post(`/projects/${project.value.id}/tasks`, payload);
    openCreateTask.value = false;
    form.value = { id: null, title: "", description: "", assignee_id: null };
    await refreshTasks();
  } catch (e) {
    toast.error(e.response?.data?.message || "Error creando tarea");
  }
}

async function updateTask() {
  if (!form.value.id) return;
  try {
    const payload = {
      title: form.value.title,
      description: form.value.description,
      assignee_id: form.value.assignee_id,
    };
    await api.put(
      `/projects/${project.value.id}/tasks/${form.value.id}`,
      payload
    );
    openEditTask.value = false;
    await refreshTasks();
  } catch (e) {
    toast.error(e.response?.data?.message || "Error actualizando tarea");
  }
}

async function deleteTask() {
  if (!form.value.id) return;
  try {
    await api.delete(`/projects/${project.value.id}/tasks/${form.value.id}`);
    openEditTask.value = false;
    await refreshTasks();
  } catch (e) {
    toast.error(e.response?.data?.message || "Error eliminando tarea");
  }
}
</script>
