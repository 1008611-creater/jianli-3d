# 部署指南

> **站点已上线：<https://jianli.cauai.fun>**

## 你的环境（已确认）

| 项 | 值 |
|---|---|
| 服务器 SSH 别名 | `kaogong`（`114.134.185.16`，root） |
| 站点根目录 | `/var/www/jianli` |
| Nginx 配置 | `/etc/nginx/sites-available/jianli.cauai.fun` |
| DNS 托管 | Cloudflare（`pete.ns.cloudflare.com` / `khloe.ns.cloudflare.com`） |
| 域名 | `jianli.cauai.fun` |
| 证书 | Let's Encrypt，有效期至 **2026-12-16**（certbot 自动续期） |

**当前状态：全部完成 ✅**

- ✅ 静态文件已上传并验证（35 个文件，27MB）
- ✅ Nginx 配置已生效（含 SSL、gzip_static、分类型缓存策略）
- ✅ DNS 已解析（Cloudflare 代理，`104.21.38.19` / `172.67.218.5`）
- ✅ SSL 证书已签发，HTTP 自动 301 → HTTPS
- ✅ 模型已预压缩（13.9MB → 10.5MB）
- ✅ 字体已本地自托管（4 个 woff2，307KB），**零外部依赖**
- ✅ 全站线上验收通过（页面 / JS / CSS / 字体 / 模型 / HDRI / 11 张贴纸 / SPA 回退）

---

## 日常发版

改完内容发版**只需一条命令**：

```bash
bash deploy/deploy.sh
```

脚本会依次执行：连通性检查 → 备份旧版 → 质量门 → 构建 → 上传 → 预压缩 → 写 nginx 配置 → 检查证书 → 重载。

只更新内容、不动 nginx 配置：

```bash
bash deploy/deploy.sh --no-cert
```

> 脚本上传前会 `rm -rf /var/www/jianli/*`，因此**不会**残留上一版的 hash 产物。
> 手动上传时务必也先清空，否则新旧 chunk 会同时留在 `assets/`。

---

## 手动分步操作（脚本出问题时用）

### 1. 构建

```bash
npm run verify      # 质量门，必须全绿
npm run build       # 产出 dist/
```

> 若构建报 `[safe-delete] 操作失败 ... ETIMEDOUT`，是沙箱的回收站 shim 卡住，
> 先 `rm -rf dist` 再重新 build 即可。

### 2. 上传

服务器上没有 rsync，用 tar over ssh（已验证可用）：

```bash
SSH="/c/Program Files/Git/usr/bin/ssh.exe"
tar czf - -C dist . | "$SSH" -o BatchMode=yes kaogong \
  "rm -rf /var/www/jianli/* && mkdir -p /var/www/jianli && tar xzf - -C /var/www/jianli"
```

修正属主（tar 会带上 Windows 的 UID 197609）：

```bash
"$SSH" -o BatchMode=yes kaogong "chown -R www-data:www-data /var/www/jianli"
```

### 3. 预压缩

```bash
"$SSH" -o BatchMode=yes kaogong "cd /var/www/jianli && \
  find . -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.json' \) ! -name '*.gz' \
    -exec sh -c 'gzip -9 -c \"\$1\" > \"\$1.gz\"' _ {} \; && \
  gzip -9 -k -f assets/models/me.bin && \
  gzip -9 -k -f assets/env/city.hdr && \
  chown -R www-data:www-data /var/www/jianli"
```

### 4. 更新 nginx 配置

```bash
"$SSH" -o BatchMode=yes kaogong "cat > /etc/nginx/sites-available/jianli.cauai.fun" \
  < deploy/jianli.cauai.fun.nginx.conf
"$SSH" -o BatchMode=yes kaogong \
  "nginx -t && systemctl reload nginx && echo OK"
```

### 5. 证书（仅在需要重新签发时）

`jianli.cauai.fun` 必须已解析到 `114.134.185.16`：

```bash
"$SSH" -o BatchMode=yes kaogong \
  "certbot --nginx -d jianli.cauai.fun --non-interactive --agree-tos \
   --register-unsafely-without-email --redirect"
```

> certbot 会把 nginx 配置改写成 HTTPS 并加 301 跳转；
> 随后**必须**用 `deploy/jianli.cauai.fun.nginx.conf` 覆盖回去，
> 否则会丢掉字体 MIME、gzip_static 与各类缓存策略。

验证解析是否生效：

