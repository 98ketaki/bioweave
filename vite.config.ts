import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'

// Serve the backend API endpoints in the same Node process as the dev server.
// The AI API key lives in this process's env (never the client bundle).
function geneApiPlugin(): PluginOption {
  // path -> exported handler name in src/server/apiHandler.ts
  const routes: Record<string, string> = {
    '/api/parse': 'handleParse',
    '/api/ask': 'handleAsk',
    '/api/detail': 'handleDetail',
  }
  return {
    name: 'gene-api',
    configureServer(server) {
      for (const [path, handlerName] of Object.entries(routes)) {
        server.middlewares.use(path, (req, res, next) => {
          if (req.method !== 'POST') return next()
          server
            .ssrLoadModule('/src/server/apiHandler.ts')
            .then((mod) => mod[handlerName](req, res))
            .catch((err) => {
              server.config.logger.error(`[${path}] ${err?.message ?? err}`)
              res.statusCode = 500
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ error: 'Internal error' }))
            })
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), geneApiPlugin()],
})
