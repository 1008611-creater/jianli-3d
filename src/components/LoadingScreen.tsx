import { useEffect, useState } from 'react'
import type { LoadingConfig } from '@/data/types'

/** 载入屏：与 3D 资源加载并行，避免白屏 */
export function LoadingScreen({ config, hidden }: { config: LoadingConfig; hidden: boolean }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (hidden) return
    // 视觉进度：不谎报完成，只在等待期间给出稳定反馈
    const id = window.setInterval(() => {
      setProgress((p) => (p < 90 ? p + Math.max(1, (90 - p) * 0.08) : p))
    }, 120)
    return () => window.clearInterval(id)
  }, [hidden])

  useEffect(() => {
    if (hidden) setProgress(100)
  }, [hidden])

  return (
    <div
      className={`loading-screen${hidden ? ' is-hidden' : ''}`}
      style={{ background: config.background }}
      aria-hidden={hidden}
      role="status"
      aria-live="polite"
    >
      <div className="loading-inner">
        {config.spinnerStyle === 'dots' && (
          <div className="loading-dots" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} style={{ background: config.spinnerColor }} />
            ))}
          </div>
        )}
        {config.spinnerStyle === 'ring' && (
          <div className="loading-ring" style={{ borderTopColor: config.spinnerColor }} />
        )}
        {config.spinnerStyle === 'bar' && (
          <div className="loading-bar">
            <i style={{ background: config.spinnerColor, width: `${progress}%` }} />
          </div>
        )}

        <p className="loading-text">{config.text}</p>

        {config.template === 'counter' && (
          <p className="loading-counter" style={{ color: config.spinnerColor }}>
            {Math.round(progress)}
            <span>%</span>
          </p>
        )}
        {config.template === 'blueprint' && (
          <p className="loading-blueprint" style={{ color: config.spinnerColor }}>
            VIEWFINDER · MOUNTING GEO · LIGHTING
          </p>
        )}
      </div>
    </div>
  )
}
