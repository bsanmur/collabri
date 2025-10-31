<template>
  <header class="flex items-center justify-between p-4 border-b">
    <h2 class="text-xl font-semibold">Collabrí</h2>
    <div class="font-semibold">&nbsp;</div>
    <div class="flex items-center gap-2">
      <NotificationDropdown />
      <UserDropdown />
    </div>
  </header>
</template>

<script setup>
import NotificationDropdown from "./NotificationDropdown.vue";
import UserDropdown from "./UserDropdown.vue";
</script>
