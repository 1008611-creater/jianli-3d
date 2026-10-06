import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { request } from 'node:http'

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const port = 9333
const viewportWidth = Number(process.env.VIEWPORT_WIDTH ?? 1440)
const viewportHeight = Number(process.env.VIEWPORT_HEIGHT ?? 900)
const mobile = process.env.MOBILE === '1'
const outDir = process.env.OUT_DIR ?? 'E:/codex/heikesong3/jianli/.shots'
mkdirSync(outDir, { recursive: true })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const getJson = (path) => new Promise((resolve, reject) => {
  request({ hostname: '127.0.0.1', port, path }, (res) => {
    let body = ''
    res.on('data', (chunk) => { body += chunk })
    res.on('end', () => resolve(JSON.parse(body)))
  }).on('error', reject).end()
})

const browser = spawn(chrome, [
  '--headless=new', '--no-sandbox',
  '--enable-unsafe-swiftshader', '--use-gl=swiftshader',
  '--enable-features=AllowSwiftShaderForWebGL,WebGLDeveloperExtensions',
  `--remote-debugging-port=${port}`, '--user-data-dir=E:/codex/heikesong3/.cf-cdp-profile',
  `--window-size=${viewportWidth},${viewportHeight}`, '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' })

try {
  let version
  for (let i = 0; i < 30; i++) {
    try { version = await getJson('/json/version'); break } catch { await sleep(300) }
  }
  if (!version) throw new Error('Chrome CDP 未启动')

  const ws = new WebSocket(version.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let nextId = 0
  const pending = new Map()
  const runtimeErrors = []
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.method === 'Runtime.exceptionThrown' || msg.method === 'Log.entryAdded' || msg.method === 'Runtime.consoleAPICalled') {
      runtimeErrors.push(msg)
    }
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  }
  const send = (method, params = {}, sessionId) => new Promise((resolve) => {
    const id = ++nextId
    pending.set(id, resolve)
    const message = { id, method, params }
    if (sessionId) message.sessionId = sessionId
    ws.send(JSON.stringify(message))
  })

  const targetMessage = await send('Target.createTarget', { url: 'about:blank' })
  if (targetMessage.error) throw new Error(`创建页面失败: ${JSON.stringify(targetMessage.error)}`)
  const targetId = targetMessage.result.targetId
  const attachedMessage = await send('Target.attachToTarget', { targetId, flatten: true })
  if (attachedMessage.error) throw new Error(`连接页面失败: ${JSON.stringify(attachedMessage.error)}`)
  const sessionId = attachedMessage.result.sessionId
  const sendPage = (method, params = {}) => send(method, params, sessionId)
  await sendPage('Page.enable')
  await sendPage('Runtime.enable')
  await sendPage('Log.enable')
  await sendPage('Console.enable')
  await sendPage('Emulation.setDeviceMetricsOverride', { width: viewportWidth, height: viewportHeight, deviceScaleFactor: mobile ? 2 : 1, mobile })

  for (const stop of [0, 1, 2, 3, 4]) {
    await sendPage('Page.navigate', { url: `http://127.0.0.1:4173/#stop=${stop}` })
    await sleep(9000)
    const probe = await sendPage('Runtime.evaluate', {
      expression: `JSON.stringify({
        webgl: (() => { const c = document.createElement('canvas'); const g = c.getContext('webgl2') || c.getContext('webgl'); return { supported: Boolean(g), renderer: g?.getParameter(g.RENDERER) || null, vendor: g?.getParameter(g.VENDOR) || null } })(),
        title: document.title,
        loading: document.querySelector('.loading-screen')?.className,
        stage: document.querySelector('.stage')?.className,
        body: document.body.innerText.slice(0, 160)
      })`,
      returnByValue: true,
    })
    const status = probe.result?.result?.value || '{}'
    const errors = runtimeErrors.splice(0).map((event) => event.params?.exceptionDetails?.exception?.description || event.params?.entry?.text || event.params?.args?.map((arg) => arg.value ?? arg.description).join(' ')).filter(Boolean)
    writeFileSync(`${outDir}/stop-${stop}-status.json`, `${status}\n${JSON.stringify({ errors }, null, 2)}\n`)
    const shot = await sendPage('Page.captureScreenshot', { format: 'png', fromSurface: true })
    if (shot.error) throw new Error(`stop=${stop} 截图失败: ${JSON.stringify(shot.error)}`)
    const imageData = shot.result?.data
    if (!imageData) throw new Error(`stop=${stop} 截图返回异常: ${JSON.stringify(shot)}`)
    writeFileSync(`${outDir}/stop-${stop}.png`, Buffer.from(imageData, 'base64'))
    console.log(`stop=${stop} ${status}`)
  }
  ws.close()
} finally {
  browser.kill()
}
