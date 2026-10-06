# 项目长期约定（3D 交互简历 · 刘曙宾）

## 用户
- **姓名**：刘曙宾 / LIU Shubin。ANS＆CAU HUB 创始人，北京·海淀。
- 沟通用中文。**关注最终效果**，不喜欢被问一堆细节；能自己决定的就别问。
- 微信 `ANS_0912`，电话 `18518090752`，GitHub `1008611-creater`。

## 部署环境（已确认）
| 项 | 值 |
|---|---|
| SSH 别名 | `kaogong` = `114.134.185.16`（root，Ubuntu 22.04，nginx 1.18） |
| 站点目录 | `/var/www/jianli`（属主 `www-data:www-data`） |
| Nginx 配置 | `/etc/nginx/sites-available/jianli.cauai.fun` |
| 域名 | `jianli.cauai.fun` |
| DNS | Cloudflare 托管 `cauai.fun`（NS: pete/khloe.ns.cloudflare.com），**已上线** |
| 证书 | Let's Encrypt，有效期至 2026-12-16，certbot 自动续期 |

**其他可用服务器**（见 `C:\Users\lsb\.ssh\SERVERS.md`）：
- `haika-1757` = `38.76.193.254`（Docker 为主，无系统 nginx）
- `haika-niannian` = `103.85.227.94`（**root 禁用**，必须用 `niannian-admin`）

## 部署红线与坑
1. **沙箱里 ssh 必须用 Git 自带**：`/c/Program Files/Git/usr/bin/ssh.exe`
   系统自带的 `C:\Windows\System32\OpenSSH\ssh.exe` 会静默失败（退出码 255、无报错）。
2. **不要重新生成密钥、不要动服务器 authorized_keys**。
3. **服务器无 rsync**（本机也没有）。上传用 **tar over ssh**：
   `tar czf - -C dist . | ssh ... "tar xzf - -C /var/www/..."`，
   上传后必须 `chown -R www-data:www-data`（tar 会带上 Windows 的 UID 197609）。
   **上传前必须清空远端目录**，否则旧 hash chunk 会残留（脚本已做）。
4. **`kaogong` 磁盘**：2026-09-17 已从 95% 清到 **72%（14G 可用）**。
   ⚠️ **绝不手工删 `/var/lib/containerd/...`**——`ctr -n moby` 上有 11 个运行中的业务容器。
   查 containerd 必须带 namespace（`ctr -n moby images list`），
   默认的 `default` namespace 是空的，只看它会误判成"孤儿数据"。
   `docker`（`/var/lib/docker`）与 `containerd` 是**两套独立存储**，各有活容器。
   只允许用 `ctr images rm` + `ctr -n moby content prune references`。
5. 改 nginx 配置后脚本里用 `cat > remote` 配合本地文件重定向，
   **不要在 ssh 命令里嵌 heredoc**（会触发权限解析失败）。
6. **字体 MIME 两个坑**（已修，别踩回去）：
   - 本机 `/etc/nginx/mime.types` **不含 woff2**，须在字体 location 显式
     `types { font/woff2 woff2; }` + `default_type font/woff2`。
   - Cloudflare 会缓存错误 MIME 且 TTL 一年，改 nginx 不生效；
     用版本参数 `?v=2` 破缓存，且 `index.html` 的 `preload` 要用**完全相同的带参 URL**。
     日后换字体文件就把 `?v` 递增。
7. **多子域共用服务器时 nginx 会回退到默认 vhost 的证书**，
   每个域名都要有自己的证书，否则 Cloudflare Full(strict) 回源失败。


## 项目约定
- **唯一数据源**：`src/data/scene.json`（文案/镜头/贴纸/作品集/主题色全在这里）。
  改内容只动这个文件，不碰组件代码。
- **零外部依赖**：字体、HDRI、模型、贴纸全部本地化到 `public/assets/`。
  新增资源时不要引入第三方 CDN（国内会慢或被墙）。
- **质量门**：`npm run verify`（typecheck → lint → build → 产物校验）必须全绿才能发版。
- **版权边界**：只使用用户自有的内容与素材；实现代码全部原创，
  不复制第三方平台的前端代码。

## 关键实现决策（改代码前先读）
- 模型归一化：`MODEL_SPAN = 1.45`（GLTFLoader 已自动应用 node scale 0.49，
  加载后实际约 1 单位，不是 ±32767）。
- 相机 `fov = 45`（32 时视野高度 0.83 < 模型高 1.0，只看到脸）。
- 贴纸吸附：以锚点法线为**方位语义**，从模型外沿 `-normal` 射线投射求交，
  命中点即真实表面，朝向对齐命中面法线。不要直接用锚点坐标（会飘在体外）。
- HDRI 必须本地（drei `preset` 会联网拉，失败会炸掉整棵 3D 树导致白屏）。
  正确属性名是 `environmentRotation`，不是 `rotation`。
- 深链：`#stop=<n>` 锁定机位，`#s=<0..1>` 定位滚动进度。

## 性能红线（发版前必查）
- **模型体积**：`public/assets/models/me.glb` 必须保持在 ~1.3MB。
  原始扫描网格是 194 万面 / 13.9MB，会导致首屏加载 12 秒以上、卡死 loading。
  已简化到 11.6 万面 / 1.26MB（`node scripts/simplify-model.mjs 0.06 --write`）。
  **替换模型后务必重新跑简化**。
- **HDRI**：`public/assets/env/city.hdr` 保持在 ~0.29MB（512×256）。
  用 ffmpeg 缩放，**不要手写 RGBE 编解码**：
  `ffmpeg -i in.hdr -vf scale=512:256 -update 1 -frames:v 1 out.hdr`
  （必须 `-update 1`，输出用 Windows 绝对路径）。
- **服务器上行带宽只有 ~1.1MB/s**——**首屏关键资源合计必须 < 2MB**。
  当前为 1.71MB（约 1.6 秒）。新增素材前先问：能不能压？
- **`dist/` 中不能有 `*.orig.*` 备份**（会白传 15MB）。
  `vite.config.ts` 的 `prunePublicArtifacts` 插件已自动清理，改构建配置时别删掉。
- **Cloudflare 默认不缓存 `.glb` / `.hdr`**（`.webp` / `.js` 才在默认名单）。
  可加 Cache Rule 解决，见 `docs/DEPLOY.md`。
- **nginx 不要写 `expires N` + `add_header Cache-Control`**：
  会输出两个 `Cache-Control` 头，Cloudflare 拒绝缓存。只用单条 `add_header`。

## 沙箱能力限制（本会话实测）
- **禁止本地回环连接**、**禁止 Chrome 写 profile/user-data-dir** →
  headless 浏览器验证已不可用，改用 `ssh kaogong "curl ..."` 在服务器本机验收。
- SSH 传大文件（如 10MB 的 me.glb）会被 SIGTERM 截断 →
  只看响应头（`curl -I`），不要拉完整文件。
- `vite build` 若报 `[safe-delete] ... ETIMEDOUT`（回收站 shim 卡住），
  先 `rm -rf dist` 再 build。

