import type { LinkConfig } from '@/data/types'

/** 图标：内联 SVG，无外部依赖 */
export function Icon({ name, className }: { name: LinkConfig['icon']; className?: string }) {
  const common = {
    className,
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (name) {
    case 'github':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.85-2.34 4.7-4.57 4.94.36.31.68.92.68 1.86v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
        </svg>
      )
    case 'mail':
      return (
        <svg {...common}>
          <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      )
    case 'phone':
      return (
        <svg {...common}>
          <path d="M6.6 3h2.2l1.4 3.6-1.8 1.3a12 12 0 0 0 5.7 5.7l1.3-1.8L18.9 13v2.2A2.8 2.8 0 0 1 16 18 13.8 13.8 0 0 1 3.9 5.9 2.8 2.8 0 0 1 6.6 3Z" />
        </svg>
      )
    case 'linkedin':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05C21 8.65 22 11 22 14.1V21h-4v-6.1c0-1.45-.03-3.3-2-3.3s-2.3 1.57-2.3 3.2V21h-4z" />
        </svg>
      )
    case 'x':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M17.5 3h3l-6.6 7.5L21.8 21h-5.4l-4.2-5.6L7.2 21H4.2l7-8L2.5 3H8l3.9 5.2Z" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path d="M9.5 14.5 14.5 9.5" />
          <path d="M11 6.5 12.3 5a3.9 3.9 0 0 1 5.5 0l1.2 1.2a3.9 3.9 0 0 1 0 5.5L17.7 13" />
          <path d="M13 17.5 11.7 19a3.9 3.9 0 0 1-5.5 0l-1.2-1.2a3.9 3.9 0 0 1 0-5.5L6.3 11" />
        </svg>
      )
  }
}
