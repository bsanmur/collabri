const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");

const PROTO_PATH = path.join(__dirname, "../proto/report.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const reportProto = grpc.loadPackageDefinition(packageDefinition).report;

// Cache del transporter para evitar crearlo en cada envío
let transporterCache = null;

async function getDB() {
  const dbFile =
    process.env.DB_PATH || path.join(__dirname, "../../server/dev.db");
  return open({ filename: dbFile, driver: sqlite3.Database });
}

function generateReportPdfBuffer(project, rows) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];
    
    doc.on("data", (d) => chunks.push(d));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Encabezado del reporte
    doc
      .fontSize(20)
      .fillColor("#2563eb")
      .text(`Reporte de Proyecto: ${project.name}`, { underline: true });
    
    doc.moveDown();
    doc
      .fontSize(12)
      .fillColor("#000")
      .text(`Fecha de generación: ${new Date().toLocaleString("es-ES")}`);
    
    doc.moveDown(1.5);

    // Sección de tareas
    doc.fontSize(16).fillColor("#1e40af").text("📋 Tareas del Proyecto");
    doc.moveDown(0.5);
    
    if (rows.length === 0) {
      doc.fontSize(12).fillColor("#6b7280").text("No hay tareas registradas.");
    } else {
      // Estadísticas rápidas
      const totalHoras = rows.reduce((sum, r) => sum + (r.duration_h || 0), 0);
      const tareasConAsignacion = rows.filter(r => r.assignee).length;
      
      doc
        .fontSize(11)
        .fillColor("#374151")
        .text(`Total de tareas: ${rows.length}`)
        .text(`Tareas asignadas: ${tareasConAsignacion}`)
        .text(`Horas totales: ${totalHoras.toFixed(2)}h`)
        .moveDown();

      // Línea separadora
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);

      // Listado de tareas
      rows.forEach((r, idx) => {
        doc
          .fontSize(12)
          .fillColor("#111827")
          .text(`${idx + 1}. ${r.title}`, { continued: false });
        
        if (r.assignee) {
          doc
            .fontSize(10)
            .fillColor("#6b7280")
            .text(`   👤 Asignado a: ${r.assignee}`);
        }
        
        if (r.duration_h != null) {
          doc
            .fontSize(10)
            .fillColor("#6b7280")
            .text(`   ⏱️  Duración: ${r.duration_h.toFixed(2)} horas`);
        }
        
        doc.fillColor("#000").moveDown(0.8);
      });
    }

    // Pie de página
    doc
      .moveDown(2)
      .fontSize(9)
      .fillColor("#9ca3af")
      .text(
        "Este reporte fue generado automáticamente por el sistema de gestión de proyectos.",
        { align: "center" }
      );

    doc.end();
  });
}

async function getEmailTransporter() {
  // Si ya tenemos un transporter cacheado, lo reutilizamos
  if (transporterCache) return transporterCache;

  let transporter;

  if (process.env.SMTP_HOST) {
    // Configuración SMTP personalizada (producción)
    const config = {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
      tls: {
        rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== "false",
      },
    };

    transporter = nodemailer.createTransport(config);
    console.log("✅ SMTP configurado:", process.env.SMTP_HOST);
    
    // Verificar conexión
    try {
      await transporter.verify();
      console.log("✅ Conexión SMTP verificada correctamente");
    } catch (error) {
      console.error("⚠️  Error verificando SMTP:", error.message);
    }
  } else {
    // Cuenta de prueba Ethereal (desarrollo)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    console.log("📧 Modo desarrollo: Usando Ethereal Email");
    console.log("📧 Usuario Ethereal:", testAccount.user);
    console.log("⚠️  Los correos NO se enviarán realmente");
  }

  transporterCache = transporter;
  return transporter;
}

async function sendEmailWithAttachment({ to, subject, text, buffer, filename = "reporte.pdf" }) {
  try {
    const transporter = await getEmailTransporter();
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || '"Sistema de Reportes" <juanperez99937@gmail.com>',
      to,
      subject,
      text,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">${subject}</h2>
          <p style="color: #374151; line-height: 1.6;">${text}</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              📎 Adjunto: <strong>${filename}</strong>
            </p>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Este es un correo automático. Por favor no responder.
          </p>
        </div>
      `,
      attachments: [
        {
          filename,
          content: buffer,
          contentType: "application/pdf",
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);

    // Si estamos en modo desarrollo con Ethereal, mostrar URL de preview
    if (!process.env.SMTP_HOST) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log("🔗 Preview del correo:", previewUrl);
      }
    }

    console.log("✅ Correo enviado:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Error enviando correo:", error.message);
    throw error;
  }
}

async function GenerateReport(call, callback) {
  try {
    const { projectId, email } = call.request;
    const project_id = projectId;

    console.log(`📊 Generando reporte para proyecto ${project_id}...`);

    const db = await getDB();
    const project = await db.get(
      "SELECT * FROM projects WHERE id=?",
      project_id
    );

    if (!project) {
      return callback(null, {
        report_id: "",
        status: "failed",
        message: "Proyecto no encontrado",
      });
    }

    console.log(`✅ Proyecto encontrado: ${project.name}`);

    // Obtener tareas del proyecto
    const tasks = await db.all(
      "SELECT title, assignee_id, started_at, finished_at, created_at FROM tasks WHERE project_id=?",
      project_id
    );

    // Procesar información de tareas
    const rows = [];
    for (const t of tasks) {
      const u = t.assignee_id
        ? await db.get("SELECT name, email FROM users WHERE id=?", t.assignee_id)
        : null;
      
      const duration =
        t.finished_at && (t.started_at || t.created_at)
          ? (new Date(t.finished_at) - new Date(t.started_at || t.created_at)) / 36e5
          : null;
      
      rows.push({
        title: t.title,
        assignee: u ? `${u.name} <${u.email}>` : "Sin asignar",
        duration_h: duration,
      });
    }

    console.log(`📝 ${rows.length} tareas procesadas`);

    // Generar PDF
    const pdfBuffer = await generateReportPdfBuffer(project, rows);
    console.log(`📄 PDF generado (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);

    // Enviar correo
    await sendEmailWithAttachment({
      to: email,
      subject: `Reporte de Proyecto: ${project.name}`,
      text: `Hola,\n\nAdjuntamos el reporte completo del proyecto "${project.name}".\n\nTotal de tareas: ${rows.length}\n\nSaludos,\nEquipo de Gestión de Proyectos`,
      buffer: pdfBuffer,
      filename: `reporte_${project.name.replace(/\s+/g, "_")}.pdf`,
    });

    console.log(`✅ Reporte enviado exitosamente a ${email}`);

    callback(null, {
      report_id: `report_${project_id}_${Date.now()}`,
      status: "done",
      message: `Reporte enviado exitosamente a ${email}`,
    });
  } catch (e) {
    console.error("❌ Error generando reporte:", e);
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
      server.start();
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
        const testEmail = process.env.TEST_EMAIL || "test@example.com";

        console.log("🧪 Modo RUN_ONCE activado");
        console.log("📊 Generando reporte de prueba:", {
          projectId: testProjectId,
          email: testEmail,
        });

        await new Promise((resolve, reject) => {
          const call = {
            request: { projectId: testProjectId, email: testEmail },
          };
          GenerateReport(call, (err, resp) => {
            if (err) {
              console.error("❌ Error:", err);
              return reject(err);
            }
            console.log("✅ Respuesta:", resp);
            resolve(resp);
          });
        });

        console.log("✅ Ejecución completada");
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