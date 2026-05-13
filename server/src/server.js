import { createApp } from './app.js';
import { migrate } from './db/index.js';
import { seedDefaultMenuItems } from './services/menuSeeder.js';

migrate();
await seedDefaultMenuItems();

const app = createApp();
const port = process.env.PORT || 4000;
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log(`Quick Split API listening on http://${host}:${port}`);
});
