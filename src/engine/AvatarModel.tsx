import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, useLoader } from '@react-three/fiber'
import { useGLTF, Environment } from '@react-three/drei'
import type { DecalConfig, RenderConfig } from '@/data/types'
import { orientationFromNormal, toVec3 } from './math'

const MODEL_URL = '/assets/models/me.bin?v=original-20260918'


interface AvatarModelProps {
  decals: DecalConfig[]
  /** 指针视差开关 */
  parallax: boolean
  onReady?: () => void
}

/**
 * 主模型：加载 GLB、归一化到与镜头标度匹配的空间，并贴纸贴合表面。
 *
 * 归一化策略（关键）：
 * GLB 经 GLTFLoader 加载后（node 自带 scale 0.49 已应用）实际尺寸约
 * (0.64, 0.98, 0.97)，即约 1 个单位。而贴纸锚点、镜头机位（距离 1.4~2.2）
 * 也都在同一数量级，说明场景坐标系就是这套「单位空间」。
 *
 * 因此把模型最长边归一到 MODEL_SPAN：值越大，人物在画面中占比越大。
 * 1.45 对应原站那种半身特写构图。
 */
const MODEL_SPAN = 1.45

export function AvatarModel({
  decals,
  parallax,
  onReady,
}: AvatarModelProps) {
  const inner = useRef<THREE.Group>(null)
  const { scene: gltf } = useGLTF(MODEL_URL)
  const { pointer } = useThree()

  // 归一化：把模型包围盒中心移到原点，最长边缩放到 1 个单位。
  // 变换后，场景内所有坐标（贴纸、镜头）统一生活在 ±0.5 量级的单位空间。
  const { factor, modelOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(gltf)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    const f = MODEL_SPAN / maxDim
    return {
      factor: f,
      // 在模型自身坐标系内把中心挪到原点
      modelOffset: [
        -center.x * f,
        -center.y * f,
        -center.z * f,
      ] as [number, number, number],
    }
  }, [gltf])

  useEffect(() => {
    const id = window.setTimeout(() => onReady?.(), 0)
    return () => window.clearTimeout(id)
  }, [onReady])

  useFrame((_, delta) => {
    if (!inner.current || !parallax) return
    const tx = pointer.x * 0.06
    const ty = pointer.y * 0.04
    inner.current.rotation.y = THREE.MathUtils.damp(inner.current.rotation.y, tx, 3, delta)
    inner.current.rotation.x = THREE.MathUtils.damp(inner.current.rotation.x, -ty, 3, delta)
  })

  return (
    <group ref={inner}>
      {/* 模型与贴纸同处「单位空间」：模型被缩放到单位空间，贴纸锚点本就定义在单位空间 */}
      <group scale={factor}>
        <group position={modelOffset}>
          <primitive object={gltf} />
        </group>
      </group>

      {/* 贴纸锚点处于单位空间，直接挂载，并经射线投射吸附到模型真实表面 */}
      <Stickers decals={decals} target={gltf} spanScale={factor} />
    </group>
  )
}

/**
 * 贴纸层。
 *
 * 锚点数据来自「半径 0.5 的参考球面」，而模型实际是椭球（y 半轴 0.5、
 * x 半轴约 0.33），锚点在 x 方向普遍比真实表面远出 30~50%。
 * 直接用锚点坐标会让贴纸浮在脸前并相互堆叠。
 *
 * 因此这里只取「方位语义」：把锚点方向作为贴纸在模型上的方位，
 * 再从模型中心沿该方向做射线投射求交，命中点即真实表面落点。
 * 贴纸朝向对齐命中面的真实法线。未命中时按方位投影到参考椭球面兜底。
 */
