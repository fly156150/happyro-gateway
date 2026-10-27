require('dotenv').config();
const environment = require('./environment').readEnvironment();
const { createRuntimeConfig, createRuntimeConfigHandler } = require('./runtime-config');
const runtimeConfig = createRuntimeConfig();

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const net = require('net');
const { randomUUID } = require('crypto');
const compression = require('compression');
const logger = require('./src/utils/logger');
const { bridgeGameStream } = require('./src/utils/gameStreamProxy');
const StartupValidator = require('./src/validators/startupValidator');

const app = express();
const server = http.createServer(app);
const port = environment.HAPPYRO_GATEWAY_LISTEN_PORT;
const routes = require('./src/routes');
const debugMiddleware = require('./src/middlewares/debugMiddleware');
const createRawImportMiddleware = require('./src/middlewares/rawImportMiddleware');
const { createHttpProxyMiddleware } = require('./src/middlewares/httpProxyMiddleware');
const { createGameSessionRouter } = require('./src/routes/gameSession');
const { createClientDiagnosticsRouter } = require('./src/routes/clientDiagnostics');

const HAPPYRO_GAME_PUBLIC_URL = environment.HAPPYRO_GAME_PUBLIC_URL;
const HAPPYRO_GATEWAY_WS_PROXY_ENABLED = environment.HAPPYRO_GATEWAY_WS_PROXY_ENABLED;
const HAPPYRO_GATEWAY_STATIC_SERVE_ENABLED = environment.HAPPYRO_GATEWAY_STATIC_SERVE_ENABLED;
const HAPPYRO_GATEWAY_ESRGAN_ENABLED = environment.HAPPYRO_GATEWAY_ESRGAN_ENABLED;
const HAPPYRO_GATEWAY_ESRGAN_CACHE_DIR = process.env.HAPPYRO_GATEWAY_ESRGAN_CACHE_DIR || './upscaled_cache';
const HAPPYRO_GATEWAY_PWA_DIR = process.env.HAPPYRO_GATEWAY_PWA_DIR || '../../repos/happyro-client/dist/Web';
const HAPPYRO_GATEWAY_PWA_PUBLIC_PATH = process.env.HAPPYRO_GATEWAY_PWA_PUBLIC_PATH || '/';
const HAPPYRO_GATEWAY_GAME_WEB_UPSTREAM_URL = environment.HAPPYRO_GATEWAY_GAME_WEB_UPSTREAM_URL;
const HAPPYRO_GATEWAY_API_UPSTREAM_URL = environment.HAPPYRO_GATEWAY_API_UPSTREAM_URL;
const HAPPYRO_GATEWAY_HTTP_PROXY_TIMEOUT_MS = environment.HAPPYRO_GATEWAY_HTTP_PROXY_TIMEOUT_MS;
const IS_PROD = process.env.NODE_ENV === 'production';

// Global variable to store validation status
let validationStatus = null;

// Game asset extensions that benefit from compression
const COMPRESSIBLE_GAME_EXTENSIONS = /\.(spr|act|rsm|gnd|gat|rsw|str|bmp|tga|pal|lub|lua|txt|xml)$/i;

