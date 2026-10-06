import { useCallback, useEffect, useRef, useState } from 'react'
import { clamp } from '@/engine/math'

/**
 * 滚动进度钩子。
 *
 * 页面被撑高成 (stops + 1) 屏，滚动进度 0..1 直接驱动镜头轨道。
 * 用 rAF 做插值，保证滚轮/触摸的离散事件也能得到连续运镜。
 */
export function useScrollProgress(segments: number) {
  const [progress, setProgress] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const raf = useRef<number | null>(null)
  const targetRef = useRef(0)
  const currentRef = useRef(0)

  const compute = useCallback(() => {
    const doc = document.documentElement
    const max = doc.scrollHeight - window.innerHeight
    const p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0
    targetRef.current = p
  }, [])

  useEffect(() => {
    const loop = () => {
      // 阻尼跟随，产生丝滑的镜头推进
      currentRef.current += (targetRef.current - currentRef.current) * 0.09
      if (Math.abs(targetRef.current - currentRef.current) < 0.0004) {
        currentRef.current = targetRef.current
      }
      setProgress(currentRef.current)
      // 聚焦 stop：hero 之后按均分段推进
      const seg = Math.round(currentRef.current * segments)
      setActiveIndex(clamp(seg, 0, segments))
      raf.current = window.requestAnimationFrame(loop)
    }
    raf.current = window.requestAnimationFrame(loop)
    compute()
    window.addEventListener('scroll', compute, { passive: true })
    window.addEventListener('resize', compute)
    return () => {
      if (raf.current) window.cancelAnimationFrame(raf.current)
      window.removeEventListener('scroll', compute)
      window.removeEventListener('resize', compute)
    }
  }, [compute, segments])

  return { progress, activeIndex }
}
