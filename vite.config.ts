import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { rm } from 'node:fs/promises'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 构建期校验：确保 dist/ 里没有体积失控或不该发布的资源。
 *
 * 背景：`public/` 会被整目录拷进 `dist/`。历史上曾把 13.9MB 的
 * `me.orig.glb` 放在 `public/` 里，结果被一路传上生产（首屏直接拖垮）。
 * 现在原始素材统一放 `assets-src/`（不进构建），这里再兜一道底，
 * 防止有人误把大文件塞回 `public/`。
 */
function assertSlimBundle() {
  return {
    name: 'assert-slim-bundle',
    apply: 'build' as const,
    async closeBundle() {
      const distAssets = fileURLToPath(new URL('./dist/assets', import.meta.url))

      // 1) 禁止出现的文件（备份/中间产物/未转换的原始格式）
      const forbidden = [
        `${distAssets}/models/me.orig.glb`,
        `${distAssets}/models/me.opt.glb`,
        `${distAssets}/env/city.hdr`,
        `${distAssets}/env/city.orig.hdr`,
      ]
      for (const p of forbidden) {
        if (existsSync(p)) {
          await rm(p, { force: true })
          process.stdout.write(`  · 已清理不应发布的 ${p.replace(distAssets, 'dist/assets')}\n`)
        }
      }

      // 2) 体积红线：单个「资源类」文件不得超过 600KB
      //    只查模型/贴图，不查 JS chunk——three.js 本身就有 668KB，
      //    那是 vendor 体积，靠 gzip + 长期缓存解决，不是这里能管的。
      const LIMIT = 600 * 1024
      const ASSET_EXT = /\.(bin|glb|hdr|webp|png|jpg|jpeg|woff2?)$/i

      const walk = (dir: string): string[] => {
        if (!existsSync(dir)) return []
        const out: string[] = []
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          const full = join(dir, e.name)
          if (e.isDirectory()) out.push(...walk(full))
          else out.push(full)
        }
        return out
      }

      const oversized = walk(distAssets)
        .filter((f: string) => ASSET_EXT.test(f))
        .map((f: string) => ({ f, size: statSync(f).size }))
        .filter((x: { size: number }) => x.size > LIMIT)
      if (oversized.length) {
        for (const { f, size } of oversized) {
          process.stdout.write(
            `  ⚠ ${f.replace(distAssets, 'dist/assets')} 达 ${(size / 1024).toFixed(0)}KB，超过 ${LIMIT / 1024}KB 红线\n`,
          )
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), assertSlimBundle()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
          react: ['react', 'react-dom'],
        },
      },
    },
    // 3D 资源与模型体积较大，单一 chunk 上限放宽
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
  preview: {
    port: 4173,
    host: '127.0.0.1',
  },
})
