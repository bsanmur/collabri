<template>
  <header class="flex items-center justify-between p-4 border-b">
    <div></div>
    <div class="flex items-center gap-4">
      <NotificationDropdown />
      <UserDropdown />
    </div>
  </header>
</template>

<script setup>
import NotificationDropdown from "./NotificationDropdown.vue";
import UserDropdown from "./UserDropdown.vue";
</script>
