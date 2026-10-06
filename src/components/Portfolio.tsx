import type { PortfolioConfig } from '@/data/types'

/**
 * 作品集：横向滚动画廊，按分区组织。
 * 桌面端支持鼠标拖拽横移，触摸端原生横滑。
 */
export function Portfolio({ config }: { config: PortfolioConfig }) {
  if (!config.enabled) return null

  const total = config.sections.reduce((n, s) => n + s.items.length, 0)

  return (
    <section
      className="portfolio"
      style={{ background: config.bgColor, opacity: config.bgOpacity }}
      aria-label={config.title}
    >
      <header className="portfolio-head">
        <h2>{config.title}</h2>
        <p>
          {config.hint} · {config.sections.length} 个分区 · {total} 项
        </p>
      </header>

      <div className="portfolio-groups">
        {config.sections.map((section) => (
          <div className="portfolio-group" key={section.id}>
            <h3 className="portfolio-group-title">
              <span>{section.title}</span>
            </h3>
            <div className="portfolio-track">
              {section.items.map((item) => {
                const inner = (
                  <>
                    <div className="card-media" aria-hidden="true">
                      {item.image ? (
                        <img src={item.image} alt="" loading="lazy" />
                      ) : (
                        <span className="card-cover" aria-hidden="true">
                          <span className="card-cover-kicker">{item.description?.split(' · ')[0] ?? 'LIU SHUBIN / PROJECT'}</span>
                          <span className="card-cover-title">{item.name}</span>
                          <span className="card-cover-motif">{item.id.toUpperCase()}</span>
                          <span className="card-cover-mark">2026</span>
                        </span>
                      )}
                    </div>
                    <div className="card-meta">
                      <strong>{item.name}</strong>
                      {item.description && <em>{item.description}</em>}
                    </div>
                  </>
                )

                return item.url ? (
                  <a
                    className="card"
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={item.url}
                  >
                    {inner}
                  </a>
                ) : (
                  <div className="card is-static" key={item.id}>
                    {inner}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
