import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function googleSheetsProxyPlugin(): Plugin {
  return {
    name: 'google-sheets-proxy',
    configureServer(server) {
      server.middlewares.use('/api/sheets-proxy', async (req, res) => {
        try {
          const parsedUrl = new URL(req.url || '', 'http://localhost:3000');
          const targetUrl = parsedUrl.searchParams.get('url');
          if (!targetUrl) {
            res.statusCode = 400;
            res.end('Missing url parameter');
            return;
          }
          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/csv, text/plain, application/json, */*',
              'Cache-Control': 'no-cache',
            },
          });
          res.statusCode = response.status;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
          res.setHeader('Content-Type', response.headers.get('content-type') || 'text/csv; charset=utf-8');
          const data = await response.text();
          res.end(data);
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(err?.message || 'Error fetching Google Sheet');
        }
      });
    },
  };
}

function diarioBitcoinProxyPlugin(): Plugin {
  return {
    name: 'diariobitcoin-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/diariobitcoin')) {
          return next();
        }
        try {
          const endpoint = req.url.replace(/^\/api\/diariobitcoin/, '') || '/';
          const targetUrl = `https://www.diariobitcoin.com${endpoint}`;
          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Accept: 'application/json, text/xml, text/plain, */*',
              Referer: 'https://www.diariobitcoin.com/',
            },
          });
          res.statusCode = response.status;
          res.setHeader('Access-Control-Allow-Origin', '*');
          const contentType = response.headers.get('content-type') || 'application/json; charset=utf-8';
          res.setHeader('Content-Type', contentType);
          const buffer = await response.arrayBuffer();
          res.end(Buffer.from(buffer));
        } catch (err: any) {
          res.statusCode = 502;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: err?.message || 'Error proxying DiarioBitcoin request' }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), googleSheetsProxyPlugin(), diarioBitcoinProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
