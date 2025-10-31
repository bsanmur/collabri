// Collabrí - servidor principal express
const express = require('express');
const cors = require('cors');
const authRouter = require('./auth');
const projectsRouter = require('./projects');
const tasksRouter = require('./tasks');
const collaboratorsRouter = require('./collaborators');
const reportsRouter = require('./reports');
const reportStatusRouter = require('./reportStatus');

const app = express();

// CORS debe ir PRIMERO, antes de cualquier otro middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization']
}));

// Manejar preflight requests explícitamente
app.options('*', cors());

app.disable("x-powered-by");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/projects/:projectId/tasks', tasksRouter);
app.use('/api/projects/:projectId/collaborators', collaboratorsRouter);
app.use('/api/projects/:projectId/report', reportsRouter);
app.use('/api/reports', reportStatusRouter);

module.exports = app;