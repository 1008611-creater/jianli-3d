import type { SceneNode } from '@/data/types'
import { LinkRow } from './LinkPill'

/**
 * 叙事层：每个相机 stop 对应一段文案。
 * 只有当前聚焦的 stop 可见，配合镜头推进形成"逐条揭示"。
 */
export function NodeOverlay({ node, active, index }: { node: SceneNode; active: boolean; index: number }) {
  const { overlay } = node
  return (
    <article
      className={`node-overlay${active ? ' is-active' : ''}`}
      aria-hidden={!active}
      aria-label={overlay.title}
    >
      <div className="node-index" aria-hidden="true">
        <span>{String(index + 1).padStart(2, '0')}</span>
        <i />
      </div>

      <div className="node-body">
        {overlay.logo && (
          <img className="node-logo" src={overlay.logo} alt={overlay.logoAlt ?? ''} loading="lazy" />
        )}
        <p className="node-eyebrow">{overlay.eyebrow}</p>
        <h2 className="node-title">{overlay.title}</h2>
        {overlay.subtitle && <p className="node-subtitle">{overlay.subtitle}</p>}
        {overlay.body && <p className="node-text">{overlay.body.trim()}</p>}
        <LinkRow links={overlay.links} />
      </div>
    </article>
  )
}

/** 全部叙事层容器：用绝对定位堆叠，靠 CSS 过渡切换可见性 */
export function NodeOverlays({ nodes, activeIndex }: { nodes: SceneNode[]; activeIndex: number }) {
  return (
    <div className="node-stack" aria-live="polite">
      {nodes.map((n, i) => (
        // stop 索引 0 对应滚动段 1（跳过封面）
        <NodeOverlay key={n.id} node={n} index={i} active={activeIndex === i + 1} />
      ))}
    </div>
  )
}
