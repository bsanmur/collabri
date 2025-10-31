# Collabrí - Sistema de Gestión de Proyectos Colaborativos

Resumen
- Collabrí es una aplicación web (Vue + shadcn) para gestión colaborativa de proyectos.
- Funcionalidades clave: registro/login, proyectos con código para entrar, tablero Kanban drag&drop (todo / doing / done), colaboración, reportes exportables a PDF, persistencia SQLite, notificaciones en tiempo real vía WebSocket, API REST y opcional gRPC para servicios internos.

Objetivo
- Implementar las funcionalidades faltantes divididas en 3 componentes: cliente (client/), servidor (server/) y módulo de reportes (report-module/).
- Comunicación: cliente ↔ servidor (REST + WebSocket) usando JWT; servidor ↔ report-module (gRPC).
- Persistencia: SQLite (server mantiene la base de datos). Report-module consulta la misma DB (o una réplica) vía acceso configurado por el equipo.
- Flujo ejemplo: cliente solicita generación de PDF → servidor recibe y valida → servidor invoca gRPC a report-module → report-module consulta DB, genera el PDF y lo envía por correo → report-module responde a servidor → servidor responde al cliente.

Archivos de referencia en workspace
- Cliente: [client/src/lib/api.js](client/src/lib/api.js), [client/src/lib/socket.js](client/src/lib/socket.js), [client/src/router/index.js](client/src/router/index.js), [`useAuthStore`](client/src/features/auth/store/useAuthStore.js), [client/src/components/NotificationDropdown.vue](client/src/components/NotificationDropdown.vue)
- Layout / vistas: [client/src/App.vue](client/src/App.vue), [client/src/main.js](client/src/main.js), [client/src/components/Sidebar.vue](client/src/components/Sidebar.vue), [client/src/components/CreateProjectModal.vue](client/src/components/CreateProjectModal.vue), [client/src/features/projects/views/KanbanView.vue](client/src/features/projects/views/KanbanView.vue)

Nota: las rutas anteriores se usan como referencia; incorpora sus imports/exports en las tareas.

Fases (lista detallada, sin tiempos) — cada paso es ejecutable y no ambiguo

FASE A — Esquema DB y contratos
1. Definir esquema SQL (migraciones). Crear archivo de migración SQL en server/migrations/:
   - users: id (INTEGER PK AUTOINCREMENT), name TEXT, email TEXT UNIQUE, password_hash TEXT, created_at DATETIME, updated_at DATETIME
   - projects: id, name TEXT, code TEXT UNIQUE, creator_id INTEGER REFERENCES users(id), created_at, updated_at
   - collaborators: id, project_id REFERENCES projects(id), user_id REFERENCES users(id), role TEXT ('member'), added_at
   - tasks: id, project_id, title, description, status TEXT ('todo'|'doing'|'done'), assignee_id REFERENCES users(id), created_at, started_at, finished_at, updated_at
   - task_history: id, task_id, from_status, to_status, changed_by, changed_at
   - reports: id, project_id, requested_by, status ('pending'|'done'|'failed'), result_url TEXT, created_at, finished_at
2. Entregar SQL exacto (CREATE TABLE) en server/migrations/001_schema.sql.

FASE B — Contratos API REST (server)
1. Autenticación
   - POST /api/auth/register
     - Body: { name, email, password }
     - Response 201: { token (jwt), user: { id, name, email } }
   - POST /api/auth/login
     - Body: { email, password }
     - Response 200: { token, user }
2. Proyectos
   - GET /api/projects
     - Auth: Bearer JWT
     - Response: { owned: [...], shared: [...] }
   - POST /api/projects
     - Body: { name }
     - Response 201: { id, name, code, creator_id }
   - POST /api/projects/join
     - Body: { code }
     - Response 200: { id, name, project_code }
   - GET /api/projects/:projectId
     - Response: project object
   - PUT /api/projects/:projectId
     - Body: { name }  (only creator allowed)
   - DELETE /api/projects/:projectId
     - (only creator)
3. Tareas (kanban)
   - GET /api/projects/:projectId/tasks
     - Response: [ { id, title, description, status, assignee_id, assignee_email, created_at, started_at, finished_at } ]
   - POST /api/projects/:projectId/tasks
     - Body: { title, description, assignee_id? }
     - Response 201: task
     - Side-effect: if assignee set → emitir notificación (WebSocket) a user objetivo
   - PUT /api/projects/:projectId/tasks/:taskId
     - Body: { title?, description?, status?, assignee_id? }
     - Response 200: updated task
     - Regla: si status cambia, insertar registro en task_history
     - Regla: si assignee cambia → emitir evento taskAssigned (WS) al nuevo assignee
4. Colaboradores
   - GET /api/projects/:projectId/collaborators
   - POST /api/projects/:projectId/collaborators
     - Body: { email } → agregar user como collaborator si existe; else error
