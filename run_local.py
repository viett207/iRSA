"""Local entry point for the merged backend and AI Agent package."""

from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parent
BACKEND_ROOT = PROJECT_ROOT / "backend"

# The inherited backend uses imports rooted at ``app``. Adding its directory to
# sys.path preserves those imports while keeping ``src`` available as the Agent package.
sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app  # noqa: E402,F401
