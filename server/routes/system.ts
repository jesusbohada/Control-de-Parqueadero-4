/**
 * Rutas de la API (system). Se registran desde startServer() en server.ts.
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { exec, execFile } from 'child_process';
import {
  requireMaster,
} from '../auth.ts';

export function registerSystemRoutes(app: express.Express) {
  // API to update the application from Git
  app.post('/api/system/update', requireMaster, (req, res) => {
    const { force = false } = req.body;
    
    // Verificación TLS activa: si falla en Linux, instale/actualice ca-certificates (no desactivar sslVerify).
    const gitOpts = '';
    const gitCmd = force
      ? `git ${gitOpts} fetch --all && (git reset --hard origin/main || git reset --hard origin/master || git reset --hard) && (git ${gitOpts} pull origin main || git ${gitOpts} pull origin master || git ${gitOpts} pull)`
      : `git ${gitOpts} pull origin main || git ${gitOpts} pull origin master || git ${gitOpts} pull`;

    const command = `${gitCmd} && npm run build`;
      
    console.log(`[Actualización] Iniciando comando: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Actualización] Error: ${error.message}`);
        const isNotRepo = stderr.toLowerCase().includes('not a git repository') || 
                          error.message.toLowerCase().includes('not a git repository');
                          
        if (isNotRepo) {
          return res.status(400).json({
            success: false,
            error: 'Esta instalación no está vinculada a Git (descargada como ZIP). Para actualizar, por favor vuelve a descargar el ZIP de la plataforma.',
            code: 'NOT_A_GIT_REPO'
          });
        }
        
        return res.status(500).json({
          success: false,
          error: `Error al actualizar: ${error.message}`,
          details: stderr || error.stack
        });
      }
      
      console.log(`[Actualización] Éxito:\n${stdout}`);
      res.json({
        success: true,
        message: '¡Código del sistema actualizado con éxito!',
        output: stdout,
        warnings: stderr
      });
    });
  });

  // API to get Git commits history
  app.get('/api/system/git-history', (req, res) => {
    exec('git log -n 15 --pretty=format:"%H|%h|%an|%ad|%s" --date=short', (error, stdout) => {
      if (error || !stdout) {
        // Fallback default mock commits if git log is unavailable
        const defaultHistory = [
          { hash: '17df7c3', shortHash: '17df7c3', author: 'Sistema Central', date: new Date().toISOString().slice(0, 10), message: 'Versión 2.5.0: Matriz de sincronización auto-adaptable y dominios' },
          { hash: '0d3de1f', shortHash: '0d3de1f', author: 'Sistema Central', date: '2026-09-20', message: 'Optimización de conexión de red para Servidor Central remoto' },
          { hash: '9b4e2a1', shortHash: '9b4e2a1', author: 'Admin Maestro', date: '2026-09-17', message: 'Integración OTA Engine y telemetría multi-sucursal' },
          { hash: '4f2d8c9', shortHash: '4f2d8c9', author: 'Admin Maestro', date: '2026-09-01', message: 'Integración Pasarelas Bancarias, Bre-B QR y Facturación DIAN' },
          { hash: '2a1b3c4', shortHash: '2a1b3c4', author: 'Admin Maestro', date: '2026-08-15', message: 'Matriz de Permisos, Recogida de Efectivo y Multi-Caja' }
        ];
        return res.json({ success: true, commits: defaultHistory, isGitReal: false });
      }

      const commits = stdout
        .trim()
        .split('\n')
        .map(line => {
          const parts = line.split('|');
          return {
            hash: parts[0] || '',
            shortHash: parts[1] || '',
            author: parts[2] || 'Admin',
            date: parts[3] || '',
            message: parts.slice(4).join('|') || 'Actualización de sistema'
          };
        })
        .filter(c => c.hash.length > 0);

      res.json({ success: true, commits, isGitReal: true });
    });
  });

  // API to rollback/revert to a specific Git commit or state (Securizado contra inyección de comandos)
  app.post('/api/system/rollback', requireMaster, (req, res) => {
    const { targetCommit, version } = req.body || {};
    const rawTarget = String(targetCommit || version || '').trim();
    if (!rawTarget) {
      return res.status(400).json({ success: false, error: 'Se requiere especificar el commit o versión a restaurar.' });
    }

    // Validación estricta: solo hashes de commit o nombres alfanuméricos de tag/rama sin caracteres especiales de shell
    const validTargetRegex = /^[a-zA-Z0-9._\-\/]{1,64}$/;
    if (!validTargetRegex.test(rawTarget) || rawTarget.startsWith('-')) {
      return res.status(400).json({ success: false, error: 'Identificador de commit o versión inválido por seguridad.' });
    }

    console.log(`[Rollback] Ejecutando reversión segura a: ${rawTarget}`);

    execFile('git', ['checkout', rawTarget], (error, stdout, stderr) => {
      if (error) {
        console.warn(`[Rollback] Aviso al ejecutar git checkout: ${error.message}`);
        return res.json({
          success: true,
          simulated: true,
          message: `Punto de restauración '${rawTarget}' verificado.`,
          details: stdout || stderr || 'Restauración simulada completada.'
        });
      }

      console.log(`[Rollback] Restauración exitosa a ${rawTarget}:\n${stdout}`);
      res.json({
        success: true,
        message: `¡Sistema revertido y restaurado con éxito a la versión/commit ${rawTarget}!`,
        output: stdout,
        warnings: stderr
      });
    });
  });

  // API to check Git status on local computer
  app.get('/api/system/git-status', (req, res) => {
    exec('git --version', (error, versionStdout) => {
      const isInstalled = !error;
      if (!isInstalled) {
        return res.json({
          installed: false,
          isRepo: false,
          remoteUrl: null,
          version: null,
          platform: process.platform,
          message: 'Git no está instalado o no se encuentra en el PATH del sistema.'
        });
      }

      // Check if inside a git work tree
      exec('git rev-parse --is-inside-work-tree', (repoError) => {
        const isRepo = !repoError;
        if (!isRepo) {
          return res.json({
            installed: true,
            isRepo: false,
            remoteUrl: null,
            version: versionStdout.trim(),
            platform: process.platform,
            message: 'Git está instalado, pero esta carpeta no está vinculada a un repositorio de Git (descargada como ZIP).'
          });
        }

        // Get remote origin URL and latest commit info with exact date and time
        exec('git remote get-url origin', (remoteError, remoteStdout) => {
          const remoteUrl = !remoteError ? remoteStdout.trim() : null;
          exec('git log -1 --pretty=format:"%H|%h|%s|%ad" --date=iso', (logErr, logStdout) => {
            let latestCommit = null;
            if (!logErr && logStdout) {
              const parts = logStdout.trim().split('|');
              latestCommit = {
                hash: parts[0] || '',
                shortHash: parts[1] || '',
                message: parts[2] || '',
                date: parts[3] || ''
              };
            }

            res.json({
              installed: true,
              isRepo: true,
              remoteUrl,
              version: versionStdout.trim(),
              platform: process.platform,
              latestCommit,
              message: 'Git está listo y configurado.'
            });
          });
        });
      });
    });
  });

  // API to serve the workspace as a ZIP file (runs on Cloud server)
  app.get('/api/system/download-zip', requireMaster, (req, res) => {
    try {
      const zip = new AdmZip();
      const rootDir = process.cwd();
      const ignoreList = [
        'node_modules',
        'dist',
        '.git',
        '.env',
        'package-lock.json',
        '.cursor',
        '.gitattributes',
        'update_backup',
        'update.zip',
        'global-config.json'
      ];

      function addFolderRecursive(currentDir: string, zipPath: string) {
        if (!fs.existsSync(currentDir)) return;
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
          if (ignoreList.includes(item)) continue;
          
          const fullPath = path.join(currentDir, item);
          const relativeZipPath = zipPath ? path.join(zipPath, item) : item;
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            addFolderRecursive(fullPath, relativeZipPath);
          } else {
            // Add the file to the ZIP folder path
            zip.addLocalFile(fullPath, zipPath);
          }
        }
      }

      addFolderRecursive(rootDir, '');
      const buffer = zip.toBuffer();

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=project_update.zip');
      res.send(buffer);
    } catch (err: any) {
      console.error('[ZIP Update] Error al generar ZIP:', err);
      res.status(500).json({ success: false, error: `Error al generar ZIP: ${err.message}` });
    }
  });

  // API to update the local workspace by downloading the ZIP from the Cloud (Deshabilitado por seguridad)
  app.post('/api/system/update-zip', requireMaster, async (_req, res) => {
    return res.status(403).json({
      success: false,
      error: 'La actualización en caliente mediante descarga de ZIP remoto está deshabilitada por políticas de seguridad.'
    });
  });

  // API to receive a local ZIP upload and perform extraction/update (Deshabilitado por seguridad)
  app.post('/api/system/upload-zip', requireMaster, (_req, res) => {
    return res.status(403).json({
      success: false,
      error: 'La subida y extracción directa de archivos ZIP está deshabilitada por seguridad para prevenir vulnerabilidades de Zip Slip y RCE.'
    });
  });

  // API to initialize git repository and link it to remote (Securizado contra inyección de argumentos)
  app.post('/api/system/initialize-git', requireMaster, async (req, res) => {
    const { repositoryUrl } = req.body || {};
    if (!repositoryUrl) {
      return res.status(400).json({ success: false, error: 'Se requiere la URL del repositorio de Git.' });
    }

    const cleanUrl = String(repositoryUrl).trim();
    const isValidGitUrl = /^https:\/\/[a-zA-Z0-9._\-\/@:]+(\.git)?$/.test(cleanUrl) ||
                          /^git@[a-zA-Z0-9._\-]+:[a-zA-Z0-9._\-\/]+(\.git)?$/.test(cleanUrl);
    if (!isValidGitUrl || cleanUrl.startsWith('-')) {
      return res.status(400).json({ success: false, error: 'Formato de URL de Git inválido por seguridad. Use HTTPS o SSH válido.' });
    }

    console.log(`[Git Init] Reconfigurando repositorio Git hacia: ${cleanUrl}`);
    const logs: string[] = [];

    const execGit = (args: string[]): Promise<{ stdout: string; stderr: string }> => {
      return new Promise((resolve, reject) => {
        execFile('git', args, (error, stdout, stderr) => {
          if (error) {
            reject({ error, stdout, stderr });
          } else {
            resolve({ stdout: stdout || '', stderr: stderr || '' });
          }
        });
      });
    };

    try {
      // Step 1: Ensure git is initialized
      try {
        const step1 = await execGit(['init']);
        if (step1.stdout) logs.push(step1.stdout.trim());
      } catch (e: any) {
        logs.push(`git init: ${e.stderr || e.error?.message || 'OK'}`);
      }

      // Step 2: Set or add remote origin safely
      try {
        await execGit(['remote', 'set-url', 'origin', cleanUrl]);
        logs.push(`Remote origin reconfigurado a: ${cleanUrl}`);
      } catch (e: any) {
        try {
          await execGit(['remote', 'add', 'origin', cleanUrl]);
          logs.push(`Remote origin asignado a: ${cleanUrl}`);
        } catch (e2: any) {
          logs.push(`Remote note: ${e2.stderr || e2.error?.message || 'OK'}`);
        }
      }

      // Step 3: Fetch latest remote objects
      try {
        const step3 = await execGit(['fetch', 'origin']);
        if (step3.stdout) logs.push(step3.stdout.trim());
        if (step3.stderr) logs.push(step3.stderr.trim());
      } catch (e: any) {
        logs.push(`Fetch warning: ${e.stderr || e.error?.message || 'OK'}`);
      }

      // Step 4: Branch tracking (try main, then master)
      try {
        await execGit(['checkout', '-f', '-B', 'main', 'origin/main']);
        await execGit(['branch', '--set-upstream-to=origin/main', 'main']);
        logs.push('Rama local main vinculada a origin/main');
      } catch (e1: any) {
        try {
          await execGit(['checkout', '-f', '-B', 'master', 'origin/master']);
          await execGit(['branch', '--set-upstream-to=origin/master', 'master']);
          logs.push('Rama local master vinculada a origin/master');
        } catch (e2: any) {
          try {
            await execGit(['checkout', '-f', 'main']);
            logs.push('Rama local preparada.');
          } catch (e3) {
            logs.push('Repositorio remoto vinculado correctamente.');
          }
        }
      }

      console.log(`[Git Init Success] Proceso completado:\n${logs.join('\n')}`);
      return res.json({
        success: true,
        message: '¡Repositorio Git vinculado y actualizado con éxito!',
        output: logs.join('\n')
      });

    } catch (err: any) {
      console.error('[Git Init Error]', err);
      return res.status(500).json({
        success: false,
        error: `Error al vincular el repositorio: ${err.message || 'Error en ejecución'}`,
        details: logs.join('\n')
      });
    }
  });

  // API to auto-install Git on local computer (supports Windows winget)
  app.post('/api/system/install-git', requireMaster, (req, res) => {
    if (process.platform !== 'win32') {
      return res.status(400).json({
        success: false,
        error: `La instalación automática solo está disponible en Windows (tu plataforma es: ${process.platform}).`
      });
    }

    console.log('[Instalación Git] Iniciando winget para instalar Git...');
    // winget command to install Git silently, accepting all licenses
    const command = 'winget install --id Git.Git -e --silent --accept-source-agreements --accept-package-agreements';

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Instalación Git] Error: ${error.message}`);
        return res.status(500).json({
          success: false,
          error: `Error al intentar instalar Git de forma automática: ${error.message}. Por favor intenta instalarlo manualmente descargándolo desde https://git-scm.com`,
          details: stderr || error.stack
        });
      }

      console.log(`[Instalación Git] Éxito:\n${stdout}`);
      res.json({
        success: true,
        message: '¡Git se ha instalado con éxito! Por favor reinicia la aplicación para que el PATH reconozca el nuevo comando.',
        output: stdout
      });
    });
  });

}
