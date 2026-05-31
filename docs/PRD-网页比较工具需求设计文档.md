# Web Page Comparator 需求设计文档

> 版本：v2.0 | 日期：2026-05-30 | 状态：待评审

---

## 目录

1. [概述与目标](#1-概述与目标)
2. [小白用户体验专项优化](#2-小白用户体验专项优化)
3. [核心体验优化](#3-核心体验优化)
4. [结果分析增强](#4-结果分析增强)
5. [URL 输入与管理](#5-url-输入与管理)
6. [历史记录管理](#6-历史记录管理)
7. [性能与健壮性](#7-性能与健壮性)
8. [安全与运维](#8-安全与运维)
9. [其他体验细节](#9-其他体验细节)
10. [实现优先级与排期建议](#10-实现优先级与排期建议)

---

## 1. 概述与目标

### 1.1 产品定位

网页比较工具是一站式网页差异分析平台，帮助用户快速、直观地发现两个网页在 DOM 结构、视觉外观和文本内容维度的差异。

### 1.2 目标用户画像

| 用户类型 | 场景 | 痛点 |
|---------|------|------|
| QA 测试工程师 | 对比灰度环境与线上环境页面 | 需要快速定位差异区域，生成测试报告 |
| 前端开发者 | 对比组件库不同版本渲染结果 | 需要精确的 DOM 差异和像素级视觉对比 |
| 产品/运营人员（小白用户） | 检查中英文站页面一致性 | 不懂技术术语，需要直观的所见即所得 |
| 设计走查人员 | 校验实现稿与设计稿 | 需要高精度的视觉叠加对比 |

### 1.3 设计原则

- **零学习成本**：小白用户首次使用 30 秒内完成第一次对比
- **所见即所得**：差异之处用颜色和图形直接标注在原图上，减少抽象数据
- **渐进式披露**：默认只展示核心结果，高级选项按需展开
- **容错与引导**：错误操作有明确提示和恢复路径，而非直接报错

---

## 2. 小白用户体验专项优化

> 核心目标：**一个没有技术背景的用户，打开网站后 30 秒内能独立完成一次对比，并看懂结果。**

### 2.1 首次使用引导

**问题**：当前首页只有标题 + 两个输入框 + 按钮，新用户不知道从哪里开始。

**方案**：

```
┌─────────────────────────────────────────────────────┐
│  🧪 网页比较工具                                      │
│  输入两个网址，看看它们哪里不一样                        │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌─ 示例快速体验 ─────────────────────────────────┐  │
│  │  👉 试试：中英文华为官网对比                       │  │
│  │  A: https://www.huawei.com/cn/                   │  │
│  │  B: https://www.huawei.com/en/                   │  │
│  │  [一键填充并开始]                                  │  │
│  │                                                   │  │
│  │  👉 试试：两个不同版本的 Bootstrap 文档页           │  │
│  │  A: https://getbootstrap.com/docs/5.2/            │  │
│  │  B: https://getbootstrap.com/docs/5.3/            │  │
│  │  [一键填充并开始]                                  │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ── 或者手动输入 ──                                   │
│                                                       │
│  🔵 网址 A   [https://example.com/page1          ]   │
│  🟢 网址 B   [https://example.com/page2          ]   │
│                                                       │
│  [🔄 互换]                              [🚀 开始比较] │
│                                                       │
│  💡 提示：也可以从历史记录中"重新对比"已有的URL对        │
└─────────────────────────────────────────────────────┘
```

**关键要素**：
- **示例一键填充**：降低首次使用的心理门槛，用户不需要自己想 URL
- **占位符文案优化**：用真实网址格式而非 `example.com`
- **引导性提示**：告诉用户还有其他使用方式

### 2.2 输入引导与即时反馈

**问题**：用户输入错误时只有红色文字提示，缺少引导。

**方案**：

- **实时 URL 格式检测**：输入框失焦时自动补全 `https://` 前缀
- **URL 可访问性预检**：输入 URL 后显示小图标（✅ 可访问 / ⚠️ 无法访问 / 🔄 检测中），帮助用户在提交前发现问题
- **相同 URL 提示**：两个 URL 相同时，输入框下方显示 🟡 "两个网址相同，对比结果将无差异，确定继续吗？"
- **内网地址提示**：检测到 `localhost`、`192.168.x.x`、`10.x.x.x` 时显示 🛡️ "检测到内网地址，可能无法访问"

**组件状态枚举**：

```
输入框状态：
  idle        — 默认
  validating  — 校验中（失焦后触发）
  valid       — 校验通过 ✅
  warning     — 可提交但有问题 ⚠️（如同 URL、慢速响应）
  error       — 无法提交 ❌（如格式错误、无法访问）
```

### 2.3 结果页面分步引导

**问题**：当前结果页面直接展示 5 个区域，信息过载，小白用户不知道该看哪里。

**方案**：结果页面顶部增加可折叠的"快速导读"卡片：

```
┌─────────────────────────────────────────────────────┐
│  📊 对比完成！两个页面相似度：78%                       │
│                                                       │
│  发现 3 类差异：                                       │
│  🟡 DOM 结构：42 处差异（中等）                        │
│  🔴 视觉样式：15.3% 像素不同（严重）                     │
│  🟢 文本内容：8 处差异（轻微）                          │
│                                                       │
│  💡 建议优先查看：视觉差异图（差异最显著）  [👉 去看看]  │
│  [展开查看解读说明]                                    │
└─────────────────────────────────────────────────────┘
```

**各区域增加人类可读的文字说明**：

- **概览区域**：顶部增加一行解读文字，如"两个页面在视觉上差异较大，DOM 结构基本一致，可能是样式调整导致"
- **视觉差异区域**：差异图上叠加标注"🔴 这里不同"
- **DOM 差异区域**：每个差异项附带通俗说明，如"这个按钮从蓝色变成了绿色"而非"属性 class 从 btn-primary 变为 btn-success"

### 2.4 术语通俗化

**问题**：当前界面术语偏技术化（DOM、像素、属性更改），产品/运营人员难以理解。

**方案**：提供"小白模式"切换开关（默认开启），将技术术语替换为通俗表达：

| 技术术语（高级模式） | 通俗表达（小白模式） |
|---------------------|---------------------|
| DOM 结构差异 | 页面元素变化 |
| 像素差异 | 视觉样式差异 |
| 属性更改 (class) | 样式类名变化 |
| 属性更改 (href) | 链接地址变化 |
| 文本更改 | 文字内容修改 |
| diff_percentage | 视觉相似度 |
| added_elements | 新增的元素 |
| removed_elements | 被删除的元素 |
| total_pixels | 截图总面积 |

**实现方式**：在导航栏添加 `👤 小白模式 / 🔧 专家模式` 切换开关，i18n 文件中维护两套措辞。

### 2.5 帮助中心

在导航栏右侧增加 `❓ 帮助` 入口，点击弹出侧边抽屉：

- **快速入门**（3 步图解）
- **各维度解读**（DOM 差异怎么看？视觉差异图怎么看？）
- **常见问题**（为什么全页面截图很大？为什么对比慢？）
- **键盘快捷键列表**

### 2.6 操作可撤销

**问题**：用户误删历史记录后无法恢复。

**方案**：
- 删除操作改为"软删除"（标记删除，24 小时后物理清理）
- 删除后显示 Toast 提示，包含"撤销"按钮（5 秒内可撤销）
- 批量操作同样支持撤销

---

## 3. 核心体验优化

### 3.1 滑动叠加对比模式

**当前状态**：翻译文件 `screenshots.slider_overlay` 已定义，ScreenshotPanel 已渲染 `side_by_side` 和 `slider_overlay` 切换按钮，但叠加模式未实现。

**目标**：在一个容器内叠加两张截图，用户拖动滑块左右滑动来对比。

**详细设计**：

```
┌──────────────────────────────────────────────┐
│  截图对比  [并排显示] [🔴 滑动叠加]            │
├──────────────────────────────────────────────┤
│                                               │
│  ┌─────────────────────────────────────┐     │
│  │                                     │     │
│  │    截图 B（底层，全宽显示）            │     │
│  │    ┌──────────┐                    │     │
│  │    │截图 A    │                    │     │
│  │    │（左半）  │                    │     │
│  │    │          │ ← 拖动滑块          │     │
│  │    └──────────┘                    │     │
│  │         ↑ 分割线（带拖动把手）        │     │
│  │                                     │     │
│  └─────────────────────────────────────┘     │
│                                               │
│  🟦 A 截图          🟩 B 截图                 │
└──────────────────────────────────────────────┘
```

**交互细节**：
- 默认分割线在 50% 位置
- 分割线中心有一个圆形把手（30px 直径，带 ↔ 图标），可触摸/拖动
- 分割线两侧标注"A"和"B"小标签
- 支持键盘 `←` `→` 微调（每次 1%）
- 支持触屏滑动
- 分割线位置记忆（切换回并排模式再切回来保持原位）

**数据结构**：

```ts
type OverlayMode = {
  splitPosition: number  // 0-100, 分割线位置百分比
  dragging: boolean
}
```

**实现要点**：
1. 底层渲染截图 B（`object-fit: contain`，全宽）
2. 上层渲染截图 A，使用 `clip-path: inset(0 calc(100% - splitPos%) 0 0)` 裁剪
3. 分割线为绝对定位的 `div`，left = splitPos%
4. 在容器上监听 `mousemove`/`touchmove`，更新 splitPosition

### 3.2 视觉差异区域列表 + 点击定位

**当前状态**：视觉差异图是一个整张图片，全页面截图时差异可能分散在数千像素高度的图片中，用户需要手动滚动查找。

**目标**：自动检测差异聚集区域，生成差异块列表，点击可快速定位。

**详细设计**：

```
┌─────────────────────────────────────────────────────┐
│  视觉比较（15.3% 像素不同）                            │
│  [差异图] [高亮 A] [高亮 B]    🔍 [-] 100% [+] ↺     │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │                                             │    │
│  │  ┌─差异 #1──┐                               │    │
│  │  │          │        差异图                  │    │
│  │  └──────────┘                               │    │
│  │                    ┌─差异 #2──┐              │    │
│  │                    │          │              │    │
│  │                    └──────────┘              │    │
│  │  ┌─差异 #3──┐                               │    │
│  │  │          │                               │    │
│  │  └──────────┘                               │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  差异区域列表（共 8 处）：                               │
│  ┌─────────────────────────────────────────────────┐ │
│  │ #1 🔴 导航栏区域 · 320×48px · 差异 45%  [📍 定位] │ │
│  │ #2 🟡 轮播图区域 · 1200×400px · 差异 12% [📍 定位] │ │
│  │ #3 🟡 产品列表区 · 960×320px · 差异 8%   [📍 定位] │ │
│  │ ...更多                                          │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**后端实现**（visual_comparator.py）：

```python
def detect_diff_regions(diff_array: np.ndarray, min_area: int = 100) -> list[dict]:
    """
    在差异图像中检测连通差异区域。
    diff_array: 二值图像 (H, W)，255=有差异，0=无差异
    返回: [{x, y, width, height, diff_pixel_count, diff_ratio}, ...]
    """
    from scipy import ndimage
    
    labeled, num_features = ndimage.label(diff_array)
    regions = []
    for i in range(1, num_features + 1):
        ys, xs = np.where(labeled == i)
        if len(xs) < min_area:
            continue
        x, y = int(xs.min()), int(ys.min())
        w, h = int(xs.max() - x + 1), int(ys.max() - y + 1)
        region_pixels = diff_array[ys, xs]
        diff_count = int(np.sum(region_pixels > 0))
        total = len(region_pixels)
        regions.append({
            "x": x, "y": y, "width": w, "height": h,
            "diff_pixel_count": diff_count,
            "diff_ratio": round(diff_count / total * 100, 1),
        })
    
    # 按差异像素数降序排列
    regions.sort(key=lambda r: r["diff_pixel_count"], reverse=True)
    return regions
```

**前端实现**：
- 在差异图上叠加绝对定位的矩形框（红色半透明边框）
- 矩形框标注序号
- 列表中每项有"定位"按钮，点击后：
  - 容器 `scrollTop` 滚动到差异区域位置
  - 自动缩放使该区域居中
- 矩形框 hover 时高亮，列表对应项同步高亮

**数据模型扩展**：

```python
class VisualDiffResult(BaseModel):
    # ... 现有字段 ...
    diff_regions: list[DiffRegion] = []  # 新增

class DiffRegion(BaseModel):
    x: int
    y: int
    width: int
    height: int
    diff_pixel_count: int
    diff_ratio: float  # 该区域内差异像素占比
```

### 3.3 "重新对比"功能

**问题**：历史记录中只能查看和删除，无法快捷地重新发起相同的对比。

**方案**：

**位置 1** — 历史列表每行增加按钮：

```
操作： [查看] [🔄 重新对比] [🗑 删除]
```

**位置 2** — 结果页面 URL 信息区域增加按钮：

```
┌────────────────────────────────────────────┐
│ 🔵 A: https://www.huawei.com/cn/           │
│ 🟢 B: https://www.huawei.com/en/           │
│ [🔄 重新对比] [📋 复制链接]                  │
└────────────────────────────────────────────┘
```

**行为**：
- 点击"重新对比" → 发起新的 POST 请求 → 跳转到新的 taskId 结果页
- 缓存有效时直接返回缓存结果（< 1 秒）
- 缓存过期时重新执行完整对比流程
- 重新对比前弹出确认框："将重新抓取页面进行对比，这可能需要一些时间。"

### 3.4 对比完成后浏览器通知

**目标**：用户切换到其他标签页后，对比完成时收到系统通知。

**实现要点**：

```js
// 在 useComparison hook 中
function notifyComparisonComplete(data) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification('网页对比完成', {
      body: `${data.url_a} vs ${data.url_b} — ${getSummary(data)}`,
      icon: '/favicon.ico',
      tag: data.id,
    })
  }
}
```

- 首次使用请求通知权限
- 通知内容包含 URL 摘要和差异概览
- 点击通知自动聚焦到结果页面对应标签页
- 仅在 `document.hidden`（用户不在该标签页）时发送通知

---

## 4. 结果分析增强

### 4.1 对比结果导出

**目标**：支持导出为 PDF 报告、HTML 离线报告、JSON 原始数据。

#### 4.1.1 PDF 报告导出

**前端生成**（使用 `jsPDF` + `html2canvas`）：

```
┌──────────────────────────────────────┐
│                                      │
│         网页比较报告                   │
│         2026-05-30 14:30             │
│                                      │
│  URL A: https://...                  │
│  URL B: https://...                  │
│                                      │
│  ┌──────────────────────────────┐   │
│  │  概览                         │   │
│  │  DOM 差异: 42   视觉: 15.3%   │   │
│  └──────────────────────────────┘   │
│                                      │
│  [截图 A 缩略图]  [截图 B 缩略图]     │
│                                      │
│  [视觉差异图]                         │
│                                      │
│  DOM 差异详情（表格）                  │
│  ─────────────────────               │
│  | 类型 | 标签 | 详情 |              │
│  | 新增 | div  | ...  |              │
│  ─────────────────────               │
│                                      │
│  Text 差异详情                       │
│  ─────────────                       │
│  ...                                 │
└──────────────────────────────────────┘
```

**导出按钮位置**：结果页面右上角工具栏

```
[📄 导出 PDF] [📝 导出 HTML] [📋 复制 JSON]
```

#### 4.1.2 JSON 数据导出

直接下载 `result.json`（已有后端存储），前端添加下载按钮。

#### 4.1.3 分享链接

- 生成分享链接：`/compare/{taskId}?share=true`
- 分享链接仅包含公开可访问的数据（无敏感信息）
- 复制链接到剪贴板，附带 Toast 提示

### 4.2 整体相似度评分

**问题**：当前概览卡片分别展示三个维度的数据，缺少一个"总分"让用户一眼判断差异程度。

**方案**：

```
┌───────────────────────────────────────┐
│                                       │
│       🧪 整体相似度                     │
│                                       │
│         78%                           │
│     ████████████░░░░                   │
│                                       │
│  两个页面有一定差异，主要差异在视觉样式   │
│                                       │
└───────────────────────────────────────┘
```

**计算规则**：

```
视觉权重 = 0.5 (视觉差异最直观)
DOM 权重 = 0.3
文本权重 = 0.2

DOM 得分 = 1 - min(dom_diff_count / max(total_a, total_b), 1)
视觉得分 = 1 - visual_diff_percentage / 100
文本得分 = 1 - min(text_diff_count / max(total_lines_a, total_lines_b), 1)

整体相似度 = (DOM得分 × 0.3 + 视觉得分 × 0.5 + 文本得分 × 0.2) × 100
```

**展示规则**：

| 相似度 | 颜色 | 标签 | 文案 |
|--------|------|------|------|
| 95%+ | 绿色 | 几乎一致 | 两个页面基本相同 |
| 80-95% | 黄色 | 轻微差异 | 两个页面整体一致，存在少量差异 |
| 50-80% | 橙色 | 明显差异 | 两个页面有较大差异，建议重点查看视觉对比 |
| <50% | 红色 | 严重差异 | 两个页面差异很大，可能是不同版本或完全不同页面 |

### 4.3 DOM 差异树状视图

**问题**：当前 DOM 差异是扁平列表，无法看出元素之间的层级关系。

**方案**：在现有列表视图基础上，增加"树状视图"切换按钮。

```
[📋 列表视图] [🌳 树状视图]
```

**树状视图设计**：

```
├── 📦 body
│   ├── 📦 header
│   │   ├── nav
│   │   │   ├── 🟢 a (新增) "Products"
│   │   │   └── 🟡 ul (属性变更) class: "nav-list" → "nav-menu"
│   ├── 📦 main
│   │   ├── 🔴 section (已移除) id: "hero-banner"
│   │   ├── div.card
│   │   │   ├── h3
│   │   │   └── ✏️ p (文本变更) "Learn More" → "了解更多"
│   └── 📦 footer
│       └── ...
```

**实现要点**：
- 使用 A 页面的 DOM 树作为骨架
- 在树上用颜色标注差异节点类型（新增/移除/属性变更/文本变更）
- 默认展开到第一个差异节点，其余折叠
- 点击差异节点 → 展开详情面板（属性对比、文本对比）
- 搜索框支持搜索，自动展开匹配路径

### 4.4 文本差异按段落分组

**问题**：当前文本差异是全局逐行对比，两个页面对应区域的行号可能不同，导致难以匹配。

**方案**：
- 在 DOM 对比阶段，按语义区块（section/article/nav/footer 等）分割文本
- 对每个区块内的文本单独做 diff
- 展示时先按区块分组，再显示区块内的差异

**前端展示**：

```
┌──────────────────────────────────────────────┐
│  文本内容  [按区块分组] [全局对比]             │
├──────────────────────────────────────────────┤
│                                               │
│  📍 区块：header / nav                        │
│  ────────────────────────────────────────     │
│  A: "产品 | 解决方案 | 关于我们"               │
│  B: "Products | Solutions | About Us"         │
│  变更：3 处                                   │
│                                               │
│  📍 区块：main / section[1] / h1              │
│  ────────────────────────────────────────     │
│  A: "构建万物互联的智能世界"                    │
│  B: "Building a Fully Connected..."           │
│  变更：1 处                                   │
│                                               │
│  📍 区块：footer / div.copy                   │
│  ────────────────────────────────────────     │
│  ✅ 内容一致                                  │
│                                               │
└──────────────────────────────────────────────┘
```

---

## 5. URL 输入与管理

### 5.1 对比选项暴露给用户

**当前状态**：后端支持 `comparisons: ["dom", "visual", "text"]` 选项，前端固定发送全部三项。

**方案**：输入表单增加可展开的"高级选项"区域。

```
┌──────────────────────────────────────────────────────┐
│  🔵 网址 A     [https://...                    ]     │
│  🟢 网址 B     [https://...                    ]     │
│                                                       │
│  [⚙️ 高级选项 ▸]                           [🚀 开始比较]│
│                                                       │
│  ── 展开后 ──                                         │
│                                                       │
│  对比维度：                                             │
│  ☑️ 页面结构 (DOM)    ☑️ 视觉样式 (Visual)   ☑️ 文字内容  │
│                                                       │
│  设备预设：                                             │
│  [🖥 桌面 1920×1080] [📱 平板 768×1024] [📱 手机 375×812] │
│                                                       │
│  截图模式：   ○ 全页面截图   ○ 仅可视区域                │
│                                                       │
│  [收起 ▲]                                             │
└──────────────────────────────────────────────────────┘
```

**默认值**：三项全选、桌面预设、全页面截图（保持现有行为兼容）。

### 5.2 Viewport 预设管理

**预设列表**：

```js
const VIEWPORT_PRESETS = [
  { label: '桌面 1920×1080', width: 1920, height: 1080 },
  { label: '桌面 1440×900',  width: 1440, height: 900 },
  { label: '桌面 1280×720',  width: 1280, height: 720 },
  { label: '平板 768×1024',  width: 768,  height: 1024 },
  { label: '手机 375×812',   width: 375,  height: 812 },
  { label: '手机 390×844',   width: 390,  height: 844 },
]
```

- 用户选择预设后更新 viewport 参数
- 支持"自定义"输入宽高
- 选择预设时输入框旁显示小图标示意设备类型

### 5.3 URL 预设模板管理

**目标**：用户可以保存常用的 URL 对，方便快速复用。

**数据结构**：

```ts
interface URLPreset {
  id: string
  name: string           // "中英文华为官网对比"
  url_a: string
  url_b: string
  viewport?: { width: number, height: number }
  comparisons?: ('dom' | 'visual' | 'text')[]
  created_at: string
  last_used_at: string
}
```

**存储方式**：`localStorage`（前端），key = `url_presets`。

**UI 位置**：

```
┌──────────────────────────────────────────┐
│  网址 A  [                        ]  [📋]│
│                                          │
│  ┌─ 预设下拉 ──────────────────────────┐ │
│  │ 📌 中英文华为官网对比                  │ │
│  │ 📌 Bootstrap 5.2 vs 5.3             │ │
│  │ 📌 灰度 vs 线上首页                   │ │
│  │ ────────────────────────            │ │
│  │ [+ 保存当前为预设]                    │ │
│  └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

- 输入框右侧增加 `📋` 按钮，点击展开预设下拉
- 选择预设后自动填充两个 URL + 视口设置
- 当前 URL 对可保存为预设（保存时弹出命名对话框）
- 长按/右键预设项可以删除或重命名

### 5.4 URL 校验增强

**5.4.1 自动补全协议**

当用户输入 `www.example.com` 时，失焦自动补全为 `https://www.example.com`。

**5.4.2 可达性预检**

输入框失焦后，调用后端轻量接口 `HEAD /api/probe?url=xxx` 检测可达性：

```python
@router.get("/probe")
async def probe_url(url: str):
    """快速检测 URL 是否可达（仅 HEAD 请求，不渲染页面）"""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.head(url, follow_redirects=True)
            return {"reachable": resp.status_code < 500, "status_code": resp.status_code}
    except Exception:
        return {"reachable": False, "status_code": None}
```

前端根据检测结果显示图标：
- ✅ 绿色勾：可访问（2xx/3xx）
- ⚠️ 黄色叹号：可访问但有警告（4xx/5xx 但未超时）
- ❌ 红色叉：无法访问（超时/DNS 解析失败）

**5.4.3 相同 URL 检测**

两个输入框内容相同时，显示内联警告而非阻止提交：

```
⚠️ 两个网址相同，对比结果将无差异。确认继续吗？
```

**5.4.4 内网地址检测**

检测到内网地址模式时显示警告：

```
🛡️ 检测到内网地址。如果服务部署在云端，可能无法访问该地址。
```

检测规则：
```python
import ipaddress
import re

def is_private_url(url: str) -> bool:
    host = extract_host(url)
    if host in ('localhost', '127.0.0.1', '::1'):
        return True
    try:
        ip = ipaddress.ip_address(host)
        return ip.is_private
    except ValueError:
        return False
```

### 5.5 手动粘贴 HTML 对比（P2 远期）

**场景**：用户想对比两个 HTML 代码片段，而非线上页面。

**方案**：输入模式切换 `[🌐 URL 模式] [📝 HTML 模式]`，选择 HTML 模式后输入框变为代码编辑器（textarea 或简易 Monaco Editor），用户粘贴两个 HTML 代码，后端直接解析而不通过 Playwright 抓取。

---

## 6. 历史记录管理

### 6.1 搜索与筛选

**UI 设计**：

```
┌───────────────────────────────────────────────────────┐
│  比较历史                                               │
│                                                         │
│  🔍 搜索网址...    [全部状态 ▾]  [全部时间 ▾]  [排序 ▾]  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ (列表表格...)                                      │ │
│  └───────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

**筛选器**：

| 筛选器 | 选项 |
|--------|------|
| 状态 | 全部 / 已完成 / 部分完成 / 失败 / 处理中 |
| 时间范围 | 全部 / 今天 / 最近 7 天 / 最近 30 天 |
| 排序 | 最新优先 / 最旧优先 / 差异最多 / 差异最少 |

**搜索**：输入关键词过滤 URL 包含该文本的记录（前端 `filter` 即可，历史记录量不大）。

### 6.2 批量操作

**UI 设计**：

```
┌───────────────────────────────────────────────────────┐
│  ☐ 全选  [🗑 批量删除（已选 3 项）]                      │
│                                                         │
│  ☐ 2026-05-30 14:30  example.com/a  example.com/b  ... │
│  ☐ 2026-05-30 12:00  example.com/c  example.com/d  ... │
│  ☑ 2026-05-29 10:00  huawei.com/cn   huawei.com/en ... │
│  ☑ 2026-05-29 09:00  google.com      google.cn     ... │
│  ☑ 2026-05-28 18:00  github.com/a    github.com/b  ... │
│                                                         │
└───────────────────────────────────────────────────────┘
```

**功能点**：
- 每行左侧增加复选框
- 表头增加全选复选框
- 选中项 ≥ 1 时，工具栏出现"批量删除"按钮
- 批量删除前弹出确认框，列出将要删除的 URL 对
- 删除后支持撤销（见 2.6）

### 6.3 列表虚拟滚动

**问题**：当历史记录超过 100 条时，DOM 节点过多导致滚动卡顿。

**方案**：使用 `@tanstack/react-virtual` 或 IntersectionObserver 实现虚拟滚动。

```jsx
import { useVirtualizer } from '@tanstack/react-virtual'

function HistoryTable({ items }) {
  const parentRef = useRef()
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,  // 每行高度 48px
    overscan: 10,
  })
  // ...
}
```

### 6.4 历史记录分页（后端）

**当前状态**：`list_comparisons` 硬编码返回前 50 条。

**方案**：

```python
@router.get("")
async def list_comparisons(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=10, le=100),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    # ...
    return {
        "items": items[start:end],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
```

### 6.5 对比结果对比（P2 远期）

**场景**：用户有两次历史对比结果（如灰度 vs 线上 v1 和 灰度 vs 线上 v2），想比较这两次的结果差异。

**方案**：历史记录支持选择两条记录，点击"对比结果"按钮，跳转到三列对比页面。

---

## 7. 性能与健壮性

### 7.1 图片压缩与响应式图片

**问题**：全页面截图可达 5-15MB，直接通过 `<img>` 加载导致白屏时间长。

**方案**：

**后端支持缩放参数**：

```python
@router.get("/{task_id}/screenshots/{side}")
async def get_screenshot(
    task_id: str, side: str,
    width: Optional[int] = Query(None, ge=100, le=3840),
    quality: int = Query(85, ge=10, le=100),
):
    # 如果请求了缩放，用 PIL 缩放后返回
    if width:
        img = Image.open(path)
        ratio = width / img.width
        new_size = (width, int(img.height * ratio))
        img = img.resize(new_size, Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        return Response(content=buf.getvalue(), media_type="image/png")
    return FileResponse(path, media_type="image/png")
```

**前端使用响应式图片**：

```html
<!-- 默认加载缩略图，点击查看原图 -->
<img src="/api/.../screenshots/a?width=800" 
     srcSet="/api/.../screenshots/a?width=400 400w,
             /api/.../screenshots/a?width=800 800w,
             /api/.../screenshots/a?width=1600 1600w"
     sizes="(max-width: 768px) 400px, 800px" />
```

### 7.2 对比进度细化

**目标**：用户不再看到一个模糊的"处理中"状态。

**方案**：使用 WebSocket 或 SSE 推送实时进度。

**SSE 实现**（Server-Sent Events）：

```python
@router.get("/{task_id}/progress")
async def stream_progress(task_id: str):
    async def event_stream():
        while True:
            result = task_store.get(task_id)
            if not result:
                break
            yield f"data: {json.dumps({'status': result.status, 'phase': result.phase})}\n\n"
            if result.status in ('completed', 'failed', 'partial'):
                break
            await asyncio.sleep(1)
    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

**进度状态机**：

```
queued → capturing_a → capturing_b → comparing_dom → comparing_visual → comparing_text → building_report → completed
  │                                                                                         │
  └────────────────────────────────── 任一环节失败 ─────────────────────────────────────────→ failed
```

**前端进度展示**：

```
┌──────────────────────────────────────┐
│  🔄 正在比较...                        │
│                                       │
│  ✅ 捕获页面 A 完成                    │
│  ⏳ 正在捕获页面 B...                  │
│  ⬜ 正在分析 DOM 差异                  │
│  ⬜ 正在分析视觉差异                    │
│  ⬜ 正在分析文本差异                    │
│                                       │
│  预计剩余时间：约 15 秒                 │
└──────────────────────────────────────┘
```

### 7.3 网络超时与重试

**方案**：

```python
import asyncio

async def capture_with_retry(url: str, max_retries: int = 2) -> PageCapture:
    """带指数退避重试的页面捕获"""
    last_error = None
    for attempt in range(max_retries + 1):
        try:
            return await browser.capture_page(url)
        except asyncio.TimeoutError:
            last_error = f"Timeout after {settings.navigation_timeout_ms}ms"
            if attempt < max_retries:
                wait = 2 ** attempt  # 1s, 2s
                logger.info("Retry %d/%d for %s in %ds", attempt + 1, max_retries, url, wait)
                await asyncio.sleep(wait)
        except Exception as e:
            last_error = str(e)
            break
    return PageCapture(screenshot=b"", dom_tree=None, text_content=None, error=last_error)
```

**超时时间可配置**：
- 在高级选项中暴露"超时时间"滑块（15s / 30s / 60s / 120s）
- 默认 30s

### 7.4 存储清理优化

**当前状态**：`cleanup_old` 存在但后台定时任务未验证。

**方案**：
- 在应用启动时启动 `asyncio.create_task` 运行定时清理
- 清理前记录日志，清理后统计清理数量
- 添加 `GET /api/health/storage` 接口返回存储使用情况（总大小、文件数）

---

## 8. 安全与运维

### 8.1 SSRF 防护

**问题**：用户可以提交任意 URL，包括内网地址，存在 SSRF（Server-Side Request Forgery）风险。

**方案**：

```python
import ipaddress
import socket
from urllib.parse import urlparse

BLOCKED_HOSTS = {
    'localhost', '127.0.0.1', '::1', '0.0.0.0',
    'metadata.google.internal',  # GCP metadata
    '169.254.169.254',           # AWS metadata
}

BLOCKED_NETWORKS = [
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('169.254.0.0/16'),  # AWS link-local
]

def validate_url(url: str) -> tuple[bool, str]:
    """校验 URL 安全性。返回 (是否通过, 错误信息)"""
    parsed = urlparse(url)
    
    if parsed.scheme not in ('http', 'https'):
        return False, '仅支持 http 和 https 协议'
    
    host = parsed.hostname
    if not host:
        return False, '无法解析主机名'
    
    if host.lower() in BLOCKED_HOSTS:
        return False, '不允许访问该地址'
    
    try:
        ip = ipaddress.ip_address(host)
        for net in BLOCKED_NETWORKS:
            if ip in net:
                return False, '不允许访问内网地址'
    except ValueError:
        # 是域名，需要 DNS 解析后再检查
        try:
            resolved = socket.getaddrinfo(host, None)
            for _, _, _, _, sockaddr in resolved:
                ip_str = sockaddr[0]
                ip = ipaddress.ip_address(ip_str)
                for net in BLOCKED_NETWORKS:
                    if ip in net:
                        return False, f'域名 {host} 解析到内网地址 {ip_str}，不允许访问'
        except socket.gaierror:
            pass  # DNS 解析失败，放行（后续访问也会失败）
    
    return True, ''
```

**集成点**：在 `create_comparison` 端点中，创建任务前进行 URL 校验。

### 8.2 速率限制

**方案**：使用 `slowapi` 库（基于 `limits` 包，兼容 FastAPI）。

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# 在 create_comparison 端点上
@router.post("")
@limiter.limit("10/minute")  # 每分钟 10 次
async def create_comparison(request: ComparisonRequest, req: Request):
    ...
```

**速率限制策略**：

| 端点 | 限制 |
|------|------|
| POST /comparisons | 10 次/分钟 |
| GET /comparisons | 60 次/分钟 |
| GET /comparisons/{id}/screenshots/* | 30 次/分钟 |

### 8.3 URL 白名单模式（可选）

**场景**：企业内部部署时，仅允许对比特定域名的页面。

**方案**：通过环境变量 `ALLOWED_DOMAINS` 配置：

```python
# config.py
allowed_domains: list[str] = []  # 空列表 = 不限制

# 校验时
if settings.allowed_domains:
    if parsed.hostname not in settings.allowed_domains:
        return False, f'域名 {host} 不在白名单中'
```

---

## 9. 其他体验细节

### 9.1 暗黑模式

**方案**：使用 TailwindCSS 的 `dark` variant + CSS 变量切换。

```
导航栏：[🌙 暗黑模式] 切换
```

**实现要点**：
- `<html>` 标签添加/移除 `dark` class
- TailwindCSS 配置 `darkMode: 'class'`
- 颜色使用 Tailwind 的 `dark:` prefix
- 用户偏好保存到 `localStorage`
- 首次访问跟随系统偏好（`prefers-color-scheme` 媒体查询）

**适配范围**：全部页面、全部组件、差异图/截图背景色适配。

### 9.2 键盘快捷键

**全局快捷键**：

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Enter` | 在首页发起对比 |
| `Ctrl+K` | 聚焦搜索框（历史页面） |
| `?` | 显示/隐藏快捷键面板 |

**结果页面快捷键**：

| 快捷键 | 功能 |
|--------|------|
| `1` | 跳转到概览 |
| `2` | 跳转到截图 |
| `3` | 跳转到视觉差异 |
| `4` | 跳转到 DOM 差异 |
| `5` | 跳转到文本差异 |
| `←` `→` | 在叠加模式下调分割线位置 |
| `Escape` | 重置缩放 |

**快捷键面板**：按 `?` 键弹出模态框，展示所有可用快捷键。

### 9.3 移动端适配

**问题**：当前 UI 在移动端（< 640px）可能出现布局错乱。

**方案**：

- **首页**：输入框和按钮垂直排列，示例卡片堆叠
- **结果页面**：导航栏折叠为横向滚动（已部分支持），区域内容适配小屏
- **截图对比**：移动端默认并排显示（上下堆叠），叠加模式更适合触屏滑动
- **DOM 差异**：表格改为卡片布局，每项占一整行
- **文本差异**：取消双列对比，改为行内 +/- 标记

### 9.4 对比页面锚点分享

**方案**：URL hash 支持直接定位到指定区域。

```
/compare/{taskId}#visual-diff  → 自动滚动到视觉差异区域
/compare/{taskId}#dom-diff     → 自动滚动到 DOM 差异区域
/compare/{taskId}#text-diff    → 自动滚动到文本差异区域
```

页面加载时检测 hash，自动 `scrollIntoView`。

### 9.5 差异数据统计图表（P2）

在概览区域增加简单的可视化图表：

```
┌──────────────────────────────┐
│  DOM 差异分布                  │
│                               │
│  ████████░░ 新增 (15)         │
│  ████░░░░░░ 移除 (8)         │
│  ██████░░░░ 属性变更 (12)     │
│  ███░░░░░░░ 文本变更 (7)      │
│                               │
└──────────────────────────────┘
```

---

## 10. 实现优先级与排期建议

### 10.1 优先级定义

| 级别 | 定义 | 开发工期 |
|------|------|---------|
| P0 | 核心体验，必须实现 | 当前迭代 |
| P1 | 重要优化，显著提升体验 | 下一迭代 |
| P2 | 锦上添花，远期规划 | 按需实现 |

### 10.2 排期表

#### 第一阶段（P0 — 当前迭代，约 5-7 工作日）

| 编号 | 需求 | 工期 | 依赖 |
|------|------|------|------|
| 2.1 | 首次使用引导（示例一键填充） | 0.5d | - |
| 2.2 | 输入引导与即时反馈（URL 预检、相同 URL 提示） | 1d | 8.1 |
| 2.3 | 结果页面快速导读卡片 | 0.5d | - |
| 3.1 | 滑动叠加对比模式 | 1.5d | - |
| 3.2 | 视觉差异区域列表 + 点击定位 | 1.5d | - |
| 3.3 | "重新对比"功能 | 0.5d | - |
| 5.4 | URL 校验增强 | 1d | 8.1 |
| 8.1 | SSRF 防护 | 0.5d | - |
| 8.2 | 速率限制 | 0.5d | - |

#### 第二阶段（P1 — 下一迭代，约 5-7 工作日）

| 编号 | 需求 | 工期 | 依赖 |
|------|------|------|------|
| 2.4 | 术语通俗化（小白模式） | 1d | - |
| 2.5 | 帮助中心 | 1d | - |
| 2.6 | 操作可撤销（软删除 + Toast） | 0.5d | - |
| 3.4 | 对比完成后浏览器通知 | 0.5d | - |
| 4.2 | 整体相似度评分 | 0.5d | - |
| 4.3 | DOM 差异树状视图 | 1.5d | - |
| 5.1 | 对比选项暴露给用户 | 0.5d | - |
| 5.2 | Viewport 预设管理 | 0.5d | - |
| 5.3 | URL 预设模板管理 | 1d | - |
| 7.1 | 图片压缩与响应式图片 | 1d | - |
| 7.2 | 对比进度细化（SSE） | 1.5d | - |

#### 第三阶段（P2 — 按需实现）

| 编号 | 需求 | 工期 |
|------|------|------|
| 4.1 | 对比结果导出（PDF/HTML/JSON） | 2d |
| 4.4 | 文本差异按段落分组 | 1.5d |
| 5.5 | 手动粘贴 HTML 对比 | 2d |
| 6.1 | 历史记录搜索与筛选 | 1d |
| 6.2 | 批量操作 | 1d |
| 6.3 | 列表虚拟滚动 | 0.5d |
| 6.4 | 后端分页 | 0.5d |
| 6.5 | 对比结果对比 | 2d |
| 7.3 | 网络超时与重试 | 1d |
| 7.4 | 存储清理优化 | 0.5d |
| 8.3 | URL 白名单模式 | 0.5d |
| 9.1 | 暗黑模式 | 1d |
| 9.2 | 键盘快捷键 | 0.5d |
| 9.3 | 移动端适配 | 1.5d |
| 9.4 | 锚点分享 | 0.5d |
| 9.5 | 差异统计图表 | 1d |

### 10.3 依赖关系图

```
8.1 SSRF 防护 ← 5.4 URL 校验增强 ← 2.2 输入即时反馈
                                        ↓
2.1 首次引导 → 3.1 滑动叠加 → 3.2 差异区域定位
                                  ↓
2.3 快速导读卡片 ← 4.2 整体相似度评分
       ↓
2.4 小白模式 → 2.5 帮助中心

5.1 对比选项 → 5.2 Viewport 预设 → 5.3 URL 预设模板
       ↓
7.2 进度细化（SSE）

7.1 图片压缩 ← 3.1 滑动叠加（需要响应式图片提升加载速度）
```

---

### 10.4 验收标准

每个需求完成后需满足以下标准：

1. **功能可用**：正向流程和边界情况均通过测试
2. **i18n 覆盖**：中英文翻译完整，无硬编码文案
3. **前端构建通过**：`vite build` 零错误零警告
4. **无回归**：已有功能正常运行
5. **小白用户可理解**：无技术背景的用户不看文档也能独立完成操作

---

> 📌 **下一步**：请评审此文档，确认优先级和排期后，开发按第一阶段 → 第二阶段 → 第三阶段依次推进。
