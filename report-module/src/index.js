const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

const PROTO_PATH = path.join(__dirname, "../proto/report.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const reportProto = grpc.loadPackageDefinition(packageDefinition).report;


async function getDB() {
  const dbFile =
    process.env.DB_PATH || path.join(__dirname, "../../server/dev.db");
  return open({ filename: dbFile, driver: sqlite3.Database });
}

// Nueva función: prepara y devuelve los datos del reporte (sin generar PDF ni enviar email)
async function generateReportData(project_id) {
  const db = await getDB();
  const project = await db.get("SELECT * FROM projects WHERE id=?", project_id);
  if (!project) return null;

  const tasks = await db.all(
    "SELECT id, title, assignee_id, started_at, finished_at, created_at, description, status FROM tasks WHERE project_id=?",
    project_id
  );

  const rows = [];
  for (const t of tasks) {
    const u = t.assignee_id
      ? await db.get(
          "SELECT id, name, email FROM users WHERE id=?",
          t.assignee_id
        )
      : null;

    const duration =
      t.finished_at && (t.started_at || t.created_at)
        ? (new Date(t.finished_at) - new Date(t.started_at || t.created_at)) /
          36e5
        : null;

    rows.push({
      id: t.id,
      title: t.title,
      description: t.description || "",
      status: t.status || "",
      assignee: u ? { id: u.id, name: u.name, email: u.email } : null,
      duration_h: duration,
      started_at: t.started_at || null,
      finished_at: t.finished_at || null,
      created_at: t.created_at || null,
    });
  }

  // Estructura de retorno: proyecto + tareas
  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description || "",
      created_at: project.created_at || null,
      updated_at: project.updated_at || null,
    },
    tasks: rows,
    meta: {
      total_tasks: rows.length,
      total_hours: rows.reduce((s, r) => s + (r.duration_h || 0), 0),
      generated_at: new Date().toISOString(),
    },
  };
}

async function GenerateReport(call, callback) {
  try {
    const { projectId /*, email */ } = call.request;
    const project_id = projectId;

    console.log(`📊 Generando datos de reporte para proyecto ${project_id}...`);

    const reportData = await generateReportData(project_id);
    if (!reportData) {
      return callback(null, {
        report_id: "",
        status: "failed",
        message: "Proyecto no encontrado",
      });
    }

    // Devolver los datos del reporte al server para que el cliente/proxy los procese
    callback(null, {
      report_id: `report_${project_id}_${Date.now()}`,
      status: "done",
      message: "Datos de reporte generados",
      report: reportData, // campo adicional con toda la información
    });
  } catch (e) {
    console.error("❌ Error generando datos del reporte:", e);
    callback(null, {
      report_id: "",
      status: "failed",
      message: `Error: ${e.message}`,
    });
  }
}

function GetReportStatus(call, callback) {
  callback(null, {
    report_id: call.request.report_id,
    status: "pending",
    result_url: "",
    message: "Funcionalidad no implementada",
  });
}

function main() {
  const server = new grpc.Server();
  server.addService(reportProto.ReportService.service, {
    GenerateReport,
    GetReportStatus,
  });

  const addr = process.env.GRPC_PORT || "0.0.0.0:50051";

  server.bindAsync(
    addr,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error("❌ Error iniciando servidor gRPC:", err);
        process.exit(1);
      }
      console.log("🚀 ReportService gRPC ejecutándose en", addr);
    }
  );
}

if (require.main === module) {
  if (process.env.RUN_ONCE) {
    // Modo de prueba: ejecutar una sola vez
    (async () => {
      try {
        const testProjectId = process.env.TEST_PROJECT_ID || "1";
        console.log("🧪 Modo RUN_ONCE activado");
        const call = { request: { projectId: testProjectId } };
        await new Promise((resolve, reject) => {
          GenerateReport(call, (err, resp) => {
            if (err) return reject(err);
            console.log("✅ Respuesta:", JSON.stringify(resp, null, 2));
            resolve(resp);
          });
        });
        process.exit(0);
      } catch (e) {
        console.error("❌ Error en RUN_ONCE:", e);
        process.exit(1);
      }
    })();
  } else {
    // Modo servidor normal
    main();
  }
}
