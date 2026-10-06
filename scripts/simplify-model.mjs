/**
 * 简化 me.orig.glb 网格，大幅降低顶点/面数。
 *
 * 背景：me.orig.glb 是 3D 扫描导出的原始网格——102 万顶点、194 万三角形，
 * 即便用了 meshopt 压缩仍有 13.9MB。简历里只是一个半身像，
 * 这个量级严重过量，导致下载/解析/显存三重浪费。
 *
 * ── 实测结论（别凭感觉调参数）────────────────────────────────
 *   194 万面 → 11.6 万面（ratio 0.06）：1.26MB，但几何仍占 2.37MB(解压)
 *   11.6 万面 → 5,462 面（ratio 0.015）：0.39MB，**渲染观感几乎无差**
 *
 * 用无头 Chrome 同角度对比渲染后确认：5,462 面下花瓣层次、眼镜框、
 * 面部轮廓、衬衫褶皱全部保留；与 11.6 万面版本肉眼不可辨。
 * 半身像在 1.45 单位尺度下，5K 面已远超视网膜分辨所需。
 *
 * 注意：ratio 给到 0.03 与 0.015 结果几乎相同（都收敛到 ~5.5K 面），
 * 因为 simplifier 会先撞到 error 阈值。想更激进要放宽 error。
 *
 * ── 纹理为什么保留 1024 ──────────────────────────────────────
 * 降到 512 可再省 170KB（225KB），但近距离特写下花瓣与眼镜边缘发糊，
 * 得不偿失。颜色贴图 205KB + ORM 60KB + 法线 39KB ≈ 303KB 是合理下限。
 *
 * 用法：
 *   node scripts/simplify-model.mjs                  # 默认 ratio 0.015
 *   node scripts/simplify-model.mjs 0.01             # 更激进
 *   node scripts/simplify-model.mjs 0.015 --write    # 覆盖到 public/
 *
 * 默认只输出到 me.opt.glb 供预览，不覆盖发布文件。确认后用 --write 落地。
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { simplify, weld, dedup, prune, textureCompress } from '@gltf-transform/functions'
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer'
import sharp from 'sharp'
import { statSync, writeFileSync } from 'node:fs'

/** 原始素材（在 assets-src/，不进构建） */
const SRC = 'assets-src/models/me.orig.glb'
/** 发布产物 */
// 注意：当前线上必须保留原始建模；此脚本仅用于未来经确认后的对比实验。
const OUT = 'public/assets/models/me.bin'
/** 预览产物 */
const OPT = 'public/assets/models/me.opt.glb'

const argv = process.argv.slice(2)
const ratio = parseFloat(argv.find((a) => /^0?\.\d+$|^1$/.test(a)) ?? '0.015')
const doWrite = argv.includes('--write')

console.log(`\n════ 模型简化 ════`)
console.log(`源文件: ${SRC}`)
console.log(`目标比例: ${(ratio * 100).toFixed(1)}% 三角形\n`)

const before = statSync(SRC).size
console.log(`原始大小: ${(before / 1048576).toFixed(2)} MB`)

// 注册 meshopt 编解码器（GLB 用了 EXT_meshopt_compression）
await MeshoptDecoder.ready
await MeshoptEncoder.ready

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder,
  })

const doc = await io.read(SRC)
const root = doc.getRoot()

// 统计原始规模
let triBefore = 0
let vertBefore = 0
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const idx = prim.getIndices()
    const pos = prim.getAttribute('POSITION')
    triBefore += idx ? idx.getCount() / 3 : (pos?.getCount() ?? 0) / 3
    vertBefore += pos?.getCount() ?? 0
  }
}
console.log(`简化前: ${triBefore.toLocaleString()} 三角形, ${vertBefore.toLocaleString()} 顶点`)

// 1) 清理：合并重复顶点、去重、剪除未引用数据
console.log('\n[1/4] 清理网格…')
await doc.transform(dedup(), weld({ tolerance: 0.0001 }), prune())

// 2) 简化
console.log(`[2/4] 简化到 ${(ratio * 100).toFixed(1)}%…`)
await doc.transform(
  simplify({
    simplifier: MeshoptSimplifier,
    ratio,
    error: 0.01,          // 允许 1% 的几何误差
    lockBorder: false,    // 扫描网格无重要边界，允许自由简化
  }),
)

let triAfter = 0
let vertAfter = 0
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const idx = prim.getIndices()
    const pos = prim.getAttribute('POSITION')
    triAfter += idx ? idx.getCount() / 3 : (pos?.getCount() ?? 0) / 3
    vertAfter += pos?.getCount() ?? 0
  }
}
console.log(`简化后: ${triAfter.toLocaleString()} 三角形, ${vertAfter.toLocaleString()} 顶点`)
console.log(`降幅: ${(100 - (triAfter / triBefore) * 100).toFixed(1)}%`)

// 3) 压缩纹理
//    原主纹理是 2048×2048 的 JPEG。人物在屏幕上最多占几百像素，
//    降到 1024 肉眼无差。不要降到 512——特写下花瓣与眼镜边缘会发糊。
console.log('[3/4] 压缩纹理（2048 → 1024）…')
await doc.transform(
  textureCompress({
    encoder: sharp,        // 必须传 sharp 本体，传 {encode: fn} 会报 "encoder is not a function"
    targetFormat: 'jpeg',
    resize: [1024, 1024],
    quality: 82,
  }),
)
await doc.transform(prune())

// 4) 写出（保持 meshopt 压缩）
//    注意：源文件在 assets-src/，不会随构建发布，所以这里无需备份。
console.log('[4/4] 写出 meshopt 压缩的 GLB…')
const out = doWrite ? OUT : OPT
if (doWrite) {
  // 文件名故意使用 .bin 以命中 CDN 默认静态缓存，但内容必须仍是合法 GLB。
  const glb = await io.writeBinary(doc)
  writeFileSync(out, glb)
} else {
  await io.write(out, doc)
}

const after = statSync(out).size
console.log(`\n════ 结果 ════`)
console.log(`  输出: ${out}`)
console.log(`  ${(before / 1048576).toFixed(2)} MB → ${(after / 1024).toFixed(0)} KB  ` +
  `(减少 ${((1 - after / before) * 100).toFixed(1)}%)`)
console.log(`  三角形: ${triBefore.toLocaleString()} → ${triAfter.toLocaleString()}`)

if (!doWrite) {
  console.log(`\n  预览产物为 ${OPT}（未覆盖发布文件）。`)
  console.log(`  用无头 Chrome 对比渲染确认视觉无误后，再落地：`)
  console.log(`    node scripts/simplify-model.mjs ${ratio} --write`)
}
