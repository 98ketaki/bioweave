import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'

// Serve the natural-language parse endpoint in the same Node process as the dev
// server. The AI API key lives in this process's env (never the client bundle).
function geneApiPlugin(): PluginOption {
  return {
    name: 'gene-api',
    configureServer(server) {
      server.middlewares.use('/api/parse', (req, res, next) => {
        if (req.method !== 'POST') return next()
        server
          .ssrLoadModule('/src/server/apiHandler.ts')
          .then((mod) => mod.handleParse(req, res))
          .catch((err) => {
            server.config.logger.error(`[api/parse] ${err?.message ?? err}`)
            res.statusCode = 500
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: 'Internal error' }))
          })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), geneApiPlugin()],
})
