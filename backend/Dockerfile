FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

WORKDIR /app

RUN addgroup --system app && adduser --system --ingroup app app

COPY requirements.txt ./requirements.txt
RUN python -m pip install --upgrade pip \
    && python -m pip install -r requirements.txt

COPY --chown=app:app backend ./backend
COPY --chown=app:app src ./src
COPY --chown=app:app run_local.py ./run_local.py

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import os, urllib.request; port = os.getenv('PORT', '8000'); urllib.request.urlopen(f'http://127.0.0.1:{port}/health', timeout=3)"

CMD ["sh", "-c", "uvicorn run_local:app --host 0.0.0.0 --port ${PORT:-8000}"]

