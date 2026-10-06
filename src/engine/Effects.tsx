import { useMemo } from 'react'
import * as THREE from 'three'
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing'
import type { RenderConfig } from '@/data/types'

interface EffectsProps {
  render: RenderConfig
  /** 模型大致位置，用于景深对焦目标 */
  focusPoint: [number, number, number]
}

/**
 * 后处理管线：辉光 + 景深（镜头聚焦）。
 * 景深参数随 stop 切换平滑插值，产生"镜头对准"的观感。
 */
export function Effects({ render, focusPoint }: EffectsProps) {
  // postprocessing 的 DepthOfField 原生支持 target：
  // 它会在每帧用相机世界坐标计算真实焦距，避免把旧的配置距离或
  // 未完成阻尼的相机距离写进焦平面。focusPoint 与 CameraRig 共用世界坐标。
  const target = useMemo(() => {
    const [x, y, z] = focusPoint
    return new THREE.Vector3(x, y, z)
  }, [focusPoint])

  if (!render.bloom.enabled && !render.dof.enabled) return null

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {render.bloom.enabled ? (
        <Bloom
          intensity={render.bloom.intensity}
          luminanceThreshold={render.bloom.threshold}
          luminanceSmoothing={0.3}
          mipmapBlur
        />
      ) : (
        <></>
      )}
      {render.dof.enabled ? (
        <DepthOfField
          target={target}
          // 使用目标点自动计算焦平面；近距离人像不适合 0.5 的窄焦区，
          // 否则脸部稍有纵深就会整体发糊。保留轻微景深，不牺牲主体可读性。
          focusRange={Math.max(1.2, render.dof.focusRange)}
          bokehScale={Math.min(1.5, render.dof.bokeh)}
        />
      ) : (
        <></>
      )}
    </EffectComposer>
  )
}

// 避免未使用的导入告警
export type { EffectsProps }
