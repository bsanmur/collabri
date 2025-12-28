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

const client = getReportClient();

const payload = {
  projectId: String(projectId),
  requestedBy: String(userId),
  email: String(email),
};

console.log(
  "Generando reporte para el proyecto, payload enviado a report-module:",
  payload
);

client.GenerateReport(payload, (err, resp) => {
  if (err) return res.status(500).json({ message: "Error solicitando reporte" });
  // Si el module de reportes devolvió los datos, reenvíalos al cliente para renderizar/imprimir
  if (resp && resp.status === "done" && resp.report) {
    return res.status(200).json({ reportId: resp.report_id, report: resp.report });
  }
  return res.status(500).json({ message: resp?.message || "No se pudo generar el reporte" });
});
</script>