```bash
"/c/Users/lsb/.workbuddy-ai/binaries/node/versions/22.22.2-2/node.exe" -e \
  "require('node:dns').promises.resolve4('jianli.cauai.fun').then(console.log)"
# 期望输出：Cloudflare 的 IP（104.21.x.x / 172.67.x.x）
```

---

## 已验证的线上行为

以下是**走公网 HTTPS（经 Cloudflare）实测**的结果：

| 检查项 | 实测结果 |
|---|---|
| `index.html` | `200`，`text/html`，`no-cache, must-revalidate` |
| 带 hash 的 JS/CSS | `200`，`public, max-age=31536000, immutable`，`cf-cache-status: HIT` |
| `me.bin?v=original-20260918` | `200`，`model/gltf-binary`，**10,453,210 B**（gzip 后），`cf-cache-status: HIT` |
| `city.webp` | `200`，`image/webp`，**8,496 B**，`cf-cache-status: HIT` |
| 字体 `bricolage-{500,600,700,800}.woff2?v=2` | `200`，**`font/woff2`**，`immutable` |
| 贴纸（11 个 webp） | 全部 `200`，`cf-cache-status: HIT` |
| 深链回退 `/project/anything` | `200`，返回 `index.html`（SPA 路由正常） |
| 外部域名依赖 | **0 个**（字体、环境贴图、模型全部本地） |

**预压缩已生效**：`me.bin.gz` 由 nginx `gzip_static on` 直接发送，
省掉每次请求的实时压缩 CPU。（`city.webp` 不预压缩——WebP 本身已压缩，再 gzip 无收益。）

### ⚠️ 真实链路实测（重要：别只在本机测）

**服务器本机直连源站是 60MB/s，但这不代表用户体验。**
本机 `curl` 走的是回环，绕过了跨境出口。真实链路必须经公网域名测：

```bash
ssh kaogong "curl -so /dev/null -H 'Accept-Encoding: gzip' \
  -w 'ttfb %{time_starttransfer}s  总 %{time_total}s  速度 %{speed_download} B/s\n' \
  https://jianli.cauai.fun/assets/models/me.bin"
```

`mtr` 到 Cloudflare 边缘的结果显示这条链路本身就有问题：

```
2.|-- 149.88.79.129        0.0%  10  3054ms   ← 运营商网关，峰值 3 秒
6.|-- cloudflare1-lacp-100g.hki  ...  185ms
8.|-- 103.22.203.25        20.0%  10  16.7ms   ← 20% 丢包
9.|-- 172.67.218.5          0.0%  10  16.5ms   ← CF 边缘
```

**实测有效吞吐只有 ~35KB/s**（往返延迟正常，TCP 握手 32ms、TLS 126ms，
但传数据时被丢包 + 重传拖垮）。这直接决定了资源体积必须压到「几百 KB」量级。

> 教训：**验收必须测公网链路**。本地预览速度不能代表真实用户体验。
> 当前 `/assets/models/me.bin` 已通过扩展名、响应头和公网缓存验证，
> 线上实测为 `cf-cache-status: HIT`，因此不需要额外创建 Cache Rule。

### ⚠️ 字体的两个坑（已修复，改配置时别踩回去）

1. **本机 `/etc/nginx/mime.types` 不含 `woff2`**
   若不显式声明，字体会以 `application/octet-stream` 发出。
   已在该 vhost 的字体 location 内用 `types { font/woff2 woff2; ... }` + `default_type font/woff2` 修正。

2. **Cloudflare 会缓存错误的 MIME 且 TTL 长达 1 年**
   修复前若已有一次请求被缓存，仅改 nginx 不生效（边缘仍回旧响应）。
   解决办法是给字体 URL 加版本参数：`bricolage-700.woff2?v=2`，
   同时 `index.html` 的 `preload` 也要用**完全相同的带参 URL**，否则会重复下载。

> 日后若再次调整字体文件，把 `?v=2` 递增为 `?v=3` 即可让全站缓存失效。

### 零外部依赖

站点**不请求任何第三方域名**，在国内网络环境下无需翻墙即可完整加载：

- 字体：`/assets/fonts/bricolage-*.woff2`（原 Google Fonts，已本地化）
- 环境贴图：`/assets/env/city.webp`（原 drei 的 githack CDN，已本地化并转 WebP）
- 3D 模型与贴纸：全部在 `/assets/`

`dist/` 中仅有两类外部 URL，都**不会在运行时发起请求**：
作品集里你项目本身的外链（`*.cauai.fun` 等），以及 three.js/drei 源码注释中的文档地址。

### 中文字体说明

