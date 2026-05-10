import { createApp } from './app.js';
import { migrate } from './db/index.js';
import { seedDefaultMenuItems } from './services/menuSeeder.js';

migrate();
await seedDefaultMenuItems();

const app = createApp();
const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Quick Split API listening on http://localhost:${port}`);
});
