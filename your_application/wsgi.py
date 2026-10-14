"""
Render Gunicorn fallback bridge.
Render's default Python start command is 'gunicorn your_application.wsgi'.
This script safely initializes migrations and starts Uvicorn.
"""
import os
import sys
import subprocess

current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir) if os.path.basename(current_dir) == 'your_application' else current_dir
backend_dir = os.path.join(root_dir, 'backend')

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

os.chdir(backend_dir)

print("=== Render wsgi launcher: running alembic migrations ===", flush=True)
try:
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=backend_dir, check=False)
except Exception as e:
    print(f"Alembic warning: {e}", flush=True)

print("=== Render wsgi launcher: seeding database ===", flush=True)
try:
    subprocess.run([sys.executable, "app/db/seed.py"], cwd=backend_dir, check=False)
except Exception as e:
    print(f"Seed warning: {e}", flush=True)

port = os.environ.get("PORT", "8000")
print(f"=== Render wsgi launcher: launching Uvicorn on 0.0.0.0:{port} ===", flush=True)

# Replace the current gunicorn process with uvicorn on Linux
try:
    os.execv(sys.executable, [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", str(port)])
except Exception as e:
    print(f"Execv fallback to uvicorn.run: {e}", flush=True)
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=int(port))
