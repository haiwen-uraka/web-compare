# Web Page Comparator - 网页比较工具

> 一个可视化网页自动化比较平台，可并排分析两个网页的 DOM 结构、视觉外观和文本内容差异。

[![技术栈](https://img.shields.io/badge/前端-React%20%7C%20Vite%20%7C%20TailwindCSS-blue)](https://vitejs.dev/)
[![后端](https://img.shields.io/badge/后端-FastAPI%20%7C%20Playwright-green)](https://fastapi.tiangolo.com/)
[![许可证](https://img.shields.io/badge/许可证-MIT-orange)](LICENSE)

---

## 功能特性

- **DOM 结构比较** — 检测两个页面之间新增、移除和修改的元素
- **视觉差异对比** — 像素级视觉比较，支持并排显示和滑动叠加两种模式
- **文本内容对比** — 统一差异视图，清晰展示新增、删除和修改的文本行
- **截图捕获** — 自动截取两个 URL 的完整页面截图，便于视觉参考
- **响应式设计** — 在桌面端和平板设备上均可流畅使用
- **中英文切换** — 一键切换界面语言，支持中文和英文

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18, Vite, TailwindCSS, React Router, React Query |
| 后端 | FastAPI, Playwright, Pillow, NumPy |
| 运行环境 | Python 3.12+, Node.js 18+ |

## 快速开始

### 环境要求

- Python 3.12+
- Node.js 18+
- Playwright 浏览器（通过安装脚本自动下载）

### 快速启动

**1. 克隆仓库**

```bash
git clone https://github.com/your-username/web-compare.git
cd web-compare
```

**2. 配置后端**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows 系统使用: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
```

**3. 配置前端**

```bash
cd frontend
npm install
```

**4. 启动应用**

> **Windows 用户注意（Python 3.13+）**：`--reload` 参数在 Python 3.13+ Windows 上与 Playwright 的子进程管理不兼容，请使用下面的命令启动。

**方式一 — 一键启动（推荐）：**

```bash
python start.py
```

**方式二 — 分别启动（两个终端）：**

启动后端：

```bash
cd backend
venv\Scripts\activate  # 如果尚未激活虚拟环境
python -c "import asyncio, sys; asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy()); import uvicorn; from app.main import app; uvicorn.run(app, host='127.0.0.1', port=8002, reload=False)"
```

启动前端：

```bash
cd frontend
npm run dev
```

应用将在 **http://localhost:5173** 运行（前端自动将 `/api` 代理到后端）。

### 配置说明

后端配置可通过环境变量或 `backend/.env` 文件自定义：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `STORAGE_DIR` | `./storage` | 结果文件存储目录 |
| `STORAGE_MAX_AGE_HOURS` | `24` | 自动清理过期文件的阈值（小时） |
| `CLEANUP_INTERVAL_MINUTES` | `60` | 清理任务的执行间隔（分钟） |
| `CORS_ORIGINS` | `["http://localhost:5173", "http://localhost:5174"]` | 允许的跨域来源 |

## 使用指南

1. 在浏览器中打开应用
2. 在输入框中输入两个网址（必须以 `http://` 或 `https://` 开头）
3. 点击 **开始比较** 启动分析
4. 从三个维度查看结果：
   - **概览卡片** — 一目了然地展示差异数量
   - **页面截图** — 并排显示或滑动叠加对比两个页面
   - **视觉差异** — 高亮显示像素级差异
   - **DOM 结构差异** — 列出新增、移除和更改的元素
   - **文本内容差异** — 逐行展示新增和删除的文本
5. 在 **历史记录** 页面浏览所有比较记录

## 项目结构

```
web-compare/
├── frontend/                 # React + Vite 单页应用
│   ├── src/
│   │   ├── api/              # API 客户端（axios）
│   │   ├── components/       # UI 组件
│   │   │   ├── comparison/   # 比较结果相关组件
│   │   │   ├── layout/       # 应用布局和页头
│   │   │   └── shared/       # 通用可复用组件
│   │   ├── hooks/            # React Query 自定义钩子
│   │   ├── i18n/             # 国际化配置
│   │   │   └── locales/      # 翻译文件（英文、中文）
│   │   ├── pages/            # 路由页面
│   │   └── utils/            # 常量和工具函数
│   ├── index.html
│   └── vite.config.js
├── backend/                  # FastAPI + Playwright 后端
│   ├── app/
│   │   ├── api/              # API 路由和端点
│   │   ├── models/           # Pydantic 数据模型
│   │   └── services/         # 业务逻辑层
│   │       ├── browser.py    # Playwright 浏览器管理器
│   │       ├── dom_comparator.py    # DOM 比较器
│   │       ├── visual_comparator.py # 视觉比较器
│   │       ├── text_comparator.py   # 文本比较器
│   │       └── orchestrator.py      # 任务编排器
│   ├── tests/
│   └── requirements.txt
├── start.py                   # 一键启动脚本
└── README.md
```

## API 概览

| 方法 | 接口 | 说明 |
|------|------|------|
| `POST` | `/api/comparisons` | 创建新的比较任务 |
| `GET` | `/api/comparisons` | 获取比较历史列表 |
| `GET` | `/api/comparisons/{id}` | 获取指定比较任务的详细结果 |
| `DELETE` | `/api/comparisons/{id}` | 删除指定比较任务 |
| `GET` | `/api/comparisons/{id}/screenshots/{side}` | 获取页面截图 |
| `GET` | `/api/comparisons/{id}/diffs/visual` | 获取视觉差异对比图 |

## 许可证

本项目基于 MIT 许可证开源。
