import { useCallback, useEffect, useMemo, useState } from 'react'
import { sceneConfig } from '@/data'
import { Experience } from '@/engine/Experience'
import { useScrollProgress } from '@/hooks/useScrollProgress'
import { LoadingScreen } from '@/components/LoadingScreen'
import { HeroOverlay } from '@/components/HeroOverlay'
import { NodeOverlays } from '@/components/NodeOverlay'
import { Timeline } from '@/components/Timeline'
import { Portfolio } from '@/components/Portfolio'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { clamp } from '@/engine/math'

/** 3D 层不可用时的降级：静态渐变底 + 提示，保证信息可读 */
function StageFallback() {
  return (
    <div className="stage-fallback" role="img" aria-label="3D 展示不可用">
      <p>3D 展示需要支持 WebGL 的浏览器</p>
    </div>
  )
}

export default function App() {
  const { profile, hero, nodes, loading, portfolio, presentation } = sceneConfig
  const segments = nodes.length // 封面 + 每 stop 一段

  const { progress, activeIndex } = useScrollProgress(segments)
  const [modelReady, setModelReady] = useState(false)
  const [stageFailed, setStageFailed] = useState(false)

  // 调试/深链：`#stop=<n>` 把镜头锁定到第 n 个 stop，便于逐点检查构图。
  // 监听 hashchange，便于调试脚本在同一页面内切换机位。
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(() => {
    const m = /#stop=(\d+)/.exec(window.location.hash)
    if (!m) return null
    const n = parseInt(m[1], 10)
    return Number.isNaN(n) ? null : clamp(n, 0, segments)
  })

  useEffect(() => {
    const updatePinnedIndex = () => {
      const m = /#stop=(\d+)/.exec(window.location.hash)
      if (!m) {
        setPinnedIndex(null)
        return
      }
      const n = parseInt(m[1], 10)
      setPinnedIndex(Number.isNaN(n) ? null : clamp(n, 0, segments))
    }
    window.addEventListener('hashchange', updatePinnedIndex)
    return () => window.removeEventListener('hashchange', updatePinnedIndex)
  }, [segments])

  // 锁定镜头时，UI 层也跟随该 stop
  const viewIndex = pinnedIndex ?? activeIndex

  // 支持 #s=<0..1> 直接定位到某个滚动进度（便于分享特定章节）
  //
  // 必须延后到布局稳定：scroll-spacer 高度由 React 提交后才生效，
  // 挂载期同步 scrollTo 会读到 max=0。这里在 rAF + 双次校正，
  // 并在文档高度变化（模型加载完成、字体回流）时再校正一次。
  useEffect(() => {
    const m = /#s=([\d.]+)/.exec(window.location.hash)
    if (!m) return
    const p = clamp(parseFloat(m[1]), 0, 1)
    if (Number.isNaN(p)) return

    let cancelled = false
    const apply = () => {
      if (cancelled) return
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max > 0) window.scrollTo(0, p * max)
    }

    // 用 ResizeObserver 跟踪文档高度变化，高度一变就重新对齐目标进度
    const ro = new ResizeObserver(apply)
    ro.observe(document.documentElement)

    const raf1 = window.requestAnimationFrame(() => {
      apply()
      window.requestAnimationFrame(apply)
    })
    const timers = [300, 1000, 2000].map((ms) => window.setTimeout(apply, ms))

    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf1)
      timers.forEach(window.clearTimeout)
      ro.disconnect()
    }
  }, [])

  // 模型就绪后收起载入屏
  const handleReady = useCallback(() => setModelReady(true), [])

  // 3D 层失败也必须收起载入屏，避免无限转圈
  const handleStageError = useCallback(() => {
    setStageFailed(true)
    setModelReady(true)
  }, [])

  const bootDone = modelReady

  // 封面在第一个 stop 出现前淡出；锁定到 stop 时封面直接隐藏
  const heroOpacity = useMemo(() => {
    if (pinnedIndex !== null && pinnedIndex > 0) return 0
    const fadeEnd = 1 / (segments + 1)
    return Math.max(0, Math.min(1, 1 - progress / fadeEnd))
  }, [progress, segments, pinnedIndex])

  // 导航跳转：直接写入滚动位置，由进度钩子接管运镜
  const jumpTo = useCallback(
    (p: number) => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      window.scrollTo({ top: p * max, behavior: 'smooth' })
    },
    [],
  )

  return (
    <>
      <LoadingScreen config={loading} hidden={bootDone} />

      <div
        className={`stage${stageFailed ? ' is-failed' : ''}`}
        style={{ background: hero.render.background }}
        aria-hidden={!bootDone}
      >
        <ErrorBoundary fallback={<StageFallback />} onError={handleStageError}>
          <Experience
            config={sceneConfig}
            progress={progress}
            activeIndex={viewIndex}
            pinnedIndex={pinnedIndex}
            onModelReady={handleReady}
          />
        </ErrorBoundary>
      </div>

      {/* 页面滚动高度：(封面 + stops) 屏 */}
      <div className="scroll-spacer" style={{ height: `${(segments + 1) * 100}vh` }} aria-hidden="true" />

      <div className="ui-layer">
        <header className="top-bar">
          <a className="brand" href="#top" onClick={(e) => { e.preventDefault(); jumpTo(0) }}>
            <span className="brand-dot" style={{ background: presentation.accentColor }} />
            <span className="brand-name">{profile.nameEn}</span>
            <span className="brand-sub">{profile.city}</span>
          </a>
        </header>

        {/* 首屏：贴纸视觉 + 介绍 */}
        <HeroOverlay hero={hero} opacity={heroOpacity} />

        <NodeOverlays nodes={nodes} activeIndex={viewIndex} />

        <Timeline
          nodes={nodes}
          activeIndex={viewIndex}
          onJump={jumpTo}
          nodeColor={presentation.nodeColor}
          lineColor={presentation.lineColor}
          shape={presentation.nodeShape}
        />

        <div className="progress-rail" aria-hidden="true">
          <i style={{ height: `${progress * 100}%`, background: presentation.accentColor }} />
        </div>
      </div>

      <div id="top" />
      <div className="portfolio-wrap">
        <Portfolio config={portfolio} />
      </div>

      <footer className="site-footer">
        <p>
          © {new Date().getFullYear()} {profile.name} · {profile.nameEn}
        </p>
        <p className="footer-note">Build AI, build future.</p>
      </footer>
    </>
  )
}
