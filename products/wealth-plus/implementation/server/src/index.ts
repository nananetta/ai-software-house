import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';

import { authRouter } from './routes/auth';
import { meRouter } from './routes/me';
import { snapshotsRouter } from './routes/snapshots';
import { dashboardRouter } from './routes/dashboard';
import { globalErrorHandler } from './middleware/errorHandler';

// =============================================================================
// Startup guard
// =============================================================================

const JWT_SECRET = process.env['JWT_SECRET'] ?? '';

if (JWT_SECRET.length < 32) {
  console.error(
    '[Startup] FATAL: JWT_SECRET must be at least 32 characters long. Server will not start.'
  );
  process.exit(1);
}

// =============================================================================
// App setup
// =============================================================================

const app = express();

const allowedOrigins = (
  process.env['CORS_ORIGIN'] ??
  process.env['CLIENT_ORIGIN'] ??
  'http://localhost:5173,http://localhost:4000'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

// =============================================================================
// Routes
// =============================================================================

app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);
app.use('/api/snapshots', snapshotsRouter);
app.use('/api/dashboard', dashboardRouter);

const clientDistCandidates = [
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../../../client/dist'),
];

const clientDistPath = clientDistCandidates.find((candidate) => fs.existsSync(candidate));

if (clientDistPath) {
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }

    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// =============================================================================
// Global error handler (must be last)
// =============================================================================

app.use(globalErrorHandler);

// =============================================================================
// Listen
// =============================================================================

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

app.listen(PORT, () => {
  console.log(`[Server] Wealth Plus API listening on port ${PORT}`);
});

export { app };
