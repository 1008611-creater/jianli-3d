import type { SceneConfig } from './types'
import raw from './scene.json'

/**
 * 场景配置入口。
 *
 * `scene.json` 由 scripts/import-scene.mjs 从用户自有项目导出并本地化，
 * 所有素材路径已指向本站 /assets，不依赖任何第三方资源域名。
 */
export const scene = raw as unknown as SceneConfig

/** 全部相机 stop，按 order 升序（hero 之前为封面） */
export const stops = scene.nodes

/** stop 数量 */
export const stopCount = stops.length

export type { SceneConfig }
