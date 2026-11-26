/**
 * Rutas de la API (configs). Se registran desde startServer() en server.ts.
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import {
  requireMaster,
} from '../auth.ts';
import pool, { isPostgresReady, memoryStoreRef } from '../../src/db.ts';

export interface RegisterConfigRoutesDeps {
  getOrLoadGeminiApiKey: () => Promise<string | null>;
  setGeminiApiKey: (key: string | null) => import('@google/genai').GoogleGenAI | null;
}

export function registerConfigRoutes(app: express.Express, ctx: RegisterConfigRoutesDeps) {
  const { getOrLoadGeminiApiKey, setGeminiApiKey } = ctx;
  // ==============================================================================
  // 6. CONFIGURACIONES (configs)
  // ==============================================================================

  // =========================================================================
  // GEMINI AI API KEY CONFIGURATION & STATUS ENDPOINTS
  // (Deben definirse estrictamente ANTES de /api/config/:key para evitar colisión de rutas)
  // =========================================================================
  app.get('/api/config/gemini', async (req, res) => {
    try {
      const apiKey = await getOrLoadGeminiApiKey();
      if (!apiKey) {
        return res.json({
          configured: false,
          maskedKey: '',
        });
      }
      const maskedKey = apiKey.length > 8
        ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`
        : '••••••••';
      return res.json({
        configured: true,
        maskedKey,
      });
    } catch (e: any) {
      return res.status(500).json({ configured: false, error: e.message });
    }
  });

  app.post('/api/config/gemini', requireMaster, async (req, res) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
        return res.status(400).json({ error: 'Debes proporcionar una clave API válida de Google Gemini.' });
      }

      const cleanKey = apiKey.trim();
      process.env.GEMINI_API_KEY = cleanKey;
      const client = setGeminiApiKey(cleanKey)!;

      // 1. Persistir en ./data/gemini_config.json (volumen Docker montado ./data)
      try {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(
          path.join(dataDir, 'gemini_config.json'),
          JSON.stringify({ apiKey: cleanKey, updatedAt: new Date().toISOString() }, null, 2),
          'utf8'
        );
      } catch (err: any) {
        console.warn('[Gemini Config] Advertencia al guardar en data/gemini_config.json:', err.message);
      }

      // 2. Persistir en la base de datos PostgreSQL
      try {
        if (isPostgresReady()) {
          await pool.query(
            "INSERT INTO configs (key, value) VALUES ('geminiApiKey', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            [JSON.stringify(cleanKey)]
          );
        }
      } catch (err: any) {
        console.warn('[Gemini Config] Advertencia al guardar en configs:', err.message);
      }

      // 3. Persistir en archivo .env local si existe o se puede escribir
      try {
        const envPath = path.join(process.cwd(), '.env');
        let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
        if (/^GEMINI_API_KEY=/m.test(content)) {
          content = content.replace(/^GEMINI_API_KEY=.*$/m, `GEMINI_API_KEY=${cleanKey}`);
        } else {
          content = content.trimEnd() + (content.length > 0 ? '\n' : '') + `GEMINI_API_KEY=${cleanKey}\n`;
        }
        fs.writeFileSync(envPath, content, 'utf8');
      } catch (err: any) {
        console.warn('[Gemini Config] Advertencia al actualizar .env:', err.message);
      }

      // 4. Prueba rápida de validación con Gemini
      let verifiedModel = 'gemini-3.8-flash';
      let verifySuccess = false;
      let verifyMessage = '';

      for (const testModel of ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']) {
        try {
          await client.models.generateContent({
            model: testModel,
            contents: 'test',
          });
          verifiedModel = testModel;
          verifySuccess = true;
          break;
        } catch (testErr: any) {
          verifyMessage = testErr?.message || '';
        }
      }

      return res.json({
        success: true,
        configured: true,
        verified: verifySuccess,
        model: verifiedModel,
        maskedKey: `${cleanKey.slice(0, 6)}...${cleanKey.slice(-4)}`,
        message: verifySuccess
          ? `¡Clave de Google Gemini validada y guardada correctamente! Motor activo: ${verifiedModel}.`
          : `Clave guardada en el servidor. Nota: ${verifyMessage}`,
      });
    } catch (e: any) {
      console.error('Error guardando clave de Gemini:', e);
      return res.status(500).json({ error: e.message || 'Error al guardar la clave API.' });
    }
  });

  app.delete('/api/config/gemini', requireMaster, async (req, res) => {
    delete process.env.GEMINI_API_KEY;
    setGeminiApiKey(null);
    try {
      const configPath = path.join(process.cwd(), 'data', 'gemini_config.json');
      if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
    } catch (_) {}
    try {
      if (isPostgresReady()) {
        await pool.query("DELETE FROM configs WHERE key = 'geminiApiKey'");
      }
    } catch (_) {}
    return res.json({ success: true, message: 'Clave de Gemini removida del servidor.' });
  });

  app.get('/api/config/:key', async (req, res) => {
    const { key } = req.params;
    try {
      if (isPostgresReady()) {
        const result = await pool.query('SELECT value FROM configs WHERE key = $1', [key]);
        if (result.rows.length > 0) {
          return res.json({ success: true, key, value: result.rows[0].value });
        }
      }
      const val = memoryStoreRef.configs.get(key) || null;
      res.json({ success: true, key, value: val });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/config/:key', async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    if (value === undefined) {
      return res.status(400).json({ success: false, error: 'El campo "value" es obligatorio para esta configuración.' });
    }
    try {
      if (isPostgresReady()) {
        await pool.query(`
          INSERT INTO configs (key, value) VALUES ($1, $2)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [key, JSON.stringify(value)]);
      } else {
        memoryStoreRef.configs.set(key, value);
      }
      res.json({ success: true, key, value });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

}
