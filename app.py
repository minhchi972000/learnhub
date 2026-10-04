"""Vercel entrypoint: Vercel loads the FastAPI instance named `app` from this file.

The backend is not pip-installed on Vercel (deps come from requirements.txt), so put its
source on the path; config.REPO_ROOT then still resolves to this folder, which holds
content/ and the frontend/dist built by vercel.json's buildCommand.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "backend" / "src"))

from learnhub.main import create_app  # noqa: E402

app = create_app()
