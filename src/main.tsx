import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
// 字体先于全局样式引入，确保 --font-display 生效时 @font-face 已注册
import './styles/fonts.css'
import './styles/global.css'

const el = document.getElementById('root')
if (!el) throw new Error('#root not found')

createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
