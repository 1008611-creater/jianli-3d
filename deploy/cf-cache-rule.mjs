#!/usr/bin/env node
/**
 * 给 Cloudflare 加一条 Cache Rule，让模型等非默认扩展名被边缘缓存。
 *
 * ── 为什么需要 ────────────────────────────────────────────────
 * Cloudflare 免费版只缓存它「认识」的静态扩展名（.js/.css/.webp/.woff2…），
 * 模型二进制若使用非默认扩展名则需要单独验证缓存策略。实测同一条跨境链路：
 *   /assets/three-XXX.js  (177KB)  cf-cache-status: HIT      → 0.43s
 *   /assets/models/me.bin (392KB)  cf-cache-status: HIT      → 由站点缓存策略提供
 * 当前站点已通过文件扩展名和响应头实现自动缓存，不需要这个脚本常规运行。
 *
 * ── 安全约定（重要）──────────────────────────────────────────
 * · token 只从环境变量 CF_API_TOKEN 读，**绝不写入任何文件、日志、命令历史**
 * · 建议最小权限：Zone → Zone:Read + Zone → Cache Rules:Edit，且只授权 cauai.fun
 * · 用完请在 Cloudflare 控制台 Roll/Delete 该 token
 *
 * ── 用法 ─────────────────────────────────────────────────────
 *   CF_API_TOKEN=xxx node deploy/cf-cache-rule.mjs --dry-run   # 只看不改
 *   CF_API_TOKEN=xxx node deploy/cf-cache-rule.mjs             # 实际应用
 *   CF_API_TOKEN=xxx node deploy/cf-cache-rule.mjs --verify    # 只检查生效状态
 *
 * ── 设计要点：为什么是「合并」而不是「覆盖」──────────────────
 * Rulesets 的 entrypoint PUT 是**整组替换**语义。如果直接 PUT 一条新规则，
 * 会把该 phase 下已有规则全部抹掉。所以必须先 GET 现有规则、去重后合并，
 * 再 PUT 完整数组。否则会静默删掉别人配的缓存规则。
 */

const API = 'https://api.cloudflare.com/client/v4'
const ZONE_NAME = process.env.CF_ZONE || 'cauai.fun'
const HOST = process.env.CF_HOST || 'jianli.cauai.fun'
const RULE_DESC = 'Cache 3D assets'
const EDGE_TTL_SECONDS = 2592000 // 1 month

const argv = process.argv.slice(2)
const DRY = argv.includes('--dry-run')
const VERIFY_ONLY = argv.includes('--verify')

const TOKEN = process.env.CF_API_TOKEN
if (!TOKEN) {
  console.error('✗ 缺少环境变量 CF_API_TOKEN')
  console.error('  用法：CF_API_TOKEN=xxx node deploy/cf-cache-rule.mjs [--dry-run|--verify]')
  process.exit(1)
}

const c = {
  b: '\x1b[1m', d: '\x1b[2m', r: '\x1b[0m',
  g: '\x1b[32m', y: '\x1b[33m', red: '\x1b[31m', cy: '\x1b[36m',
}
const say = (m) => console.log(`\n${c.b}${c.cy}▸ ${m}${c.r}`)
const ok = (m) => console.log(`  ${c.g}✔${c.r} ${m}`)
const warn = (m) => console.log(`  ${c.y}⚠${c.r} ${m}`)
const die = (m) => { console.error(`  ${c.red}✖${c.r} ${m}`); process.exit(1) }

async function cf(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { die(`非 JSON 响应 (HTTP ${res.status}): ${text.slice(0, 300)}`) }

  if (!json.success) {
    const errs = (json.errors || []).map((e) => `[${e.code}] ${e.message}`).join('; ')
    // 10000 = 权限不足；这类错误信息很直白，直接透出比吞掉有用
    die(`Cloudflare API 报错 (HTTP ${res.status})：${errs || text.slice(0, 300)}`)
  }
  return json.result
}

/* ── 1. 校验 token ─────────────────────────────────────────── */
async function verifyToken() {
  say('1/5 校验 API Token')
  const r = await cf('/user/tokens/verify')
  ok(`token 有效，状态：${r.status}`)
  return r
}

/* ── 2. 找 zone ────────────────────────────────────────────── */
async function findZone() {
  say(`2/5 定位 zone：${ZONE_NAME}`)
  const zones = await cf(`/zones?name=${encodeURIComponent(ZONE_NAME)}`)
  if (!zones.length) {
    die(`找不到 zone「${ZONE_NAME}」。请确认 token 已授权该 zone（Zone:Read）。`)
  }
  const z = zones[0]
  ok(`zone_id = ${z.id}`)
  ok(`状态：${z.status}`)
  return z.id
}

