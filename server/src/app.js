import cors from 'cors';
import express from 'express';
import menuMappingsRouter from './routes/menuMappings.js';
import sessionsRouter from './routes/sessions.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, name: 'Quick Split API' });
  });

  app.use('/api/sessions', sessionsRouter);
  app.use('/api/menu-mappings', menuMappingsRouter);

  app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) {
      console.error(err);
    }
    res.status(status).json({ error: err.message || 'Server error' });
  });

  return app;
}
