<template>
  <div class="relative">
    <button @click="open = !open" aria-label="Notificaciones">
      🔔<span v-if="unreadCount" class="ml-1 text-xs">({{ unreadCount }})</span>
    </button>

    <div
      v-if="open"
      class="absolute right-0 mt-2 w-80 border bg-white p-2 z-50"
    >
      <div v-if="notifications.length === 0" class="p-2 text-sm text-gray-500">
        Sin notificaciones
      </div>
      <ul>
        <li v-for="n in notifications" :key="n.id" class="p-2 border-b">
          <div class="font-medium text-sm">{{ n.title }}</div>
          <div class="text-xs text-gray-600">{{ n.body }}</div>
          <div class="text-xs text-gray-400">{{ formatDate(n.createdAt) }}</div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import {
  subscribe,
  unsubscribe as socketUnsubscribe,
  connect as socketConnect,
} from "../lib/socket";
import { toast } from "vue-sonner";
import { useAuthStore } from "../features/auth/store/useAuthStore";

const open = ref(false);
const notifications = ref([]);
const callbacks = [];
const auth = useAuthStore();

function pushNotification(n) {
  // Añadir id y fecha si no vienen
  const note = {
    id: n.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: n.title || "Notificación",
    body: n.body || "",
    createdAt: n.createdAt || new Date().toISOString(),
    raw: n,
  };
  notifications.value.unshift(note);
  // mostrar toast breve
  toast.success(note.title + (note.body ? ` — ${note.body}` : ""));
}

function handleMessage(msg) {
  // msg: { type: 'taskAssigned', data: { task, assignedToId, assignedToEmail, ... } }
  if (!msg || !msg.type) return;
  if (msg.type === "taskAssigned") {
    const payload = msg.data || {};
    // filtrar por usuario actual (auth.user.id)
    const currentUserId = auth.user?.id;
    if (!currentUserId) {
      // si no está logueado, ignorar
      return;
    }
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
  } else if (msg.type === "ws:open") {
    // opcional: notificar conexión
  } else if (msg.type === "ws:close") {
    // opcional: notificar desconexión
  }
}

let unsubscribeFn = null;

onMounted(() => {
  // Nos suscribimos al socket y guardamos el unsubscribe
  // forzamos conexión si hay token
  if (localStorage.getItem("token")) {
    socketConnect();
  }
  unsubscribeFn = subscribe(handleMessage);
});

onBeforeUnmount(() => {
  if (unsubscribeFn) unsubscribeFn();
});

function formatDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

const unreadCount = computed(() => notifications.value.length);
</script>