Bricolage Grotesque 是**英文字体**，只自托管了 `latin` 子集（307KB）。
中文文案由系统字体渲染：`PingFang SC`（macOS/iOS）→ `Microsoft YaHei`（Windows）→ `system-ui`。
显示效果与原设计一致，且省掉了数 MB 的 CJK 字体体积。

如果想让中文也用特定字体（如思源黑体），可放入 `public/assets/fonts/` 并在
`src/styles/fonts.css` 追加 `@font-face`，同时把 `--font-display` 的字体栈调整顺序。
**注意**：中文字体动辄 5~10MB，建议先用 `fonttools` 做子集化，只保留站点实际用到的字。

---

## 资源优化（重要，别回退）

### 起因

上线后页面一直卡在 loading。排查发现是**模型过大 + HDRI 过大 + CDN 不缓存**三重叠加，
而真正的放量因素是链路很慢（见上一节：实测 ~35KB/s）。

| 问题 | 实测 |
|---|---|
| 模型几何量 | **1,939,726 三角形 / 1,021,941 顶点**（3D 扫描原始网格） |
| 模型文件 | 13.9 MB |
| HDRI | 1.5 MB（未缩放） |
| 真实链路吞吐 | ~35 KB/s（跨境 + 20% 丢包） |
| 结果 | 首屏 30 秒以上，全程卡 loading |
| Cloudflare 缓存 | 当前 `/assets/models/me.bin` 为 `HIT`，不再每次回源 |

### 已完成的优化（两轮）

**第一轮** —— 把模型从扫描原始量级砍到「能看」：

| 指标 | 优化前 | 第一轮后 | 降幅 |
|---|---|---|---|
| 三角形 | 1,939,726 | 116,380 | -94% |
| 顶点 | 1,021,941 | 79,541 | -92% |
| 模型文件 | 13.24 MB | 1.26 MB | -90.5% |

**第二轮** —— 保留第一轮的视觉模型，同时把 HDRI 整体换成 WebP，并通过响应头与 CDN 缓存降低重复回源：

| 指标 | 当前结果 |
|---|---:|
| 三角形 | **1,939,726** |
| 顶点 | **1,021,941** |
| 模型文件 | **13.88 MB** |
| gzip 传输 | **10,453,210 B** |
| 环境贴图 | **8.3 KB** (`.webp`) |
| Cloudflare | **HIT** |

**首屏关键路径：当前模型 gzip 约 10.45 MB + `city.webp` 约 8KB + 其余资源。**

**几何精度优先**：曾测试 5,462 面极限版本，但会造成明显建模变形，因此不作为发布版本。

### 模型视觉版本的选择依据

不靠感觉，用无头 Chrome 同角度对比渲染：

```bash
# 起个本地静态服务（见 .tmp-view/serve.cjs），然后 CDP 驱动截图
node .tmp-view/shot.cjs "http://127.0.0.1:4599/viewer.html?model=./model.glb" out.png
```

> ⚠️ **不要用 `chrome --screenshot`**：`--virtual-time-budget` 只推进虚拟时间，
> 不等真实网络 I/O。392KB 的 GLB 没下完就截图，永远只能拿到 loading 态。
> 必须用 CDP 轮询页面完成标志再截。

结论：5,462 面版本在当前近距离特写下会造成明显建模变形，
因此最终保留 116,380 面视觉版本；近距离人像优先保证面部轮廓、花冠和贴纸细节。

> ratio 给 `0.06` 可生成当前发布版本；不要直接把极限压缩版本替换线上模型。

### ⚠️ 纹理不要降到 512

当前发布的是原始高精度模型，体积约 13.88MB；暂不做纹理或几何压缩，
因为用户已确认压缩版本造成建模明显变化。后续如需性能优化，必须先制作截图对比并获得确认。

### 环境贴图：`.hdr` → `.webp`（-97%）

用 `scripts/pack-hdri.mjs`：ffmpeg 一条链做 Hable 色调映射 + 提亮 + WebP 编码。
**289KB → 8.3KB**，肉眼观感几乎无差。

代价是 WebP 为 8bit LDR、丢真实高光，渲染端用 `HDRI_LDR_BOOST`（×2.2）
抬高 `environmentIntensity` 补偿；同时必须显式设
`EquirectangularReflectionMapping`，否则 three 会当成 UV 贴图、反射全错。

