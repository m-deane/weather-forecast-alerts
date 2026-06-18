# =============================================================================
# Hugging Face Spaces Docker Deployment
# Scottish Mountain Weather App - Full-stack (React frontend + FastAPI backend)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build the React frontend
# ---------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

# Install dependencies first (layer caching)
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --ignore-scripts

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: Production runtime (Python + built frontend)
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

# Prevent Python from writing .pyc files and enable unbuffered stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python dependencies (minimal set for simple_api.py)
COPY hf_requirements.txt ./
RUN pip install --no-cache-dir -r hf_requirements.txt

# Copy backend application code
COPY backend/simple_api.py backend/simple_api.py

# Copy weather scraper (runs on startup + every 6 hours)
COPY weather_scraper.py ./

# Copy static data files (mountain photos, routes, viewpoints)
COPY data/ data/

# Copy config file (referenced by location data in simple_api.py)
COPY config.yaml ./

# Copy the HF Spaces entry point
COPY hf_app.py ./

# Copy built frontend from stage 1
COPY --from=frontend-builder /build/frontend/dist frontend/dist

# Create empty forecasts dir (scraper regenerates JSON at runtime via hf_app.py)
RUN mkdir -p forecasts

# ---------------------------------------------------------------------------
# Hugging Face Spaces requires a non-root user
# ---------------------------------------------------------------------------
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 7860

CMD ["python", "hf_app.py"]