5. Reportes (endpoint que inicia la generación)
   - POST /api/projects/:projectId/report
     - Auth required.
     - Body: { email?: string, options?: {...} }
     - Behavior: servidor valida accesos, crea registro reports (status: pending) y hace llamada gRPC a report-module (GenerateReportRequest)
     - Response: 202 Accepted { reportId } (opcional: location header /api/reports/:reportId)
   - GET /api/reports/:reportId/status
     - Devuelve estado y result_url si listo.

FASE C — WebSocket (server <-> cliente)
1. Protocolo WS:
   - Endpoint: wss://HOST/ws?token=JWT  (alternativa: iniciar WS y enviar { type: 'auth', token } inmediatamente)
   - Mensajes entrantes: (client → server) none required beyond auth; opcional: ack/read
   - Mensajes salientes (server → client): JSON { type: string, data: object, id?:string, createdAt:ISO }
     - type = "taskAssigned" → data: { task: { id, title, projectId }, assignedToId, assignedToEmail, assignedById, createdAt }
     - type = "taskUpdated" → data: { task, changes: {...} }
2. Implementación server:
   - Validar JWT al conectar; mapear connection -> userId
   - Mantener map userId -> ws connection(s)
   - Al asignar tarea en REST (PUT or POST), servidor debe:
     a) persistir cambio en DB en transacción
     b) notificar por WS al assigned user: enviar { type: "taskAssigned", data: ... }
3. Implementación cliente:
   - Usar [client/src/lib/socket.js](client/src/lib/socket.js)
   - Enviar token en query string al abrir WS (el store ya guarda token: [`useAuthStore`](client/src/features/auth/store/useAuthStore.js))
   - Manejar reconexión exponencial y re-suscripción
   - Mostrar en UI: [client/src/components/NotificationDropdown.vue](client/src/components/NotificationDropdown.vue)

FASE D — gRPC entre server y report-module
1. Protocolo gRPC (archivo .proto en report-module/proto/report.proto):
   - service ReportService {
       rpc GenerateReport(GenerateReportRequest) returns (GenerateReportResponse);
       rpc GetReportStatus(GetReportStatusRequest) returns (GetReportStatusResponse);
     }
   - message GenerateReportRequest { string project_id = 1; string requested_by = 2; string email = 3; repeated string options = 4; }
   - message GenerateReportResponse { string report_id = 1; string status = 2; string message = 3; } // status: pending/processing/done/failed
   - message GetReportStatusRequest { string report_id = 1; }
   - message GetReportStatusResponse { string report_id = 1; string status = 2; string result_url = 3; string message = 4; }
2. Flujo:
   - Server (REST POST /api/projects/:id/report) -> crea registro reports (pending) -> invoca ReportService.GenerateReport with project_id, user id y email -> recibe report_id y status -> responde 202 al cliente con report_id.
   - Report-module procesa: consulta DB, calcula métricas (lista de tareas con responsable y tiempo de resolución), crea PDF, sube a storage o lo deja en local, envía correo al email (SMTP configurado), actualiza estado en DB y responde via gRPC (o simplemente el GenerateReportResponse puede devolver report_id y status; server consultará GetReportStatus).
3. Implementar en report-module:
   - Conector a SQLite (misma DB o réplica) en report-module/config
   - Generador PDF (jsPDF o PDFKit)
   - Envío de correo (nodemailer o similar)
   - Exponer server gRPC (ReportService)

FASE E — Implementación server (detallada)
1. Stack: Node.js + Express (o Fastify) + sqlite3 + knex/sequelize (recomendado usar query builder para migraciones) + jsonwebtoken + ws (o socket.io) + @grpc/grpc-js
2. Implementar middleware:
   - auth middleware: validate JWT from Authorization: Bearer <token> and from WS query token.
   - error handler (JSON errors with { message, code })
3. Endpoints específicos (ver FASE B) con validaciones:
   - Validar project membership for access to project endpoints
   - Only creator allowed to delete/rename project
4. Integración gRPC:
   - Server creates gRPC client to report-module using proto (report-module host via env REPORT_MODULE_HOST)
   - When POST /api/projects/:id/report → call GenerateReport and store mapping report_id -> db row
5. Emisión WS:
   - When task.assignee changes or new task with assignee, call sendToUser(assignedId, { type: 'taskAssigned', data: ... })

FASE F — Implementación cliente (detallada)
1. Auth:
   - Use [`useAuthStore`](client/src/features/auth/store/useAuthStore.js) to store token and user.
   - Ensure axios base client [client/src/lib/api.js](client/src/lib/api.js) sets Authorization header: api.interceptors.request.use(cfg => { cfg.headers.Authorization = `Bearer ${token}` })
2. Socket:
   - Use [client/src/lib/socket.js](client/src/lib/socket.js) and update to send token in query string. Subscribe NotificationDropdown to messages.
3. Kanban:
   - Integrate drag & drop board (ej: @syncfusion/ej2-vue-kanban as already planned).
   - On card move → call PUT /api/projects/:id/tasks/:taskId { status }
   - On create → POST /api/projects/:id/tasks
