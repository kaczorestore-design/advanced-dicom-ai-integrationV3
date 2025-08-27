import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import fs from 'fs'

// Plugin to handle GLSL files as text
const glslPlugin = () => {
  return {
    name: 'glsl-loader',
    transform(code: string, id: string) {
      if (id.endsWith('.glsl')) {
        return `export default ${JSON.stringify(code)};`
      }
    },
    load(id: string) {
      if (id.endsWith('.glsl')) {
        try {
          const content = fs.readFileSync(id, 'utf-8')
          return `export default ${JSON.stringify(content)};`
        } catch {
          // Ignore file read errors
          return `export default '';`
        }
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), glslPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['vtk.js'],
    include: [
      'cornerstone-core',
      'cornerstone-tools', 
      'cornerstone-wado-image-loader',
      'dicom-parser'
    ],
  },
})

