/**
 * 统一质量门：串联 typecheck → lint → build。
 * 任一环节失败即中断，不谎报通过。
 *
 * 用法：npm run verify
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const steps = [
  { name: 'typecheck', cmd: 'npx', args: ['tsc', '--noEmit'] },
  { name: 'lint', cmd: 'npx', args: ['eslint', '.', '--ext', '.ts,.tsx', '--max-warnings', '0'] },
  { name: 'build', cmd: 'npx', args: ['vite', 'build'] },
]

const isWin = process.platform === 'win32'
let failed = false

for (const step of steps) {
  process.stdout.write(`\n▶ ${step.name}\n`)
  const res = spawnSync(step.cmd, step.args, {
    stdio: 'inherit',
    shell: isWin,
  })
  if (res.status !== 0) {
    failed = true
    process.stdout.write(`\n✖ ${step.name} 失败（exit ${res.status}）\n`)
    break
  }
  process.stdout.write(`✔ ${step.name} 通过\n`)
}

if (!failed) {
  const hasAssets = existsSync('public/assets/models/me.bin')
  const hasIndex = existsSync('dist/index.html')
  process.stdout.write('\n— 产物校验 —\n')
  process.stdout.write(`${hasIndex ? '✔' : '✖'} dist/index.html\n`)
  process.stdout.write(`${hasAssets ? '✔' : '✖'} public/assets/models/me.bin\n`)
  if (!hasIndex || !hasAssets) failed = true
}

process.stdout.write(failed ? '\n✖ verify 未通过\n' : '\n✔ verify 全部通过\n')
process.exit(failed ? 1 : 0)
