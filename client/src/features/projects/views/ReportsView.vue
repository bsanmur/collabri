<template>
  <div>
    <h2>Reportes</h2>
    <div v-if="generating">Generando reporte... (ID: {{ lastReportId }})</div>
    <div v-if="reportStatus">Estado reporte: {{ reportStatus.status }} <span v-if="reportStatus.result_url">| <a :href="reportStatus.result_url" target="_blank">descargar</a></span></div>
    <button @click="generateReport" :disabled="generating">Solicitar reporte PDF</button>
  </div>
</template>

<script setup>
import { ref } from "vue";
import api from "../../../lib/api";
import { toast } from "vue-sonner";

const routeId = () => {
  try {
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
