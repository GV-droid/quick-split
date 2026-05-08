import cors from 'cors';
import express from 'express';
import { migrate } from './db/index.js';
import sessionsRouter from './routes/sessions.js';

migrate();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'Quick Split API' });
});

app.use('/api/sessions', sessionsRouter);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ error: err.message || 'Server error' });
});

app.listen(port, () => {
  console.log(`Quick Split API listening on http://localhost:${port}`);
});
