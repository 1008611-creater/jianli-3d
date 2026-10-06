# AGENTS.md — 项目铁律

本文件是本仓库的最高约束。任何自动化协作（包括 AI 代理）在动手前必须先读本文件。

## 项目定位

刘曙宾的个人 3D 交互简历网站。目标：**自有域名 / 自有 CDN / 自有服务器**，效果对标商业 3D 简历产品，代码与资源版权完全自主。

## 一、版权与素材铁律

1. **不允许抓取、复制、内联任何第三方站点的专有代码**（JS/CSS/HTML 产物、私有引擎、平台 UI 组件）。
2. **允许且仅允许**使用的素材：
   - 用户本人上传/生成的原创内容：`public/assets/models/me.glb`、`public/assets/stickers/*.webp`、`public/assets/thumbs/*.webp`。
   - 用户本人原创文案（见 `src/data/scene.json`）。
   - 开源依赖（见 `package.json`，均为 MIT/Apache 许可）。
3. **严禁**在代码、注释、文档、commit message 中出现第三方平台的品牌名、私有 API 名称、内部字段名。
4. 数据结构采用通用命名（`decals` / `nodes` / `presentation`），不得保留上游字段的专有痕迹。

## 二、架构边界（单向依赖，禁止反向）

```
src/main.tsx
  → src/App.tsx
      → src/data        （纯数据 + 类型，无副作用）
      → src/engine      （Three.js / R3F 渲染层）
      → src/components  （DOM/UI 层）
      → src/hooks       （通用行为）
          → src/engine/math  （纯函数工具）
```

规则：
- `src/engine/*` **不得** import `src/components/*`。
- `src/components/*` **不得**直接操作 Three.js 对象。
- `src/data/*` **不得** import 任何 React 或 Three.js。
- 跨层通信一律通过 props / 配置对象，不允许隐式全局状态。

## 三、数据来源铁律

1. `src/data/scene.json` 是**唯一**的场景数据源。任何镜头、贴纸、文案改动都必须改这个文件，不允许散落在组件里。
2. 数据中的资源路径**必须**是本地相对路径（`/assets/...`）。禁止出现任何外部域名。
3. 不得编造用户经历、作品、联系方式。所有展示内容必须能在 `scene.json` 或用户明确提供的材料中找到依据。

## 四、质量门（提交前必须全绿）

```bash
npm run verify
```

包含：`typecheck` → `lint` → `build` → 产物校验。任一项失败不得声称完成。

## 五、变更风险分级

| 等级 | 范围 | 要求 |
|---|---|---|
| L0 | 文案、样式、纯文档 | 自测即可 |
| L1 | 单个组件/引擎模块逻辑 | typecheck + lint 通过 |
| L2 | 跨模块、数据结构变更 | `npm run verify` + 文档同步 |
| L3 | 构建配置、部署、资源替换 | verify + 真机预览 + 回滚说明 |

## 六、视觉一致性

- 颜色、字体、动效参数统一来自 `src/data/scene.json` 的 `presentation` / `site` 段。
- 新增颜色必须先在配置中定义，不允许在组件里硬编码十六进制色值（`global.css` 的 `:root` 变量除外）。
- 视觉改动必须提供改前/改后截图。

## 七、部署约束

- 构建产物为纯静态文件（`dist/`），不依赖任何服务端运行时。
- 所有资源路径使用相对根路径，支持部署到任意域名下的根目录。
- 若部署到子路径，必须同步修改 `vite.config.ts` 的 `base`。
