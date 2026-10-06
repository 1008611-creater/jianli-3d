#!/usr/bin/env node
/**
 * 把 Radiance .hdr 环境贴图压成轻量 WebP（等距柱状图）。
 *
 * ══ 为什么要做 ═══════════════════════════════════════════════
 * 服务器跨境出口实测只有 ~35KB/s（mtr 显示运营商网关 3054ms 尖峰、
 * 第 8 跳 20% 丢包）。原 .hdr 1.5MB / 缩放后 289KB 仍是首屏瓶颈，
 * 而它只是提供反射与氛围的 IBL 贴图，不需要这个保真度。
 *
 * ══ 为什么用 WebP 而不是「更小的 .hdr」 ═══════════════════════
 * .hdr 是无损 RGBE，天生臃肿。WebP 浏览器原生解码，同观感约 1/20 体积；
 * three 里用 TextureLoader + EquirectangularReflectionMapping 即可。
 * 代价是丢真实高光（8bit LDR），因此渲染端把 environmentIntensity
 * 调高补偿（见 AvatarModel.tsx）。对「半身人像 + 城市反射」观感无差异。
 *
 * ══ 踩过的坑（别重蹈覆辙）═══════════════════════════════════
 * 1. ❌ sharp 直接读 .hdr —— libvips 没编 Radiance 解码器，直接报
 *      "unsupported image format"。
 * 2. ❌ sharp 读 16bit PNG 做 raw() —— 会静默降到 uchar(8bit)，
 *      动态范围丢失，色调映射失效。
 * 3. ❌ 手搓 Reinhard + sRGB —— 暗部量化误差被放大成满屏彩色噪点。
 *      而且原始 HDRI 是干净的城市照片，噪点完全是自己引入的。
 * 4. ❌ zscale 色彩空间转换 —— 报 "no path between colorspaces"。
 * 5. ✅ 正解：ffmpeg 一条链做 tonemap + 提亮 + WebP 编码。
 *      tonemap=hable 是感知上最接近原图的算子，且不引入噪点。
 *
 * ══ 用法 ════════════════════════════════════════════════════
 *   node scripts/pack-hdri.mjs                    # city.hdr → city.webp
 *   node scripts/pack-hdri.mjs --width 512
 *   node scripts/pack-hdri.mjs --quality 90 --brightness 0.08 --gamma 1.6
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { stat } from 'node:fs/promises'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const argv = process.argv.slice(2)
const flag = (n, d) => {
  const i = argv.indexOf(`--${n}`)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d
}

const INPUT = path.resolve(root, flag('in', 'assets-src/env/city.hdr'))
const OUTPUT = path.resolve(root, flag('out', 'public/assets/env/city.webp'))
const WIDTH = parseInt(flag('width', '1024'), 10)
const QUALITY = parseInt(flag('quality', '85'), 10)
/** 提亮补偿：tonemap 后整体偏暗，用 eq 滤镜拉回来 */
const BRIGHTNESS = parseFloat(flag('brightness', '0.06'))
const GAMMA = parseFloat(flag('gamma', '1.5'))

const fmt = (b) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(2)} MB`

async function main() {
  const inStat = await stat(INPUT).catch(() => null)
  if (!inStat) {
    console.error(`✗ 找不到输入：${INPUT}`)
    process.exit(1)
  }

  // 关键顺序：先缩放（省算力）→ 转线性浮点 → Hable 色调映射
  //          → eq 提亮 → yuv420p（WebP 需要）→ 编码
  const vf = [
    `scale=${WIDTH}:-2`,
    'format=gbrpf32le',
    'tonemap=tonemap=hable:desat=0',
    `eq=brightness=${BRIGHTNESS}:gamma=${GAMMA}`,
    'format=yuv420p',
  ].join(',')

  execFileSync(
    'ffmpeg',
    [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', INPUT,
      '-vf', vf,
      '-c:v', 'libwebp',
      '-quality', String(QUALITY),
      '-compression_level', '6',
      '-frames:v', '1',
      '-update', '1',
      OUTPUT,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  )

  const outStat = await stat(OUTPUT)
  const saved = ((1 - outStat.size / inStat.size) * 100).toFixed(1)
  console.log(`输入  ${path.relative(root, INPUT)}  ${fmt(inStat.size)}`)
  console.log(`输出  ${path.relative(root, OUTPUT)}  ${fmt(outStat.size)}  ${WIDTH}×${WIDTH / 2}`)
  console.log(`压缩  -${saved}%   q=${QUALITY}  brightness=${BRIGHTNESS}  gamma=${GAMMA}`)
}

main().catch((e) => {
  console.error('✗ 失败：', e.message)
  process.exit(1)
})
