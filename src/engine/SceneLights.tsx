import * as THREE from 'three'
import type { RenderConfig } from '@/data/types'

/**
 * 场景灯光：环境光 + 主光（按配置的角度与高度布置）。
 * 角度以相机朝向为基准绕 Y 轴旋转，高度决定主光的仰角。
 */
export function SceneLights({ lights, background }: { lights: RenderConfig['lights']; background: string }) {
  const { ambient, key } = lights

  // 由角度/高度推算主光方向
  const rad = (key.angle ?? 45) * (Math.PI / 180)
  const r = 3
  const pos: [number, number, number] = [
    Math.cos(rad) * r,
    (key.height ?? 1.2) * 2,
    Math.sin(rad) * r,
  ]

  return (
    <>
      <color attach="background" args={[background]} />
      <ambientLight intensity={ambient.intensity} color={ambient.color} />
      <directionalLight
        position={pos}
        intensity={key.intensity}
        color={key.color}
        castShadow={false}
      />
      {/* 补光：柔化背光面，避免主体轮廓过暗 */}
      <directionalLight
        position={[-pos[0], pos[1] * 0.5, -pos[2]]}
        intensity={key.intensity * 0.35}
        color={key.color}
      />
      <pointLight position={[0, -1.2, 1.6]} intensity={0.35} color={'#ffffff'} />
    </>
  )
}

/** 供外部复用的 THREE 常量（避免 bundler tree-shaking 掉 three） */
export const THREE_SRGB = THREE.SRGBColorSpace
