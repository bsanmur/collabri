<template>
  <Dialog :open="open" @update:open="val => !val && $emit('close')">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Entrar a proyecto</DialogTitle>
        <DialogDescription>Introduce el código para unirte</DialogDescription>
      </DialogHeader>
      <div class="space-y-3">
        <div class="space-y-2">
          <Label for="project-code">Código</Label>
          <Input id="project-code" v-model="code" placeholder="ABC123" />
        </div>
      </div>
      <DialogFooter>
        <Button @click="join">Entrar</Button>
        <Button variant="secondary" @click="$emit('close')">Cancelar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { ref } from "vue";
import { useProjectsStore } from "../features/projects/store/useProjectsStore";
import { toast } from "vue-sonner";
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
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
