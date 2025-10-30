// Collabrí - servidor principal express
const express = require('express');
const authRouter = require('./auth');
const projectsRouter = require('./projects');
const tasksRouter = require('./tasks');
const collaboratorsRouter = require('./collaborators');
const reportsRouter = require('./reports');
const reportStatusRouter = require('./reportStatus');

const app = express();
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/projects/:projectId/tasks', tasksRouter);
app.use('/api/projects/:projectId/collaborators', collaboratorsRouter);
app.use('/api/projects/:projectId/report', reportsRouter);
app.use('/api/reports', reportStatusRouter);

// TODO: montar otros routers cuando existan

module.exports = app;
