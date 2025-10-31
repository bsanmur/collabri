<template>
  <Dialog :open="open" @update:open="val => !val && $emit('close')">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Crear proyecto</DialogTitle>
        <DialogDescription>Define el nombre del nuevo proyecto</DialogDescription>
      </DialogHeader>
      <div class="space-y-3">
        <div class="space-y-2">
          <Label for="project-name">Nombre</Label>
          <Input id="project-name" v-model="name" placeholder="Nombre del proyecto" />
        </div>
      </div>
      <DialogFooter>
        <Button @click="create">Crear</Button>
        <Button variant="secondary" @click="$emit('close')">Cancelar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { ref } from "vue";
import { useProjectsStore } from "../features/projects/store/useProjectsStore";
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// Dialog components (shadcn/vue)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from "vue-sonner";
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
