# Web Page Comparator

> A visual web automation platform for comparing two web pages side by side. Analyze DOM structure, visual appearance, and text content differences with ease.

[![Tech Stack](https://img.shields.io/badge/frontend-React%20%7C%20Vite%20%7C%20TailwindCSS-blue)](https://vitejs.dev/)
[![Backend](https://img.shields.io/badge/backend-FastAPI%20%7C%20Playwright-green)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/license-MIT-orange)](LICENSE)

---

## Features

- **DOM Structure Comparison** — Detect added, removed, and modified elements between two pages
- **Visual Diff** — Pixel-level visual comparison with side-by-side and slider overlay views
- **Text Content Diff** — Unified diff view showing inserted, deleted, and changed text lines
- **Screenshot Capture** — Full-page screenshots of both URLs for visual reference
- **Responsive Design** — Works seamlessly on desktop and tablet devices
- **i18n Support** — Switch between English and Chinese (中文) at the click of a button

## Tech Stack

| Layer  | Technology |
|--------|-----------|
| Frontend | React 18, Vite, TailwindCSS, React Router, React Query |
| Backend | FastAPI, Playwright, Pillow, NumPy |
| Language | Python 3.12+, Node.js 18+ |

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- Playwright browsers (installed automatically via setup)

### Quick Start

**1. Clone the repository**

```bash
git clone https://github.com/your-username/web-compare.git
cd web-compare
```

**2. Set up the backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
```

**3. Set up the frontend**

```bash
cd frontend
npm install
```

**4. Start the application**

**Option A — One-command startup (recommended):**

```bash
python start.py
```

This starts both backend (port 8002) and frontend (port 5173) automatically. Works on Windows, macOS, and Linux.

**Option B — Start separately (two terminals):**

Terminal 1 — Backend:

```bash
cd backend
# Windows:
venv\Scripts\activate
python -c "import asyncio, sys; asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy()); import uvicorn; from app.main import app; uvicorn.run(app, host='127.0.0.1', port=8002, reload=False)"

# macOS / Linux:
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8002
```

Terminal 2 — Frontend:

```bash
cd frontend
npm run dev
```

The app will be available at **http://localhost:5173** (frontend auto-proxies `/api` to the backend).

### Configuration

Backend settings can be customized via environment variables or `backend/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `STORAGE_DIR` | `./storage` | Directory for result files |
| `STORAGE_MAX_AGE_HOURS` | `24` | Auto-cleanup threshold |
| `CLEANUP_INTERVAL_MINUTES` | `60` | Cleanup task interval |
| `CORS_ORIGINS` | `["http://localhost:5173", "http://localhost:5174"]` | Allowed CORS origins |

## Usage

1. Open the app in your browser
2. Enter two URLs in the input fields (must start with `http://` or `https://`)
3. Click **Compare** to start the analysis
4. View results across three dimensions:
   - **Summary cards** showing diff counts at a glance
   - **Screenshots** of both pages with side-by-side and slider comparison
   - **Visual diff** highlighting pixel-level differences
   - **DOM structure diff** listing added, removed, and changed elements
   - **Text content diff** showing line-level additions and deletions
5. Browse comparison history on the **History** page

## Project Structure

```
web-compare/
├── frontend/                 # React + Vite SPA
│   ├── src/
│   │   ├── api/              # API client (axios)
│   │   ├── components/       # UI components
│   │   │   ├── comparison/   # Comparison result components
│   │   │   ├── layout/       # App layout & header
│   │   │   └── shared/       # Reusable components
│   │   ├── hooks/            # React Query hooks
│   │   ├── i18n/             # Internationalization
│   │   │   └── locales/      # Translation files (en, zh-CN)
│   │   ├── pages/            # Route pages
│   │   └── utils/            # Constants & helpers
│   ├── index.html
│   └── vite.config.js
├── backend/                  # FastAPI + Playwright
│   ├── app/
│   │   ├── api/              # API routes & endpoints
│   │   ├── models/           # Pydantic schemas
│   │   └── services/         # Business logic
│   │       ├── browser.py    # Playwright browser manager
│   │       ├── dom_comparator.py
│   │       ├── visual_comparator.py
│   │       ├── text_comparator.py
│   │       └── orchestrator.py
│   ├── tests/
│   └── requirements.txt
├── start.py                   # One-command startup script
└── README.md
```

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/comparisons` | Create a new comparison |
| `GET` | `/api/comparisons` | List comparison history |
| `GET` | `/api/comparisons/{id}` | Get comparison results |
| `DELETE` | `/api/comparisons/{id}` | Delete a comparison |
| `GET` | `/api/comparisons/{id}/screenshots/{side}` | Screenshot image |
| `GET` | `/api/comparisons/{id}/diffs/visual` | Visual diff image |

## License

This project is licensed under the MIT License.
