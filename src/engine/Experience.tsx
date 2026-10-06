import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { AvatarModel, SceneEnvironment } from './AvatarModel'
import { SceneLights } from './SceneLights'
import { CameraRig } from './CameraRig'
import { Effects } from './Effects'
import type { SceneConfig } from '@/data/types'

interface ExperienceProps {
  config: SceneConfig
  /** 全局滚动进度 0..1 */
  progress: number
  /** 当前聚焦的 stop 索引 */
  activeIndex: number
  /** 调试/深链：锁定轨道索引（0=封面，n=第 n 个 stop）；null 时由滚动驱动 */
  pinnedIndex?: number | null
  onModelReady?: () => void
}

/**
 * 3D 舞台：组装环境、灯光、模型、贴纸、镜头与后处理。
 */
export function Experience({
  config,
  progress,
  activeIndex,
  pinnedIndex = null,
  onModelReady,
}: ExperienceProps) {
  const { decals, nodes, hero, presentation } = config

  // 轨道索引 0 是 hero，1..N 才对应 nodes[0..N-1]。
  // 这里必须与 CameraRig 的轨道定义保持一致，否则 stop=0 会错误套用第一个 stop 的景深。
  const activeNode = activeIndex > 0 ? nodes[Math.min(activeIndex - 1, nodes.length - 1)] : undefined

  // 当前聚焦 stop 的渲染参数（用于切换辉光/景深）
  const activeRender = useMemo(() => activeNode?.render ?? hero.render, [activeNode, hero.render])

  // 对焦点：当前轨道点的注视目标
  const focusPoint = useMemo<[number, number, number]>(() => {
    const t = activeNode?.camera.target ?? hero.camera.target
    return [t[0], t[1], t[2]]
  }, [activeNode, hero.camera.target])

  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      camera={{ fov: 45, near: 0.01, far: 100, position: hero.camera.position }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color(hero.render.background), 1)
      }}
    >
      <Suspense fallback={null}>
        <SceneEnvironment
          preset={presentation.environment.preset}
          intensity={presentation.environment.intensity}
          rotation={presentation.environment.rotation}
          background={hero.render.background}
        />
        <SceneLights lights={activeRender.lights} background={hero.render.background} />
        <AvatarModel
          decals={decals}
          parallax={presentation.pointerParallax}
          onReady={onModelReady}
        />
        <CameraRig
          heroCamera={hero.camera}
          stops={nodes}
          progress={progress}
          parallax={presentation.pointerParallax ? 0.05 : 0}
          pinnedIndex={pinnedIndex}
        />
        <Effects render={activeRender} focusPoint={focusPoint} />
      </Suspense>
    </Canvas>
  )
}
