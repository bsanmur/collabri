<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" aria-label="Notificaciones">
        <span>🔔</span>
        <span v-if="unreadCount" class="ml-1 text-xs">({{ unreadCount }})</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent class="w-80">
      <div v-if="notifications.length === 0" class="p-2 text-sm text-muted-foreground">
        Sin notificaciones
      </div>
      <ul v-else class="max-h-80 overflow-auto">
        <li v-for="n in notifications" :key="n.id" class="p-2 border-b last:border-b-0">
          <div class="font-medium text-sm">{{ n.title }}</div>
          <div class="text-xs text-muted-foreground">{{ n.body }}</div>
          <div class="text-xs text-muted-foreground/70">{{ formatDate(n.createdAt) }}</div>
        </li>
      </ul>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { subscribe, unsubscribe as socketUnsubscribe, connect as socketConnect } from "../lib/socket";
import { toast } from "vue-sonner";
import { useAuthStore } from "../features/auth/store/useAuthStore";
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu'

const notifications = ref([]);
const auth = useAuthStore();

function pushNotification(n) {
  const note = {
    id: n.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: n.title || "Notificación",
    body: n.body || "",
    createdAt: n.createdAt || new Date().toISOString(),
    raw: n,
  };
  notifications.value.unshift(note);
  toast.success(note.title + (note.body ? ` — ${note.body}` : ""));
}

function handleMessage(msg) {
  if (!msg || !msg.type) return;
  if (msg.type === "taskAssigned") {
    const payload = msg.data || {};
    const currentUserId = auth.user?.id;
    if (!currentUserId) return;
    if (
      payload.assignedToId?.toString() === currentUserId?.toString() ||
      payload.assignedToEmail === auth.user?.email
    ) {
      pushNotification({
        id: payload.task?.id,
        title: "Nueva tarea asignada",
        body: payload.task?.title || "Se te asignó una tarea",
        createdAt: payload.createdAt || new Date().toISOString(),
      });
    }
  }
}

let unsubscribeFn = null;

onMounted(() => {
  if (localStorage.getItem("token")) socketConnect();
  unsubscribeFn = subscribe(handleMessage);
});

onBeforeUnmount(() => {
  if (unsubscribeFn) unsubscribeFn();
});

function formatDate(d) {
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

const unreadCount = computed(() => notifications.value.length);
</script>
