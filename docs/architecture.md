# 技术架构

## 渲染管线

```
滚动事件 (window.scrollY)
      │
      ▼
useScrollProgress            进度 0..1，rAF 阻尼插值
      │                    ┌─ 输出 progress    → 镜头轨道位置
      │                    └─ 输出 activeIndex → 当前聚焦章节
      │
      ├──────────────► CameraRig
      │                  hero + 4 stops 串成轨道
      │                  按 progress 分段插值（easeInOutCubic）
      │                  + 阻尼跟随（damp λ=6）
      │                  + 指针视差
      │                  + 窄屏自动后退
      │
      ├──────────────► Effects
      │                  景深焦平面 = 相机到 stop.target 的实际距离
      │                  每帧 damp 平滑，实现"镜头对焦"观感
      │                  Bloom 阈值/强度来自当前 stop 配置
      │
      └──────────────► UI 层（DOM）
                         HeroOverlay    按 progress 淡出
                         NodeOverlays   按 activeIndex 切换可见
                         Timeline       按 activeIndex 高亮
                         Portfolio      独立文档流，滚动至此
```

## 场景数据结构

`src/data/scene.json` 是唯一数据源：

```
scene
├── profile        姓名/头衔/邮箱/电话/微信/GitHub/城市
├── model          url, scale, position
├── decals[10]     id, imageUrl, position[3], normal[3], rotation, size[2], 材质参数
├── nodes[4]       camera{position,target}, render{lights,bloom,dof}, overlay{文案,links}
├── presentation   environment(HDRI), 颜色, 字体, 指针视差, 噪点
├── hero           title, body, 四角信息, links, camera, render
├── loading        background, text, spinnerStyle/Color, template
└── portfolio      template, sections[{title, items[{name,url,description}]}]
```

## 关键实现决策

### 1. 贴纸用「法线朝向平面」而非 Decal 注入

`Decal` 需要把自己注入目标网格的材质中。本模型是单一网格 + 三张贴图，注入可行，但在 `scale`/`offset` 变换叠加下容易出现位置偏移。

采用方案：读取每个贴纸的 `position` 与 `normal`，用 `setFromUnitVectors(+Z, normal)` 构造四元数对齐朝向，再沿法线外推 `max(size)*0.06` 避免 z-fighting。位置坐标与原始数据一一对应，结果可预测且稳定。

### 2. 镜头轨道而非逐 stop 切换

若用"到达某 stop 就切换相机"，快速滚动时会产生跳变。改为把 `hero + 4 stops` 连成一条 5 点轨道，把全局进度 0..1 映射到 4 个段并插值，配合 `MathUtils.damp` 阻尼，滚动再快也连续。

### 3. 景深动态对焦

不使用配置里的静态 `focusDistance` 数值（那是原平台按其相机单位标定的），改为每帧计算 `camera.position.distanceTo(stop.target)` 作为焦平面，再 damp 平滑。好处：任意视口比例下对焦都正确。

### 4. 模型归一化

GLB 原始包围盒极小（±32767 单位）。加载后计算包围盒，取最长边缩放到目标高度 2.2 世界单位，并把中心平移到原点。这样配置里的 `position`/`scale` 才有可预期语义。

### 5. 分包策略

`three` / `r3f` / `react` 各自独立 chunk。three.js 版本更新频率低于业务代码，独立分包可让用户长期复用缓存。

## 性能预算

| 项 | 预算 | 当前 |
|---|---|---|
| 首屏 JS（gzip 后） | < 400 KB | three+r3f+react ≈ 350 KB |
| 模型 `me.bin?v=original-20260918` | — | 13.88 MB，gzip 后约 10.45 MB |
| 贴纸 11 张 | < 300 KB | 284 KB |
| 帧率（桌面） | ≥ 55 fps | 待实测 |
| DPR 上限 | 1.75 | 已限制 |

**优化建议**（按收益排序）：
1. 模型用 Draco / Meshopt 压缩，可再降 60–80%。需在构建流程中加压缩步骤。
2. 模型改为 KTX2 纹理压缩。
3. CDN 开启 Brotli，模型体积再降约 15%。

## 架构边界

```
src/data      ← 零依赖（纯数据 + 类型）
src/engine    → 可依赖 data、engine/math
src/components→ 可依赖 data、Icon；不得直接操作 Three.js 对象
src/hooks     → 可依赖 engine/math
src/App.tsx   → 编排层，可依赖以上全部
```
