const express = require('express');
const { getDB } = require('./auth/db');
const jwt = require('jsonwebtoken');
const router = express.Router({ mergeParams: true });
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const REPORT_PROTO_PATH = require('path').join(__dirname, '../../report-module/proto/report.proto');
const reportPkgDef = protoLoader.loadSync(REPORT_PROTO_PATH);
const reportProto = grpc.loadPackageDefinition(reportPkgDef).report;
let grpcClient;
function getReportClient() {
  if (!grpcClient) {
    const addr = process.env.REPORT_MODULE_HOST || 'localhost:50051';
    grpcClient = new reportProto.ReportService(addr, grpc.credentials.createInsecure());
  }
  return grpcClient;
}

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ message: 'No autorizado' });
  let payload;
  try {
    payload = jwt.verify(header.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Token inválido' });
  }
  req.user = payload;
  next();
}

// POST /api/projects/:projectId/report
router.post('/', requireAuth, async (req, res) => {
  const db = await getDB();
  const { projectId } = req.params;
  const userId = req.user.id;
  const email = req.body.email || req.user.email;
  // Verificar miembro
  const member = await db.get('SELECT id FROM collaborators WHERE project_id=? AND user_id=?', projectId, userId);
  if (!member) return res.status(403).json({ message: 'Sin acceso' });
  // Crear registro report con status pending
  const result = await db.run('INSERT INTO reports (project_id, requested_by, status, created_at) VALUES (?, ?, \'pending\', CURRENT_TIMESTAMP)', projectId, userId);
  const reportId = result.lastID;
  // Llamada gRPC
  const client = getReportClient();
  client.GenerateReport(
    { project_id: String(projectId), requested_by: String(userId), email: email },
    async (err, grpcResp) => {
      if (grpcResp && grpcResp.report_id && grpcResp.status) {
        await db.run('UPDATE reports SET status=?, finished_at=CURRENT_TIMESTAMP WHERE id=?', grpcResp.status, reportId);
      }
      // Nota: no espera a que termine. Responde rápido
    }
  );
  res.status(202).json({ reportId });
});

module.exports = router;
