import * as THREE from 'three'
import type { Vec3 } from '@/data/types'

/** 把 [x,y,z] 元组转成 Vector3 */
export function toVec3(v: Vec3): THREE.Vector3 {
  return new THREE.Vector3(v[0], v[1], v[2])
}

/** 线性插值 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** 平滑步进（用于滚动进度的柔和过渡） */
export function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/** 缓出，镜头推进更有质感 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * 根据法线构造贴纸朝向：
 * 贴纸平面法线对齐给定表面法线，绕该轴按 rotation 自转。
 * 返回可直接用于 mesh.quaternion 的四元数。
 */
export function orientationFromNormal(
  normal: Vec3,
  rotation: number,
  out = new THREE.Quaternion(),
): THREE.Quaternion {
  const n = toVec3(normal).normalize()
  // 贴纸默认朝 +Z，需要把 +Z 旋转到 n
  const from = new THREE.Vector3(0, 0, 1)
  out.setFromUnitVectors(from, n)
  if (rotation !== 0) {
    const spin = new THREE.Quaternion().setFromAxisAngle(n, rotation)
    out.premultiply(spin)
  }
  return out
}

/** 限制范围 */
export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/** 归一化到 0..1 */
export function norm(v: number, min: number, max: number): number {
  if (max === min) return 0
  return clamp((v - min) / (max - min), 0, 1)
}
