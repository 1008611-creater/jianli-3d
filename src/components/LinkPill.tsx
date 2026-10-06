import { useState } from 'react'
import type { LinkConfig } from '@/data/types'
import { Icon } from './Icon'

const isHttp = (v: string) => /^https?:\/\//i.test(v)

/** 把联系方式转成友好文案 */
function labelFor(link: LinkConfig): string {
  if (link.label) return link.label
  if (!isHttp(link.url)) return link.url
  try {
    return new URL(link.url).host.replace(/^www\./, '')
  } catch {
    return link.url
  }
}

/**
 * 链接胶囊：http 链接直接跳转；纯文本（微信号）点击复制。
 */
export function LinkPill({ link }: { link: LinkConfig }) {
  const [copied, setCopied] = useState(false)
  const text = labelFor(link)
  const http = isHttp(link.url)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(link.url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // 剪贴板不可用时退化为选中提示，不静默失败
      setCopied(false)
      window.prompt('复制失败，请手动复制：', link.url)
    }
  }

  if (http) {
    return (
      <a className="link-pill" href={link.url} target="_blank" rel="noreferrer noopener">
        <Icon name={link.icon} />
        <span>{text}</span>
      </a>
    )
  }

  return (
    <button className="link-pill" type="button" onClick={onCopy} title={`点击复制 ${link.url}`}>
      <Icon name={link.icon} />
      <span>{copied ? '已复制' : text}</span>
    </button>
  )
}

export function LinkRow({ links }: { links?: LinkConfig[] }) {
  if (!links || links.length === 0) return null
  return (
    <div className="link-row">
      {links.map((l, i) => (
        <LinkPill key={`${l.icon}-${l.url}-${i}`} link={l} />
      ))}
    </div>
  )
}
