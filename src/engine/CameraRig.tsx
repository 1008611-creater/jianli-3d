import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import type { SceneNode, Vec3 } from '@/data/types'
import { easeInOutCubic, toVec3 } from './math'

interface CameraRigProps {
  /** 封面机位 */
  heroCamera: { position: Vec3; target: Vec3 }
  /** 全部 stop（含各自机位） */
  stops: SceneNode[]
  /** 当前滚动进度 0..1，跨 stops 展开 */
  progress: number
  /** 指针视差强度 */
  parallax: number
  /**
   * 调试/深链：把镜头锁在指定轨道索引（0 = 封面，n = 第 n 个 stop）。
   * 为 null 时由 progress 驱动。
   */
  pinnedIndex?: number | null
}

/**
 * 镜头运动：把「滚动进度」映射为镜头在 hero→stop1→…→stopN 之间的平滑插值。
 * 这是"镜头聚焦 + 镜头运动"的核心实现。
 */
export function CameraRig({
  heroCamera,
  stops,
  progress,
  parallax,
  pinnedIndex = null,
}: CameraRigProps) {
  const { camera, size, pointer } = useThree()
  const current = useRef({ pos: new THREE.Vector3(), tgt: new THREE.Vector3(), ready: false })

  // 把 hero + 全部 stop 串成一条轨道
  const track = useMemo(() => {
    const points = [
      { position: heroCamera.position, target: heroCamera.target },
      ...stops.map((s) => ({ position: s.camera.position, target: s.camera.target })),
    ]
    return points.map((p) => ({
      pos: toVec3(p.position),
      tgt: toVec3(p.target),
    }))
  }, [heroCamera, stops])

  const aspect = size.width / Math.max(1, size.height)

  useFrame((_, delta) => {
    if (track.length === 0) return

    // 进度映射到轨道段；pinnedIndex 时直接锁定到该点
    const segCount = track.length - 1
    const raw =
      pinnedIndex === null
        ? Math.min(0.9999, Math.max(0, progress)) * segCount
        : Math.min(segCount, Math.max(0, pinnedIndex))
    const idx = Math.floor(raw)
    const t = easeInOutCubic(raw - idx)
    const a = track[idx]
    const b = track[Math.min(track.length - 1, idx + 1)]

    const targetPos = new THREE.Vector3().lerpVectors(a.pos, b.pos, t)
    const targetLook = new THREE.Vector3().lerpVectors(a.tgt, b.tgt, t)

    // 指针视差：轻微偏移镜头，让画面跟随鼠标呼吸
    if (parallax > 0) {
      targetPos.x += pointer.x * parallax
      targetPos.y += pointer.y * parallax * 0.6
    }

    // 竖屏/窄屏时镜头稍微后退，保证主体完整入画
    if (aspect < 1) {
      const dir = new THREE.Vector3().subVectors(targetPos, targetLook).normalize()
      // 窄屏需要比桌面多留出正文安全区，避免人像压住长段落。
      // 只影响 aspect < 1 的设备，桌面机位保持原构图。
      targetPos.addScaledVector(dir, (1 / aspect - 1) * 1.5)
    }

    if (!current.current.ready) {
      current.current.pos.copy(targetPos)
      current.current.tgt.copy(targetLook)
      current.current.ready = true
    } else {
      // 阻尼跟随，避免滚动抖动直接传给镜头
      const lambda = 6
      current.current.pos.x = THREE.MathUtils.damp(current.current.pos.x, targetPos.x, lambda, delta)
      current.current.pos.y = THREE.MathUtils.damp(current.current.pos.y, targetPos.y, lambda, delta)
      current.current.pos.z = THREE.MathUtils.damp(current.current.pos.z, targetPos.z, lambda, delta)
      current.current.tgt.x = THREE.MathUtils.damp(current.current.tgt.x, targetLook.x, lambda, delta)
      current.current.tgt.y = THREE.MathUtils.damp(current.current.tgt.y, targetLook.y, lambda, delta)
      current.current.tgt.z = THREE.MathUtils.damp(current.current.tgt.z, targetLook.z, lambda, delta)
    }

    camera.position.copy(current.current.pos)
    camera.lookAt(current.current.tgt)
  })

  return null
}
