<script setup>
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <div class="p-4 border-t flex items-center justify-end gap-2">
    <slot />
  </div>
</template>
