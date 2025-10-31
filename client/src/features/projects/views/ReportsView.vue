<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold">Reportes</h2>
    <Card>
      <div class="p-4 space-y-2">
        <div v-if="generating" class="text-sm text-muted-foreground">Generando reporte... (ID: {{ lastReportId }})</div>
        <div v-if="reportStatus" class="text-sm">
          Estado: <span class="font-medium">{{ reportStatus.status }}</span>
          <span v-if="reportStatus.result_url"> | <a :href="reportStatus.result_url" target="_blank" class="text-primary underline">descargar</a></span>
        </div>
        <Button @click="generateReport" :disabled="generating">Solicitar reporte PDF</Button>
      </div>
    </Card>
  </div>
</template>

<script setup>
import { ref } from "vue";
import api from "../../../lib/api";
import { toast } from "vue-sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const routeId = () => {
  
  try {
    console.log("Extrayendo ID de ruta...", window.location.pathname.split("/")[2]);
    return window.location.pathname.split("/")[2];
  } catch {
    return null;
  }
};
const projectId = routeId();

const generating = ref(false);
const lastReportId = ref(null);
const reportStatus = ref(null);
let statusTimer = null;

async function generateReport() {
  if (!projectId) return toast.error("Proyecto inválido");
  generating.value = true;
  lastReportId.value = null;
  reportStatus.value = null;
  try {
    const { data } = await api.post(`/projects/${projectId}/report`);
    lastReportId.value = data.reportId;
    toast.success("Reporte solicitado. Esperando generación...");
    pollStatus();
  } catch (e) {
    toast.error(e.response?.data?.message || "Error solicitando reporte");
    generating.value = false;
  }
}

async function pollStatus() {
  if (!lastReportId.value) return;
  try {
    const { data } = await api.get(`/reports/${lastReportId.value}/status`);
    reportStatus.value = data;
    if (data.status !== "done") {
      statusTimer = setTimeout(pollStatus, 1500);
    } else {
      generating.value = false;
      toast.success("Reporte listo");
      if (data.result_url) {
        window.open(data.result_url, "_blank");
      }
    }
  } catch {
    generating.value = false;
  }
}
</script>
