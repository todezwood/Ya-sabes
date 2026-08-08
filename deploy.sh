#!/usr/bin/env bash
# Deploy Ya Sabes to Cloud Run.
#   export ANTHROPIC_API_KEY=sk-ant-...
#   ./deploy.sh
set -euo pipefail

PROJECT="${PROJECT:-rlystate-v2}"
REGION="${REGION:-us-west1}"
SERVICE="${SERVICE:-ya-sabes}"

if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "ANTHROPIC_API_KEY is not set. Run: export ANTHROPIC_API_KEY=sk-ant-..." >&2
  exit 1
fi

echo "→ enabling required APIs on $PROJECT"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com --project "$PROJECT" --quiet

echo "→ deploying $SERVICE to $REGION"
gcloud run deploy "$SERVICE" \
  --source . \
  --project "$PROJECT" \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --timeout 120 \
  --max-instances 5 \
  --set-env-vars "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" \
  --quiet

echo
gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" \
  --format 'value(status.url)'