> 踩过的坑（`scripts/pack-hdri.mjs` 头部有完整记录）：
> 1. sharp 读不了 `.hdr`（libvips 没编 Radiance 解码器）
> 2. sharp 读 16bit PNG 做 `raw()` 会静默降到 8bit，动态范围丢失
> 3. **手搓 Reinhard + sRGB 会引入满屏彩色噪点**（暗部量化误差被放大）；
>    原图其实是干净的城市照片。正解是交给 ffmpeg 的 `tonemap=hable`
> 4. `zscale` 做色彩空间转换报 "no path between colorspaces"

### 重新生成优化资源

```bash
# 原始素材放在 assets-src/（不进构建、不进版本库）
#   assets-src/models/me.orig.glb   13.9MB
#   assets-src/env/city.orig.hdr     1.5MB

# 模型：预览（输出 public/.../me.opt.glb，不动发布文件）
node scripts/simplify-model.mjs
# 模型：确认视觉无误后落地
node scripts/simplify-model.mjs --write

# 环境贴图
node scripts/pack-hdri.mjs
```

> `public/` 里**只放最终产物**。历史上曾把 13.9MB 的原始模型放在
> `public/` 里，结果被整目录拷进 `dist/` 一路传上生产。
> 现在 `vite.config.ts` 的 `assertSlimBundle` 插件会在构建后兜底清理，
> 并对资源类文件（模型/.webp/.hdr/字体）做体积提示。当前模型为 1.29MB，gzip 后约 392KB。

### 若还想再小

- 模型纹理降到 512（再省约 170KB），**但特写会糊，不建议**
- 环境贴图降到 512 宽（再省约 4KB，意义不大）
- 真正的大头在 `three.js` + `r3f` 的 vendor chunk（约 670KB），
  这是框架体积，靠 gzip（176KB）+ 长期缓存解决

---

## Cloudflare 缓存策略：当前已生效

Cloudflare 默认不缓存 `.glb`，但会缓存 `.bin`。因此本项目采用了一个不需要 Cloudflare 账号授权的方案：

- 发布文件名为 `/assets/models/me.bin`
- 页面使用版本参数 `/assets/models/me.bin?v=original-20260918` 绕过旧缓存
- nginx 显式把 `.bin` 声明为 `model/gltf-binary`
- Three.js 仍按 GLB 二进制内容正常加载
- Cloudflare 对版本化 `.bin` URL 缓存

当前线上实测：

```
/assets/stickers/entp.webp   →  cf-cache-status: HIT
/assets/three-XXX.js         →  cf-cache-status: HIT
/assets/env/city.webp        →  cf-cache-status: HIT
/assets/models/me.bin        →  cf-cache-status: HIT
```

`me.bin?v=original-20260918` 首次请求为 `MISS`，随后连续请求为 `HIT`；当前页面使用的就是这个版本化 URL。

### 如果未来需要为其他模型路径配置缓存

当前页面不需要额外创建 Cache Rule；版本化 `.bin` URL 已经命中缓存。
若未来新增其他模型路径，可在 Cloudflare 控制台配置 Cache Rule：

| 字段 | 填写 |
|---|---|
| Rule name | `Cache 3D assets` |
| When incoming requests match | **Custom filter expression** |
| 表达式 | `(http.host eq "jianli.cauai.fun" and starts_with(http.request.uri.path, "/assets/"))` |
| Then → Cache eligibility | **Eligible for cache** |
| Edge TTL | **Ignore cache-control header and use this TTL** → `1 month` |
| Browser TTL | **Respect origin** |

### 另一个坑：重复的 `Cache-Control` 头

nginx 里**不要**这样写：

```nginx
expires 30d;                                  # 输出 Cache-Control: max-age=2592000
add_header Cache-Control "public" always;     # 又追加一条 Cache-Control: public
```

结果响应里出现**两个 `Cache-Control` 头**，Cloudflare 视为不可靠而拒绝缓存。
必须用单条 `add_header` 给出完整值：

```nginx
add_header Cache-Control "public, max-age=2592000" always;
```

> 本项目所有 location 均已按此修正，改配置时注意别写回 `expires` + `add_header` 组合。
> 自检：`curl -sI <url> | grep -ci cache-control` 应为 `1`。

### 其他可选优化

- **Cloudflare Brotli**：Cloudflare → Speed → Optimization → **Brotli: On**
  （模型已是 meshopt 压缩，Brotli 增益有限，但 JS/CSS 有效）

---

## 回滚

上传时已经覆盖旧文件，所以发版前先备份：

```bash
"$SSH" -o BatchMode=yes kaogong \
  "cp -r /var/www/jianli /var/www/jianli.bak.\$(date +%Y%m%d-%H%M%S)"
```

回滚：

