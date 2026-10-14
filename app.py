import os
import sys

# Ensure backend directory is in Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.main import app
