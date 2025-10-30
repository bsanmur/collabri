const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const PROTO_PATH = path.join(__dirname, '../proto/report.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const reportProto = grpc.loadPackageDefinition(packageDefinition).report;

// Conexión rápida y suelta a DB SQLite (configurar vía env como "../server/dev.db" o similar)
async function getDB() {
  const dbFile = process.env.DB_PATH || path.join(__dirname, '../../server/dev.db');
  return open({ filename: dbFile, driver: sqlite3.Database });
}

async function GenerateReport(call, callback) {
  try {
    const { project_id, requested_by, email } = call.request;
    const db = await getDB();
    // 1. Validar proyecto y existencia
    const project = await db.get('SELECT * FROM projects WHERE id=?', project_id);
    if (!project) return callback(null, { report_id: '', status: 'failed', message: 'Proyecto no existe' });
    // 2. Obtener tareas y calcular métricas
    const tasks = await db.all('SELECT title, assignee_id, started_at, finished_at, created_at FROM tasks WHERE project_id=?', project_id);
    // 3. Enriquecer con nombre/email de usuario
    let table = [];
    for (const t of tasks) {
      const u = t.assignee_id ? await db.get('SELECT name, email FROM users WHERE id=?', t.assignee_id) : null;
      const duration = t.finished_at && (t.started_at || t.created_at) ?
        ((new Date(t.finished_at) - new Date(t.started_at || t.created_at)) / 36e5) : null;
      table.push({ title: t.title, assignee: u ? `${u.name} <${u.email}>` : '', duration_h: duration });
    }
    // 4. Generar report_id con la misma DB id
    const report = await db.get('SELECT id FROM reports WHERE project_id=? ORDER BY id DESC LIMIT 1', project_id);
    const reportId = report ? String(report.id) : '';
    // 5. Generar PDF (simulado "storage/reports/${reportId}.pdf")
    // ... escribir PDF real aquí ...
    const pdfPath = `storage/reports/${reportId}.pdf`;
    // 6. Simular guardar PDF y actualizar DB
    await db.run('UPDATE reports SET status=?, result_url=?, finished_at=CURRENT_TIMESTAMP WHERE id=?', 'done', pdfPath, reportId);
    // 7. Simular envío de mail (omitir)
    // 8. Devolver respuesta gRPC
    callback(null, { report_id: reportId, status: 'done', message: 'Reporte generado', });
  } catch (e) {
    callback(null, { report_id: '', status: 'failed', message: 'Error de server: ' + e.message });
  }
}

function GetReportStatus(call, callback) {
  // TODO: implementar consultando la DB igual que en el endpoint
  callback(null, { report_id: call.request.report_id, status: 'pending', result_url: '', message: 'Not implemented' });
}

function main() {
  const server = new grpc.Server();
  server.addService(reportProto.ReportService.service, {
    GenerateReport,
    GetReportStatus
  });
  const addr = process.env.GRPC_PORT || '0.0.0.0:50051';
  server.bindAsync(addr, grpc.ServerCredentials.createInsecure(), () => {
    server.start();
    console.log('ReportService gRPC server running at', addr);
  });
}

if (require.main === module) {
  main();
}