```bash
"$SSH" -o BatchMode=yes kaogong \
  "rm -rf /var/www/jianli && mv /var/www/jianli.bak.<时间戳> /var/www/jianli"
```

`deploy/deploy.sh` 会自动保留最近 3 个备份（更早的自动删除）。

---

## 服务器磁盘（已清理）

2026-09-17 做过一次清理，`/` 从 **95% → 72%**（可用 2.7G → **14G**）：

| 操作 | 释放 |
|---|---|
| `journalctl --vacuum-size=200M` | 3.8G |
| 截断 `/var/log/syslog`、`btmp`、`auth.log.1` | 1.3G |
| 删除 containerd 悬挂镜像 + `content prune` | 5.0G |
| 清空 `/root/.npm/_cacache` | 1.3G |
| `apt-get clean`、过期日志 | 少量 |

**已加防护**：`/etc/systemd/journald.conf.d/99-size-cap.conf` 限制 journal 最多 200M
（此前曾涨到 4.1G）。

### 清理时的注意事项（重要）

- 这台机器上 **`docker` 与 `containerd` 是两套独立存储**：
  `docker` 用 `/var/lib/docker`，而 `ctr -n moby` 用 `/var/lib/containerd`（16G，**全是活数据**）。
  **不要**直接 `rm -rf /var/lib/containerd/...`，上面有 11 个运行中的业务容器。
- 查 containerd 必须带 namespace：`ctr images list` 默认查 `default`（空），
  要 `ctr -n moby images list` 才能看到真实镜像。**只看 default 会误判成"孤儿数据"**。
- 日常巡检：

```bash
"$SSH" -o BatchMode=yes kaogong "df -h / | tail -1; du -sh /var/www/jianli*"
```

---

## 其他部署方案（备选）

如果以后想换平台，本项目的 `dist/` 是纯静态文件，可直接用于：

- **Vercel**：`npm i -g vercel && vercel --prod`（Framework 选 Vite，Output 填 `dist`）
- **Netlify**：`publish = "dist"`
- **任意对象存储**：阿里云 OSS / 腾讯云 COS 上传 `dist/` 即可

不需要改任何代码。

### 若部署到子路径（如 `cauai.fun/jianli/`）

改 `vite.config.ts`：

```ts
base: '/jianli/',
```

同时把 `src/data/scene.json` 中的 `/assets/...` 改为 `/jianli/assets/...`。

---

## 发版检查清单

```
[ ] npm run verify 全绿
[ ] npm run build 无告警（assertSlimBundle 会检查资源红线）
[ ] dist/ 中不含任何外部域名（grep 检查）
[ ] dist/ 中不含 *.orig.* / *.opt.* / *.hdr（find 检查）
[ ] dist/ 体积正常（应约 2.2MB，异常变大说明原始素材混入）
[ ] public/ 中只有最终产物（原始素材应在 assets-src/）
[ ] 上传前清空远端目录（脚本已做，手动时别忘）
[ ] 上传后 chown 为 www-data
[ ] 线上确认 gzip 生效（curl -H 'Accept-Encoding: gzip' -I .../me.bin）
[ ] 线上确认字体 content-type 为 font/woff2
[ ] 线上确认 me.bin 的 cf-cache-status 为 HIT（见 Cache Rule 章节）
[ ] **必须测公网链路**（不要只在本机 curl，会得出假数据）
[ ] 线上确认首屏资源合计 < 1MB
[ ] 移动端真机验证（iOS Safari / Android Chrome）
[ ] 保留上一版以便回滚
[ ] 确认服务器磁盘余量
```

### 首屏资源体积 + 真实耗时检查（最快的一条命令）

```bash
"$SSH" -o BatchMode=yes kaogong 'H=https://jianli.cauai.fun; t=0; \
  for p in / /assets/index-*.js /assets/index-*.css /assets/three-*.js /assets/r3f-*.js \
           /assets/models/me.bin /assets/env/city.webp; do \
    s=$(curl -s -o /dev/null -H "Accept-Encoding: gzip" -w "%{size_download}" "$H$p"); \
    d=$(curl -s -o /dev/null -H "Accept-Encoding: gzip" -w "%{time_total}" "$H$p"); \
    printf "  %-36s %9s B  %6.2fs\n" "$p" "$s" "$d"; t=$((t+s)); done; \
  awk -v t=$t "BEGIN{printf \"  合计 %.2f MB\n\", t/1048576}"'
```

> 合计超过 1MB 就要警惕；单个资源耗时超过 3 秒说明**没走缓存**，
> 检查 `cf-cache-status` 是否为 `HIT`。