/* ── 3. 读现有 cache rules ─────────────────────────────────── */
async function getEntrypoint(zoneId) {
  const path = `/zones/${zoneId}/rulesets/phases/http_request_cache_settings/entrypoint`
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { return { ruleset: null, rules: [] } }

  // 尚无该 phase 的 ruleset 时会返回 404 / success:false —— 这是正常的首次情况
  if (!json.success) return { ruleset: null, rules: [] }
  return { ruleset: json.result, rules: json.result?.rules ?? [] }
}

/* ── 4. 合并并写入 ─────────────────────────────────────────── */
function buildRule() {
  return {
    action: 'set_cache_settings',
    description: RULE_DESC,
    enabled: true,
    expression:
      `(http.host eq "${HOST}" and starts_with(http.request.uri.path, "/assets/"))`,
    action_parameters: {
      cache: true,
      edge_ttl: { mode: 'override_origin', default: EDGE_TTL_SECONDS },
      browser_ttl: { mode: 'respect_origin' },
    },
  }
}

async function applyRule(zoneId, existingRules) {
  say('4/5 写入 Cache Rule')

  const kept = existingRules.filter((r) => r.description !== RULE_DESC)
  if (kept.length !== existingRules.length) {
    warn(`已有同名规则「${RULE_DESC}」，将被新版本替换（不重复添加）`)
  } else if (existingRules.length) {
    warn(`该 phase 下已有 ${existingRules.length} 条规则，会一并保留`)
  } else {
    ok('该 phase 下暂无规则，将新建')
  }

  const rules = [...kept, buildRule()]

  console.log(`\n${c.d}  将要写入的规则：${c.r}`)
  console.log(`${c.d}${JSON.stringify(buildRule(), null, 2).split('\n').map((l) => '  ' + l).join('\n')}${c.r}\n`)

  if (DRY) {
    warn('--dry-run 模式，未实际写入')
    return
  }

  const path = `/zones/${zoneId}/rulesets/phases/http_request_cache_settings/entrypoint`
  const result = await cf(path, { method: 'PUT', body: JSON.stringify({ rules }) })
  ok(`已写入，ruleset id = ${result.id}`)
  ok(`当前该 phase 规则数：${result.rules?.length ?? '?'}`)
}

/* ── 5. 验收 ───────────────────────────────────────────────── */
async function verifyLive() {
  say('5/5 线上验收')
  const url = `https://${HOST}/assets/models/me.bin`
  for (let i = 1; i <= 3; i++) {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'Accept-Encoding': 'gzip' },
      // 加随机查询串避开中间层缓存，但仍命中 Cache Rule 的路径匹配
      // 注意：这里故意不加 ?，因为要验证的就是真实路径
      redirect: 'follow',
    })
    const status = res.headers.get('cf-cache-status') || '(无该头)'
    const age = res.headers.get('age') || '-'
    const mark = status === 'HIT' ? `${c.g}✔${c.r}` : `${c.y}…${c.r}`
    console.log(`  ${mark} 第${i}次  cf-cache-status: ${status}   age: ${age}`)
    if (i < 3) await new Promise((r) => setTimeout(r, 1500))
  }
  console.log()
  console.log(`  ${c.d}说明：Cache Rule 只对**新**请求开始缓存。首次仍是 DYNAMIC/MISS，${c.r}`)
  console.log(`  ${c.d}第 2 次起应变 HIT。若多次仍 DYNAMIC，检查是否有多余的 Cache-Control 头。${c.r}`)
}

async function main() {
  console.log(`${c.b}Cloudflare Cache Rule 配置${c.r}`)
  console.log(`${c.d}zone=${ZONE_NAME}  host=${HOST}  模式=${VERIFY_ONLY ? 'verify' : DRY ? 'dry-run' : 'apply'}${c.r}`)

  if (VERIFY_ONLY) {
    await verifyToken()
    await verifyLive()
    return
  }

  await verifyToken()
  const zoneId = await findZone()

  say('3/5 读取现有 Cache Rules')
  const { ruleset, rules } = await getEntrypoint(zoneId)
  if (ruleset) {
    ok(`已存在 cache settings ruleset（id=${ruleset.id}），当前 ${rules.length} 条规则`)
    for (const r of rules) {
      console.log(`    · ${r.description || '(无描述)'}  enabled=${r.enabled}`)
    }
  } else {
    ok('尚无 cache settings ruleset，将新建')
  }

  await applyRule(zoneId, rules)
  if (!DRY) await verifyLive()
}

main().catch((e) => die(e.message))
