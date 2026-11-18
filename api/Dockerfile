FROM python:3.12-slim AS builder

ENV POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1

RUN pip install --no-cache-dir "poetry==2.4.3"

WORKDIR /srv/api
COPY pyproject.toml poetry.lock ./
RUN poetry install --only main --no-root --no-cache


FROM python:3.12-slim

# OpenCV (pulled in by Ultralytics) links against these at import time
RUN apt-get update \
    && apt-get install --no-install-recommends -y libgl1 libglib2.0-0 libxcb1 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --uid 10001 crabfarm

ENV PATH="/srv/api/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    YOLO_CONFIG_DIR=/home/crabfarm/.config/ultralytics

WORKDIR /srv/api
COPY --from=builder /srv/api/.venv ./.venv
COPY alembic.ini ./
COPY migrations ./migrations
COPY ml ./ml
COPY app ./app

# Owned here so the named volume mounted on it starts out writable
RUN mkdir -p ml/models/growth && chown -R crabfarm:crabfarm ml/models

USER crabfarm
EXPOSE 8000

# One process only: detection tickets, sessions and the YOLO model live in memory
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-graceful-shutdown", "3"]
