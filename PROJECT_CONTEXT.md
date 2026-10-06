# PROJECT_CONTEXT.md

项目初始化审计结果。所有结论均附证据来源。

## 1. 技术栈

| 项 | 值 | 证据 |
|---|---|---|
| 语言 | TypeScript 5.6（strict） | `tsconfig.json` |
| 框架 | React 18.3 | `package.json` |
| 3D | three 0.169 + @react-three/fiber 8 + drei 9 | `package.json` |
| 后处理 | @react-three/postprocessing + postprocessing | `package.json` |
| 构建 | Vite 5.4 | `vite.config.ts` |
| 样式 | 原生 CSS（CSS 变量驱动） | `src/styles/global.css` |
| 包管理 | npm | `package-lock.json` |

## 2. 运行方式

```bash
npm install          # 安装依赖
npm run dev          # 开发（http://127.0.0.1:5173）
npm run build        # 生产构建 → dist/
npm run preview      # 本地预览构建产物（http://127.0.0.1:4173）
npm run verify       # 统一质量门
```

## 3. 目录结构

```
jianli/
├── AGENTS.md                  # 项目铁律
├── PROJECT_CONTEXT.md         # 本文件
├── CONSTRAINTS.md             # 跨项目质量约束
├── index.html                 # 入口 HTML（SEO / OG 元信息）
├── vite.config.ts             # 构建配置（含分包策略）
├── public/
│   └── assets/
│       ├── models/me.glb      # 3D 人物模型（用户自有，13.9 MB）
│       ├── stickers/*.webp    # 贴纸素材（用户自有，11 张）
│       └── thumbs/*.webp      # 章节配图（用户自有，5 张）
├── src/
│   ├── main.tsx               # 应用入口
│   ├── App.tsx                # 页面编排
│   ├── data/
│   │   ├── scene.json         # ← 唯一场景数据源
│   │   ├── types.ts           # 数据结构定义
│   │   └── index.ts           # 类型安全导出
│   ├── engine/                # 3D 渲染层
│   │   ├── Experience.tsx     # Canvas 组装
│   │   ├── AvatarModel.tsx    # 模型 + 贴纸
│   │   ├── CameraRig.tsx      # 镜头运动
│   │   ├── Effects.tsx        # 辉光 + 景深
│   │   ├── SceneLights.tsx    # 灯光
│   │   └── math.ts            # 纯函数工具
│   ├── components/            # UI 层
│   │   ├── LoadingScreen.tsx
│   │   ├── HeroOverlay.tsx
│   │   ├── NodeOverlay.tsx
│   │   ├── Timeline.tsx
│   │   ├── Portfolio.tsx
│   │   ├── LinkPill.tsx
│   │   └── Icon.tsx
│   ├── hooks/
│   │   ├── useScrollProgress.ts
│   │   └── useMediaQuery.ts
│   └── styles/global.css
└── scripts/verify.mjs         # 质量门脚本
```

## 4. 资源与数据来源

| 资源 | 来源 | 版权归属 |
|---|---|---|
| `me.glb` | 用户本人在原平台生成的 3D 人物模型 | 用户自有 |
| `stickers/*.webp` | 用户本人选用/上传的贴纸 | 用户自有 |
| `thumbs/*.webp` | 用户本人项目的渲染截图 | 用户自有 |
| `scene.json` 中的文案 | 用户本人撰写 | 用户自有 |
| 全部源码 | 本项目原创实现 | 用户自有 |

**已完成的本地化**：原配置中 17 个外部资源链接已全部替换为 `/assets/` 本地路径，运行时对外部域名零依赖。

## 5. 外部依赖与安全边界

- **无服务端**：纯静态站点，无 API 调用、无数据库、无凭证。
- **无第三方运行时请求**：字体来自 Google Fonts（可替换为自托管，见 CONSTRAINTS §5）。
- **无隐私采集**：不含任何统计、埋点、cookie。
- **联系方式为公开信息**：由用户主动提供并授权展示。

## 6. 当前质量门状态

| 项 | 状态 |
|---|---|
| TypeScript 严格类型 | ✅ 已启用 `strict` |
| ESLint | ✅ 已配置 |
| 构建 | ✅ `npm run build` |
| 统一验证命令 | ✅ `npm run verify` |
| 单元测试 | ⚠️ 未配置（当前以构建 + 真机预览为主） |
| E2E | ⚠️ 未配置 |

## 7. 风险清单

| 风险 | 等级 | 说明 | 缓解 |
|---|---|---|---|
| 模型体积 13.9 MB | 中 | 首屏加载慢 | 已配 gzip/brotli 可压至 ~4 MB；建议 CDN 开启压缩 |
| WebGL 不可用 | 中 | 老旧设备/禁用硬件加速时黑屏 | 已有 `<noscript>` 兜底，建议补充 WebGL 检测降级 |
| 字体外链 | 低 | 依赖 Google Fonts | 见 CONSTRAINTS §5，可自托管 |
| 移动端性能 | 中 | 3D + 后处理在低端机上掉帧 | 已限制 `dpr`，后处理可按需关闭 |
| 无自动化测试 | 中 | 回归靠人工 | 见 CONSTRAINTS §6 测试要求 |
