import type { HeroConfig } from '@/data/types'
import { LinkRow } from './LinkPill'

/**
 * 封面层：编辑排版风格，四角信息 + 主标题 + 简介 + 联系方式。
 * 随滚动淡出，交给 3D 叙事接管。
 */
export function HeroOverlay({ hero, opacity }: { hero: HeroConfig; opacity: number }) {
  return (
    <section
      className="hero-overlay"
      style={{ opacity, pointerEvents: opacity < 0.05 ? 'none' : 'auto' }}
      aria-label="个人简介"
    >
      <div className="hero-frame" style={{ borderColor: hero.frameColor }}>
        <span className="corner corner-tl">
          {hero.cornerTL.split('\n').map((line, i) => (
            <span key={i} className={i === 0 ? 'corner-strong' : 'corner-soft'}>
              {line}
            </span>
          ))}
        </span>
        <span className="corner corner-tr">{hero.cornerTR}</span>
        <span className="corner corner-bl">{hero.cornerBL}</span>
        <span className="corner corner-br">{hero.cornerRight}</span>
      </div>

      <div className="hero-content">
        <p className="hero-eyebrow">3D Interactive Resume</p>
        <h1 className="hero-title">{hero.title}</h1>
        <p className="hero-body">{hero.body.trim()}</p>
        <LinkRow links={hero.links} />
      </div>

      <div className="scroll-cue" aria-hidden="true">
        <span>{hero.scrollHint}</span>
        <i />
      </div>
    </section>
  )
}
