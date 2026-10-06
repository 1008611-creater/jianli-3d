import type { SceneConfig } from './types'
import raw from './scene.json'

/** 强类型的场景配置（数据来自本地 scene.json，资源已本地化） */
export const sceneConfig = raw as unknown as SceneConfig

export type { SceneConfig }
