# 刘曙宾 · 3D 交互简历

个人 3D 简历网站。自有域名、自有 CDN、自有服务器部署，代码与素材版权完全自主。

**在线效果包含**：3D 人物模型 · 贴纸系统 · 滚动驱动镜头运镜与聚焦 · 景深与辉光 · 作品集画廊 · 响应式。

---

## 快速开始

```bash
npm install
npm run dev        # http://127.0.0.1:5173
```

## 常用命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 → `dist/` |
| `npm run preview` | 预览构建产物 |
| `npm run verify` | **统一质量门**：类型检查 → lint → 构建 → 产物校验 |

## 改内容

所有文案、镜头、贴纸、作品集都在一个文件里：

```
src/data/scene.json
```

| 想改什么 | 改哪一段 |
|---|---|
| 姓名 / 头衔 / 联系方式 | `profile` |
| 封面标题、四角信息 | `hero` |
| 章节文案、外链 | `nodes[].overlay` |
| 镜头机位 | `nodes[].camera.position` / `.target` |
| 贴纸位置与大小 | `decals[].position` / `.normal` / `.size` |
| 主题色、字体、辉光、景深 | `presentation`、`nodes[].render` |
| 作品集条目 | `portfolio.sections[]` |
| 载入屏 | `loading` |

改完存盘即热更新，无需动组件代码。

### 换 3D 模型

替换 `public/assets/models/me.glb` 即可。模型会自动归一化（居中 + 缩放到统一视觉高度），无需手调。若贴纸位置需要微调，改 `decals[].position`。

### 加一张贴纸

1. 图片放进 `public/assets/stickers/`
2. 在 `scene.json` 的 `decals` 数组追加一项：

```json
{
  "id": "my-sticker",
  "source": "upload",
  "imageUrl": "/assets/stickers/my-sticker.webp",
  "position": [0.42, 0.08, 0.33],
  "normal": [0.48, -0.1, 0.87],
  "rotation": 0,
  "size": [0.07, 0.075],
  "metalness": 0,
  "roughness": 1,
  "opacity": 1,
  "label": "贴纸说明"
}
```

`position` 是模型局部坐标，`normal` 决定朝向（让贴纸贴合曲面）。

## 链接章节（深链）

想把某个章节直接发给别人，在 URL 后加锚点：

| 链接 | 效果 |
|---|---|
| `https://你的域名/#stop=0` | 封面（About LIU） |
| `https://你的域名/#stop=1` | 第 1 个章节（2026 · Milestone） |
| `https://你的域名/#stop=2` | 第 2 个章节（精选作品） |
| `https://你的域名/#stop=3` | 第 3 个章节（工程实践） |
| `https://你的域名/#stop=4` | 第 4 个章节（产品判断） |
| `https://你的域名/#s=0.5` | 任意滚动进度（0~1，用于精确定位过渡中的机位） |

`#stop=` 会把镜头锁定在该机位（不随滚动变化），适合截图与逐节校对构图。

## 部署

目标地址 **https://jianli.cauai.fun**

| 项 | 值 |
|---|---|
| 服务器 | `kaogong`（`114.134.185.16`） |
| 站点目录 | `/var/www/jianli` |
| DNS | Cloudflare 托管 `cauai.fun` |
| 证书 | Let's Encrypt（certbot 自动续期） |

一键发版（构建 → 上传 → nginx → 证书）：

```bash
bash deploy/deploy.sh
```

只更新内容：`bash deploy/deploy.sh --no-cert`

完整操作手册、DNS 配置、性能优化与回滚方案见 **[docs/DEPLOY.md](docs/DEPLOY.md)**。

> **零外部依赖**：字体、HDRI、模型、贴纸全部本地化，不请求任何第三方域名。
> 模型 13.9MB 经 nginx 预压缩后 10.5MB，配 Cloudflare Brotli 约 4MB。

## 文档索引

| 文件 | 用途 |
|---|---|
| [AGENTS.md](AGENTS.md) | 项目铁律（版权、架构、质量门） |
| [CONSTRAINTS.md](CONSTRAINTS.md) | 跨项目通用质量约束 |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | 项目审计：技术栈、结构、风险清单 |
| [docs/product-spec.md](docs/product-spec.md) | 需求规格与验收标准 |
| [docs/architecture.md](docs/architecture.md) | 技术架构与关键实现决策 |
| [docs/implementation-plan.md](docs/implementation-plan.md) | 实施计划与任务拆分 |
| [docs/acceptance.md](docs/acceptance.md) | 发版验收清单 |
| [docs/DEPLOY.md](docs/DEPLOY.md) | 部署指南 |

## 技术栈

React 18 · TypeScript 5.6 · Three.js 0.169 · React Three Fiber 8 · drei 9 · postprocessing · Vite 5

## 版权

源码与素材均归本人所有。依赖库遵循各自开源许可（均为 MIT / Apache-2.0）。
Bricolage Grotesque 字体为 SIL Open Font License 1.1。
