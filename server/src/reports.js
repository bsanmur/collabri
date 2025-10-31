const express = require("express");
const jwt = require("jsonwebtoken");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const REPORT_PROTO_PATH = require("path").join(
  __dirname,
  "../../report-module/proto/report.proto"
);
const reportPkgDef = protoLoader.loadSync(REPORT_PROTO_PATH);
const reportProto = grpc.loadPackageDefinition(reportPkgDef).report;
const { getDB } = require("./auth/db");
const router = express.Router({ mergeParams: true });

const JWT_SECRET = process.env.JWT_SECRET || "changeme";
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ message: "No autorizado" });
  let payload;
  try {
    payload = jwt.verify(header.split(" ")[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
  req.user = payload;
  next();
}

let grpcClient;
function getReportClient() {
  if (!grpcClient) {
    const addr = process.env.REPORT_MODULE_HOST || "localhost:50051";
    grpcClient = new reportProto.ReportService(
      addr,
      grpc.credentials.createInsecure()
    );
  }
  return grpcClient;
}

// POST /api/projects/:projectId/report
router.post("/", requireAuth, async (req, res) => {
  const db = await getDB();
  const { projectId } = req.params;
  console.log("Consultando estado del reporte:", String(projectId));

  const userId = req.user.id;
  const email = req.body.email || req.user.email;
  const member = await db.get(
    "SELECT id FROM collaborators WHERE project_id=? AND user_id=?",
    projectId,
    userId
  );
  if (!member) return res.status(403).json({ message: "Sin acceso" });

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
    if (err)
      return res.status(500).json({ message: "Error solicitando reporte" });
    if (resp && resp.status === "done")
      return res.status(200).json({ message: "Reporte enviado al correo" });
    return res
      .status(500)
      .json({ message: resp?.message || "No se pudo generar el reporte" });
  });
});

module.exports = router;
