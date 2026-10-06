import { useState } from 'react'
import type { SceneNode } from '@/data/types'

const SHAPES: Record<string, 'is-circle' | 'is-square' | 'is-diamond'> = {
  circle: 'is-circle',
  square: 'is-square',
  diamond: 'is-diamond',
}

/**
 * 时间轴：右侧竖排站点，显示当前聚焦位置，并支持点击跳转。
 */
export function Timeline({
  nodes,
  activeIndex,
  onJump,
  nodeColor,
  lineColor,
  shape,
}: {
  nodes: SceneNode[]
  activeIndex: number
  onJump: (scrollProgress: number) => void
  nodeColor: string
  lineColor: string
  shape: keyof typeof SHAPES
}) {
  const [hover, setHover] = useState<number | null>(null)

  // 索引 0 = 封面，1..n = 各 stop
  const total = nodes.length + 1

  return (
    <nav className="timeline" aria-label="章节导航">
      <div className="timeline-list">
        <button
          type="button"
          className={`timeline-node ${SHAPES[shape]}${activeIndex === 0 ? ' is-active' : ''}`}
          style={{
            borderColor: activeIndex === 0 ? nodeColor : lineColor,
            background: activeIndex === 0 ? nodeColor : 'transparent',
          }}
          onClick={() => onJump(0)}
          onMouseEnter={() => setHover(0)}
          onMouseLeave={() => setHover(null)}
          aria-label="封面"
          aria-current={activeIndex === 0}
        >
          <span className="timeline-label">封面</span>
        </button>

        {nodes.map((n, i) => {
          const idx = i + 1
          const active = activeIndex === idx
          return (
            <button
              key={n.id}
              type="button"
              className={`timeline-node ${SHAPES[shape]}${active ? ' is-active' : ''}`}
              style={{
                borderColor: active ? nodeColor : lineColor,
                background: active ? nodeColor : 'transparent',
              }}
              onClick={() => onJump(idx / (total - 1))}
              onMouseEnter={() => setHover(idx)}
              onMouseLeave={() => setHover(null)}
              aria-label={`${n.overlay.eyebrow} ${n.overlay.title}`}
              aria-current={active}
            >
              <span className="timeline-label">
                {hover === idx ? n.overlay.title : String(idx).padStart(2, '0')}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
