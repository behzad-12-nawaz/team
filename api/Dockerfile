FROM python:3.12-slim

RUN apt-get update && apt-get install -y curl && \
    curl -LsSf https://astral.sh/uv/install.sh | sh && \
    rm -rf /var/lib/apt/lists/*

ENV UV_PATH=/root/.local/bin
ENV PATH=$UV_PATH:$PATH
ENV UV_NO_CACHE=1
ENV UV_LINK_MODE=copy

WORKDIR /app

COPY pyproject.toml uv.lock* ./

RUN uv sync --frozen --no-install-project

COPY app/ ./app/
COPY seed.py ./

EXPOSE 8000

# NOTE: Do NOT add --workers. The APScheduler reminder engine runs background
# jobs inside the app process. Multiple workers would create duplicate tick()
# loops and send duplicate reminder messages. One worker is correct.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
