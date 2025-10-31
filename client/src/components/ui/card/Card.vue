<script setup>
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
    <slot />
  </div>
</template>
