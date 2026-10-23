import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_APP_DATA } from './src/defaultData.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data.json');

function getStoredData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      // Ensure upgraded schema fields exist
      if (parsed && Array.isArray(parsed.subjects) && parsed.subjects[0]?.weeklyLog) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading data.json:', e);
  }
  return DEFAULT_APP_DATA;
}

function saveStoredData(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Error writing data.json:', e);
    return false;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/data', (_req, res) => {
    const data = getStoredData();
    res.json(data);
  });

  app.post('/api/data', (req, res) => {
    const success = saveStoredData(req.body);
    if (success) {
      res.json({ success: true, message: 'Data saved and synced successfully' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save data' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const port = process.env.PORT || 3000;
  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