4. Create / Join project modals: call POST /api/projects and POST /api/projects/join
5. Reports:
   - Request generation: POST /api/projects/:id/report with optional email
   - Poll report status via GET /api/reports/:reportId/status or listen for WS event reportDone (optional)
   - Provide UI feedback (toast) using vue-sonner
6. Authorization UI:
   - Prevent non-creators from Delete/Update project name (store has project.creator compare)

FASE G — Report-module (detallada)
1. gRPC server:
   - Implement ReportService.GenerateReport:
     a) validate request
     b) query DB: SELECT tasks with timestamps and assignee info for project_id
     c) compute duration per task: finished_at - started_at or finished_at - created_at if started_at null
     d) compose table: [task title, assignee name/email, duration_h]
     e) generate PDF (PDFKit/jsPDF) and store under storage/reports/<report_id>.pdf
     f) send email to requested email with attachment or link
     g) update reports table in DB with status=done and result_url (public link or server path)
     h) return GenerateReportResponse { report_id, status: 'done' }
2. Expose GetReportStatus to allow server polling.

FASE H — Tests, observabilidad y despliegue
1. Tests unitarios:
   - server: auth middleware, endpoints project/task flows, WS emission unit
   - report-module: GenerateReport logic with sample DB
   - client: stores and socket subscription (unit/mocks)
2. End-to-end:
   - Simular: register → create project → create task assigned to other user → confirm recipient gets WS message
   - Simular: request report → assert email sent (use mailcatcher during tests)
3. Logs:
   - structured logs on server/report-module with request ids
4. Deployment notes:
   - env vars: JWT_SECRET, DB_PATH, REPORT_MODULE_HOST, SMTP creds
   - secure WS (wss) behind reverse proxy; ensure gRPC TLS in prod

Ejemplos precisos (json / proto / ws)
1. REST request create task:
   - POST /api/projects/42/tasks
     - Body: { "title":"Tarea 1", "description":"...", "assignee_id": 7 }
   - Server side effect: DB insert task → if assignee_id set emit:
     {
       "type":"taskAssigned",
       "data":{
         "task": {"id":123, "title":"Tarea 1", "projectId":42},
         "assignedToId":7,
         "assignedToEmail":"juan@example.com",
         "assignedById": 2,
         "createdAt":"2025-10-30T12:00:00Z"
       }
     }
2. gRPC proto (report-module/proto/report.proto) - minimal:
   syntax = "proto3";
   package report;
   service ReportService {
     rpc GenerateReport(GenerateReportRequest) returns (GenerateReportResponse);
     rpc GetReportStatus(GetReportStatusRequest) returns (GetReportStatusResponse);
   }
   message GenerateReportRequest { string project_id = 1; string requested_by = 2; string email = 3; }
   message GenerateReportResponse { string report_id = 1; string status = 2; string message = 3; }
   message GetReportStatusRequest { string report_id = 1; }
   message GetReportStatusResponse { string report_id = 1; string status = 2; string result_url = 3; }

Qué ya está hecho (resumen)
- Cliente: router ([client/src/router/index.js](client/src/router/index.js)), bootstrap ([client/src/main.js](client/src/main.js)), App ([client/src/App.vue](client/src/App.vue)), api helper ([client/src/lib/api.js](client/src/lib/api.js) exists), socket cliente esbozado ([client/src/lib/socket.js](client/src/lib/socket.js)), NotificationDropdown en UI ([client/src/components/NotificationDropdown.vue](client/src/components/NotificationDropdown.vue)).
- Stores y vistas base: [`useAuthStore`](client/src/features/auth/store/useAuthStore.js), KanbanView esqueleto ([client/src/features/projects/views/KanbanView.vue](client/src/features/projects/views/KanbanView.vue)), Sidebar/Modals.
- WARP original con lista de tareas y fases (este fichero).

Qué falta (resumen accionable)
- Implementar migraciones SQL en server/migrations.
- Implementar servidor REST + WS con JWT auth y endpoints detallados (FASE B + E).
- Implementar gRPC proto y report-module service (FASE D + G).
- Conectar server ↔ report-module via gRPC and server ↔ client via WS.
- Completar Kanban integration en cliente y persistencia de cambios.
- Implementar generación de PDF y envío de correo en report-module.
- Tests y despliegue.

Tareas inmediatas (prioridad para empezar)
1. Crear migración SQL y script de seed con 2 usuarios y 1 proyecto (server/migrations/001_schema.sql, server/seeds/seed.sql).
2. Implementar POST /api/auth/register and POST /api/auth/login with JWT (server/src/auth).
3. Implement gRPC proto file (report-module/proto/report.proto) and scaffold ReportService.GenerateReport stub.
4. Implement POST /api/projects/:projectId/report to call gRPC GenerateReport and return { reportId }.
5. Implement WebSocket auth on server and client sending token in query (validar con [`useAuthStore`](client/src/features/auth/store/useAuthStore.js)).

