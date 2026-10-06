import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** 降级时展示的内容 */
  fallback: ReactNode
  /** 出错时的回调，便于上报或记录 */
  onError?: (error: Error, info: ErrorInfo) => void
}

interface State {
  hasError: boolean
}

/**
 * 错误边界：隔离 3D 渲染层的失败。
 *
 * WebGL 不可用、资源加载失败、驱动异常等情况都不应让整个页面白屏。
 * 捕获后展示降级内容，保证简历的核心信息（文字与链接）始终可见可读。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 保留日志便于排查，但不阻断页面
    console.error('[3D layer]', error, info.componentStack)
    this.props.onError?.(error, info)
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}
