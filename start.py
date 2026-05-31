"""Start script for Web Page Comparator.
Run this to start both backend and frontend servers.

Usage:
    python start.py
"""

import subprocess
import sys
import os
import signal
import atexit

backend_dir = os.path.join(os.path.dirname(__file__), "backend")
frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")

# Cross-platform venv Python path
if sys.platform == "win32":
    venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
else:
    venv_python = os.path.join(backend_dir, "venv", "bin", "python")

processes = []


def cleanup():
    for p in processes:
        p.terminate()
    print("\nServers stopped.")


atexit.register(cleanup)
signal.signal(signal.SIGINT, lambda s, f: sys.exit(0))
signal.signal(signal.SIGTERM, lambda s, f: sys.exit(0))

# Start backend
backend_cmd = [
    venv_python,
    "-c",
    """
import asyncio, sys
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
import uvicorn
from app.main import app
uvicorn.run(app, host='127.0.0.1', port=8002, reload=False)
""",
]
print("Starting backend on http://localhost:8002 ...")
p = subprocess.Popen(backend_cmd, cwd=backend_dir)
processes.append(p)

# Start frontend
frontend_cmd = ["npx", "vite", "--port", "5173"]
print("Starting frontend on http://localhost:5173 ...")
p = subprocess.Popen(frontend_cmd, cwd=frontend_dir, shell=(sys.platform == "win32"))
processes.append(p)

print("\n" + "=" * 50)
print("Backend:  http://localhost:8002")
print("Frontend: http://localhost:5173")
print("=" * 50)
print("Press Ctrl+C to stop both servers.\n")

try:
    for p in processes:
        p.wait()
except KeyboardInterrupt:
    cleanup()