function Stickers({
  decals,
  target,
  spanScale,
}: {
  decals: DecalConfig[]
  target: THREE.Object3D | null
  /** 模型归一化系数：贴纸尺寸需同比例缩放才能与模型保持原始比例 */
  spanScale: number
}) {
  const groupRef = useRef<THREE.Group>(null)

  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader()
    return decals.map((d) => {
      const t = loader.load(d.imageUrl)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 4
      return t
    })
  }, [decals])

  // 射线投射吸附：在贴纸父级（单位空间）内求解
  // 模型已被缩放到同一单位空间，因此射线可直接与模型求交
  //
  // 依赖 orderKey 触发重算：首帧父级矩阵尚未就绪，需要等布局完成后重解一次。
  const [orderKey, setOrderKey] = useState(0)
  useLayoutEffect(() => {
    if (groupRef.current) {
      groupRef.current.updateWorldMatrix(true, false)
      setOrderKey((k) => (k === 0 ? 1 : k))
    }
  }, [])

  const placements = useMemo(() => {
    void orderKey
    if (!target) return null
    const parent = groupRef.current
    if (!parent) return null
    target.updateWorldMatrix(true, true)
    parent.updateWorldMatrix(true, false)

    const parentMatrix = parent.matrixWorld.clone()
    const parentInverse = new THREE.Matrix4().copy(parentMatrix).invert()

    // 模型在父级空间中的实际包围盒 —— 用于确定射线起射距离与兜底椭球
    const modelBox = new THREE.Box3().setFromObject(target)
    const localBox = modelBox.clone().applyMatrix4(parentInverse)
    const localSize = new THREE.Vector3()
    const localCenter = new THREE.Vector3()
    localBox.getSize(localSize)
    localBox.getCenter(localCenter)
    const reach = Math.max(localSize.x, localSize.y, localSize.z) || 1

    const raycaster = new THREE.Raycaster()
    raycaster.near = 0
    raycaster.far = reach * 4

    const result = decals.map((d) => {
      // 方位 = 表面法线的反方向（法线指向外，从中心朝法线方向投射即命中该点）
      //
      // 说明：锚点数据位于「半径 0.5 的参考球面」，而模型已放大到约 1.45，
      // 直接使用锚点会让贴纸浮在体外。法线是设计者给出的明确朝向语义，
      // 因此以法线作为方位基准最贴合原始意图。
      const normalDir = toVec3(d.normal).normalize()
      const dir = normalDir.clone()
      const lift = Math.max(d.size[0], d.size[1]) * spanScale * 0.06

      // 起射点放在模型之外，沿 -dir 射向模型中心
      const rayOrigin = dir.clone().multiplyScalar(reach * 1.6)
      raycaster.set(rayOrigin, dir.clone().negate())
      const hits = raycaster.intersectObject(target, true).filter((h) => h.face)
      const hit = hits.length > 0 ? hits[0] : undefined

      if (hit && hit.face) {
        const worldHitNormal = hit.face.normal
          .clone()
          .applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld))
          .normalize()

        const worldPos = hit.point.clone().addScaledVector(worldHitNormal, lift * 0.6)
        const localPos = worldPos.clone().applyMatrix4(parentInverse)
        const localNormal = worldHitNormal.clone().transformDirection(parentInverse).normalize()

        return {
          pos: localPos,
          quat: orientationFromNormal(
            [localNormal.x, localNormal.y, localNormal.z],
            d.rotation,
          ),
        }
      }

      // 兜底：沿方位投影到模型外接椭球面，保证贴纸不丢失
      const hx = localSize.x / 2
      const hy = localSize.y / 2
      const hz = localSize.z / 2
      const t =
        1 /
        Math.sqrt(
          (dir.x * dir.x) / (hx * hx) + (dir.y * dir.y) / (hy * hy) + (dir.z * dir.z) / (hz * hz),
        )
      return {
        pos: dir.clone().multiplyScalar(t).add(localCenter),
        quat: orientationFromNormal(d.normal, d.rotation),
      }
    })

    return result
  }, [decals, target, orderKey, spanScale])

  return (
    <group ref={groupRef}>
      {decals.map((d, i) => {
        const place = placements?.[i]
        const pos = place ? place.pos : toVec3(d.position)
        const quat = place ? place.quat : orientationFromNormal(d.normal, d.rotation)

        return (
          <mesh
            key={d.id}
            position={pos.toArray() as [number, number, number]}
            quaternion={quat}
            renderOrder={10}
          >
            <planeGeometry args={[d.size[0] * spanScale, d.size[1] * spanScale]} />
            <meshStandardMaterial
              map={textures[i]}
              transparent
              opacity={d.opacity}
              metalness={d.metalness}
              roughness={d.roughness}
              alphaTest={0.03}
              depthTest
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-10}
              polygonOffsetUnits={-10}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}
    </group>
  )
}

/**
 * 环境光照：本地环境贴图提供 IBL 反射与氛围（不依赖任何外部 CDN）。
 *
 * ── 为什么是 WebP 而不是 .hdr ────────────────────────────────
 * 服务器跨境出口实测仅 ~35KB/s，原 1.5MB 的 .hdr 是首屏最大瓶颈。
 * 用 scripts/pack-hdri.mjs 做了 Hable 色调映射后压成 WebP：
 *   289KB → 8.3KB（-97%），肉眼观感几乎无差。
 *
 * 代价是没有真实高光（WebP 是 8bit LDR）。补偿方式：
 * 把 environmentIntensity 的基准放大 HDRI_LDR_BOOST 倍。
 * 该系数是把 LDR 贴图重新对齐到原 HDR 亮度所需的经验增益。
 *
 * ── 为什么用 useLoader 而不是 <Environment files> ─────────────
 * <Environment files> 走 RGBELoader 分支，只认 .hdr。
 * WebP 是普通位图，必须自己加载并显式指定 EquirectangularReflectionMapping，
 * 否则 three 会当成 UV 贴图，反射全错。
 */
const HDRI_LDR_BOOST = 2.2

/** 预设 → 本地贴图。新增预设时把文件放进 public/assets/env/ 并在此登记。 */
const LOCAL_ENV: Record<string, string> = {
  city: '/assets/env/city.webp',
}

export function SceneEnvironment({
  preset,
  intensity,
  rotation,
  background,
}: {
  preset: RenderConfig['environment']['preset']
  intensity: number
  rotation: number
  background: string
}) {
  const rotY = (rotation * Math.PI) / 180
  const url = LOCAL_ENV[preset] ?? LOCAL_ENV.city

  const texture = useLoader(THREE.TextureLoader, url)

  // 等距柱状图必须显式声明映射方式，否则会被当成普通 UV 贴图
  const envMap = useMemo(() => {
    const t = texture.clone()
    t.mapping = THREE.EquirectangularReflectionMapping
    t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
    return t
  }, [texture])

  return (
    <>
      <color attach="background" args={[background]} />
      <Environment
        map={envMap}
        environmentIntensity={intensity * HDRI_LDR_BOOST}
        background={false}
        environmentRotation={[0, rotY, 0]}
      />
    </>
  )
}

useGLTF.preload(MODEL_URL)
useLoader.preload(THREE.TextureLoader, Object.values(LOCAL_ENV))