// Main startup function
async function startServer() {
  // Run startup validation
  logger.info(`Starting roBrowser Remote Client... [${IS_PROD ? 'production' : 'development'}]\n`);

  const validator = new StartupValidator();
  const results = await validator.validateAll();

  // Store status for API endpoint
  validationStatus = validator.getStatusJSON();

  // Print report (verbose in dev, silent in prod unless errors)
  if (IS_PROD) {
    if (!results.success) {
      validator.printReport(results);
    }
  } else {
    validator.printReport(results);
  }

  // If there are fatal errors, exit
  if (!results.success) {
    logger.error('Server cannot start due to configuration errors.');
    logger.error('Run "npm run doctor" for a full diagnosis.\n');
    process.exit(1);
  }

  // CORS setup - allow all localhost variations
  const corsOptions = {
    origin: [
      HAPPYRO_GAME_PUBLIC_URL,
      'http://localhost:8000',
      'http://127.0.0.1:8000',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'http://localhost:3338',
      'http://127.0.0.1:3338',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    credentials: true,
  };

  app.use(cors(corsOptions));

  // Compression middleware - compresses text AND binary game assets.
  // Registered before the proxies so proxied API responses are compressed too.
  app.use(compression({
    threshold: 1024,
    filter: (req, res) => {
      // Compress game assets (SPR, RSM, GND, etc.) that are highly compressible
      if (COMPRESSIBLE_GAME_EXTENSIONS.test(req.path)) {
        return true;
      }
      // Default compression filter for text/json/etc
      return compression.filter(req, res);
    }
  }));

  app.use('/api/adventure-tools', createHttpProxyMiddleware({
    targetUrl: HAPPYRO_GATEWAY_API_UPSTREAM_URL,
    path: request => `/api/adventure-tools${request.url}`,
    timeoutMs: HAPPYRO_GATEWAY_HTTP_PROXY_TIMEOUT_MS,
    logger,
    serviceName: 'Admin adventure tools',
    unavailableBody: { message: 'Adventure tools service unavailable' },
  }));

  app.use('/api/game-session', createGameSessionRouter({ targetUrl: HAPPYRO_GATEWAY_GAME_WEB_UPSTREAM_URL }));

  if (HAPPYRO_GATEWAY_GAME_WEB_UPSTREAM_URL) {
    const proxyPrefixes = ['/charconfig', '/emblem', '/MerchantStore', '/party', '/userconfig', '/get'];
    const proxy = createHttpProxyMiddleware({
      targetUrl: HAPPYRO_GATEWAY_GAME_WEB_UPSTREAM_URL,
      timeoutMs: HAPPYRO_GATEWAY_HTTP_PROXY_TIMEOUT_MS,
      logger,
      serviceName: 'rAthena Web API',
      unavailableBody: { error: 'rAthena Web API unavailable' },
    });

    app.use((req, res, next) => {
      if (!proxyPrefixes.some(prefix => req.path === prefix || req.path.startsWith(`${prefix}/`))) {
        return next();
      }

      proxy(req, res);
    });

    logger.info(`rAthena Web API proxy enabled for ${proxyPrefixes.join(', ')}`);
  }

  app.use('/api/client-diagnostics', await createClientDiagnosticsRouter({
    directory: process.env.HAPPYRO_GATEWAY_CLIENT_DIAGNOSTICS_DIR,
  }));
  if (process.env.HAPPYRO_GATEWAY_CLIENT_DIAGNOSTICS_DIR) {
    logger.info(`Client diagnostics: ${path.resolve(process.env.HAPPYRO_GATEWAY_CLIENT_DIAGNOSTICS_DIR)}`);
  }

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Debug middleware only in development
  if (!IS_PROD) {
    app.use(debugMiddleware);
  }

  // ESRGAN upscaling middleware - serves upscaled assets from disk cache
  // Plugin: @chicowall/robrowser-esrgan (external package)
  let esrganInstance = null;
  if (HAPPYRO_GATEWAY_ESRGAN_ENABLED) {
    const createEsrganMiddleware = require('@chicowall/robrowser-esrgan');
    const cachePath = path.resolve(__dirname, HAPPYRO_GATEWAY_ESRGAN_CACHE_DIR);
    esrganInstance = await createEsrganMiddleware({ cacheDir: cachePath, logger });
    app.use(esrganInstance.middleware);
  }

  // Validation status endpoint (JSON for frontend)
  app.get('/api/health', (req, res) => {
    const Client = require('./src/controllers/clientController');
    const missingInfo = Client.getMissingFilesSummary ? Client.getMissingFilesSummary() : null;
    const cacheStats = Client.getCacheStats ? Client.getCacheStats() : null;
    const indexStats = Client.getIndexStats ? Client.getIndexStats() : null;

    res.json({
      ...validationStatus,
      timeZone: runtimeConfig.timeZone,
      missingFiles: missingInfo,
      cache: cacheStats,
      index: indexStats,
      esrgan: esrganInstance ? esrganInstance.getStats() : { enabled: false },
    });
  });

  // Missing files endpoint
  app.get('/api/missing-files', (req, res) => {
    const Client = require('./src/controllers/clientController');
    const summary = Client.getMissingFilesSummary ? Client.getMissingFilesSummary() : { total: 0, files: [] };
    res.json(summary);
  });

  // Cache stats endpoint
  app.get('/api/cache-stats', (req, res) => {
    const Client = require('./src/controllers/clientController');
    res.json({
      cache: Client.getCacheStats ? Client.getCacheStats() : null,
      index: Client.getIndexStats ? Client.getIndexStats() : null,
    });
  });

  // This route takes precedence over the placeholder shipped with the static PWA.
  app.get(`${HAPPYRO_GATEWAY_PWA_PUBLIC_PATH.replace(/\/$/, '')}/Config.runtime.js`, createRuntimeConfigHandler(runtimeConfig));

  // Serve roBrowserLegacy static files (replaces live-server)
  if (HAPPYRO_GATEWAY_STATIC_SERVE_ENABLED) {
    const roBrowserAbsPath = path.resolve(__dirname, HAPPYRO_GATEWAY_PWA_DIR);
    logger.debug(`Static serve enabled: ${roBrowserAbsPath}`);

    // Handle Vite-style ?raw imports (must come before express.static)
    app.use(HAPPYRO_GATEWAY_PWA_PUBLIC_PATH, createRawImportMiddleware(roBrowserAbsPath));

    app.use(HAPPYRO_GATEWAY_PWA_PUBLIC_PATH, express.static(roBrowserAbsPath));
  }

  // API routes (GRF file serving, search, etc.)
  app.use('/', routes);

  // Embedded WebSocket proxy (replaces standalone wsproxy)
  if (HAPPYRO_GATEWAY_WS_PROXY_ENABLED) {
    const WebSocket = require('ws');
    const wss = new WebSocket.Server({ noServer: true, maxPayload: 64 * 1024 });

    // Allowed rAthena targets (security: only explicitly listed game servers).
    // Override via HAPPYRO_GATEWAY_WS_ALLOWED_TARGETS (comma-separated host:port) for deployments
    // that cannot use host networking (Kubernetes, Docker Desktop on macOS/Windows,
    // remote rAthena hosts).  The localhost-only default is preserved when the
    // variable is absent or empty.
    const ALLOWED_TARGETS = process.env.HAPPYRO_GATEWAY_WS_ALLOWED_TARGETS
      ? process.env.HAPPYRO_GATEWAY_WS_ALLOWED_TARGETS.split(',').map(s => s.trim())
      : [
          '127.0.0.1:6900',  // Login
          '127.0.0.1:6121',  // Char
          '127.0.0.1:5121',  // Map
        ];
    const TARGET_REDIRECTS = Object.fromEntries(
      (process.env.HAPPYRO_GATEWAY_WS_TARGET_REDIRECTS || '')
        .split(',')
        .map(entry => entry.trim().split('='))
        .filter(([source, destination]) => source && destination)
    );

    server.on('upgrade', (req, socket, head) => {
      if (req.url.startsWith('/ws/')) {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      } else {
        socket.destroy();
      }
    });

    wss.on('connection', (ws, req) => {
      // Strip the /ws/ prefix to get "host:port"
      // Use slice (not replace) so a misconfigured socketProxy with no /ws path
      // produces an obviously-invalid target rather than a partial match.
      const target = req.url.slice('/ws/'.length);

      // Validate target format before allowlist check
      const colonIdx = target.lastIndexOf(':');
      const host = colonIdx !== -1 ? target.slice(0, colonIdx) : '';
      const targetPort = colonIdx !== -1 ? parseInt(target.slice(colonIdx + 1), 10) : NaN;

      if (!host || !Number.isInteger(targetPort) || targetPort < 1 || targetPort > 65535) {
        logger.warn(`WS proxy rejected malformed target: "${target}"`);
        ws.close();
        return;
      }

      logger.info(`WS attempt: ${target}`);

      if (!ALLOWED_TARGETS.includes(target)) {
        logger.warn(`WS proxy blocked: ${target} (allowed: ${ALLOWED_TARGETS.join(', ')})`);
        ws.close();
        return;
      }

      const destination = TARGET_REDIRECTS[target] || target;
      const destinationColonIdx = destination.lastIndexOf(':');
      const destinationHost = destinationColonIdx !== -1 ? destination.slice(0, destinationColonIdx) : '';
      const destinationPort = destinationColonIdx !== -1
        ? parseInt(destination.slice(destinationColonIdx + 1), 10)
        : NaN;

      if (!destinationHost || !Number.isInteger(destinationPort) || destinationPort < 1 || destinationPort > 65535) {
        logger.warn(`WS proxy rejected malformed destination: "${destination}"`);
        ws.close();
        return;
      }

      const connectionId = randomUUID();
      const connectionLog = event => logger.info(JSON.stringify({
        timestamp: new Date().toISOString(), component: 'game-proxy', connectionId,
        target, destination, ...event
      }));
      connectionLog({ event: 'connecting' });
      const tcp = net.connect(destinationPort, destinationHost);
      tcp.setNoDelay(true);

      tcp.on('connect', () => {
        connectionLog({ event: 'connected' });
      });
      bridgeGameStream(ws, tcp, {
        onClose: reason => connectionLog({ event: 'closed', reason, bytesRead: tcp.bytesRead, bytesWritten: tcp.bytesWritten })
      });
    });

    logger.info(`WebSocket proxy enabled on /ws/ (allowed: ${ALLOWED_TARGETS.join(', ')})`);
  }

  server.listen(port, process.env.HAPPYRO_GATEWAY_LISTEN_HOST, async () => {
    logger.info(`Server ready on http://localhost:${port}` +
      (HAPPYRO_GATEWAY_STATIC_SERVE_ENABLED ? ` | Game: http://localhost:${port}${HAPPYRO_GATEWAY_PWA_PUBLIC_PATH}/index.html` : '') +
      (HAPPYRO_GATEWAY_WS_PROXY_ENABLED ? ` | WS Proxy: /ws/` : ''));

    // Cache warm-up (runs after server is ready, non-blocking)
    if (environment.HAPPYRO_GATEWAY_CACHE_WARMUP_ENABLED) {
      const warmLimit = environment.HAPPYRO_GATEWAY_CACHE_WARMUP_MAX_FILES;
      logger.debug(`Warming cache (up to ${warmLimit} files)...`);
      const Client = require('./src/controllers/clientController');
      Client.warmCache([], warmLimit).catch(err => {
        logger.error('Cache warm-up error:', err.message);
      });
    }
  });
}

// Start server
startServer().catch((error) => {
  logger.error('Fatal error while starting server:', error);
  process.exit(1);
});
