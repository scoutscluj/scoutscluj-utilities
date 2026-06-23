#!/usr/bin/env bash
set -Eeuo pipefail

: "${AWS_REGION:?AWS_REGION is required}"
: "${API_IMAGE:?API_IMAGE is required}"
: "${WEB_IMAGE:?WEB_IMAGE is required}"
: "${APP_SECRET_NAME:?APP_SECRET_NAME is required}"
: "${DATABASE_SECRET_NAME:?DATABASE_SECRET_NAME is required}"
: "${DATABASE_ENDPOINT:?DATABASE_ENDPOINT is required}"

DB_NAME="${DB_NAME:-scoutscluj_utilities}"
RUNTIME_DIR="/opt/scoutscluj/runtime"
API_ENV_FILE="${RUNTIME_DIR}/api.env"
WEB_ENV_FILE="${RUNTIME_DIR}/web.env"

mkdir -p "${RUNTIME_DIR}"
chmod 700 "${RUNTIME_DIR}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

secret_value() {
  local secret_json="$1"
  local key="$2"

  jq -r --arg key "${key}" '.[$key] // empty' <<<"${secret_json}"
}

write_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"

  printf "%s=%s\n" "${key}" "${value}" >>"${file}"
}

require_command aws
require_command docker
require_command jq
require_command curl

APP_SECRET_JSON="$(aws secretsmanager get-secret-value \
  --region "${AWS_REGION}" \
  --secret-id "${APP_SECRET_NAME}" \
  --query SecretString \
  --output text)"
DATABASE_SECRET_JSON="$(aws secretsmanager get-secret-value \
  --region "${AWS_REGION}" \
  --secret-id "${DATABASE_SECRET_NAME}" \
  --query SecretString \
  --output text)"

DB_USER="$(secret_value "${DATABASE_SECRET_JSON}" username)"
DB_PASSWORD="$(secret_value "${DATABASE_SECRET_JSON}" password)"

if [[ -z "${DB_USER}" || -z "${DB_PASSWORD}" ]]; then
  echo "Database secret must contain username and password." >&2
  exit 1
fi

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DATABASE_ENDPOINT}:5432/${DB_NAME}?sslmode=require"

AUTH_SESSION_SECRET="$(secret_value "${APP_SECRET_JSON}" AUTH_SESSION_SECRET)"
ORGO_OAUTH_BASE_URL="$(secret_value "${APP_SECRET_JSON}" ORGO_OAUTH_BASE_URL)"
ORGO_OAUTH_CLIENT_ID="$(secret_value "${APP_SECRET_JSON}" ORGO_OAUTH_CLIENT_ID)"
ORGO_OAUTH_CLIENT_SECRET="$(secret_value "${APP_SECRET_JSON}" ORGO_OAUTH_CLIENT_SECRET)"
ORGO_OAUTH_REDIRECT_URI="$(secret_value "${APP_SECRET_JSON}" ORGO_OAUTH_REDIRECT_URI)"
PUBLIC_API_BASE_URL="$(secret_value "${APP_SECRET_JSON}" PUBLIC_API_BASE_URL)"
WEB_ORIGIN="$(secret_value "${APP_SECRET_JSON}" WEB_ORIGIN)"
WEB_ORIGINS="$(secret_value "${APP_SECRET_JSON}" WEB_ORIGINS)"

for required_value in \
  AUTH_SESSION_SECRET \
  ORGO_OAUTH_BASE_URL \
  ORGO_OAUTH_CLIENT_ID \
  ORGO_OAUTH_CLIENT_SECRET \
  ORGO_OAUTH_REDIRECT_URI \
  PUBLIC_API_BASE_URL \
  WEB_ORIGIN \
  WEB_ORIGINS; do
  if [[ -z "${!required_value}" ]]; then
    echo "Application secret is missing ${required_value}." >&2
    exit 1
  fi
done

: >"${API_ENV_FILE}"
write_env_value "${API_ENV_FILE}" NODE_ENV production
write_env_value "${API_ENV_FILE}" PORT 3000
write_env_value "${API_ENV_FILE}" API_PORT 3000
write_env_value "${API_ENV_FILE}" DATABASE_URL "${DATABASE_URL}"
write_env_value "${API_ENV_FILE}" DATABASE_SSL true
write_env_value "${API_ENV_FILE}" DATABASE_SSL_REJECT_UNAUTHORIZED false
write_env_value "${API_ENV_FILE}" AUTH_SESSION_SECRET "${AUTH_SESSION_SECRET}"
write_env_value "${API_ENV_FILE}" ORGO_OAUTH_BASE_URL "${ORGO_OAUTH_BASE_URL}"
write_env_value "${API_ENV_FILE}" ORGO_OAUTH_CLIENT_ID "${ORGO_OAUTH_CLIENT_ID}"
write_env_value "${API_ENV_FILE}" ORGO_OAUTH_CLIENT_SECRET "${ORGO_OAUTH_CLIENT_SECRET}"
write_env_value "${API_ENV_FILE}" ORGO_OAUTH_REDIRECT_URI "${ORGO_OAUTH_REDIRECT_URI}"
write_env_value "${API_ENV_FILE}" PUBLIC_API_BASE_URL "${PUBLIC_API_BASE_URL}"
write_env_value "${API_ENV_FILE}" WEB_ORIGIN "${WEB_ORIGIN}"
write_env_value "${API_ENV_FILE}" WEB_ORIGINS "${WEB_ORIGINS}"

: >"${WEB_ENV_FILE}"
write_env_value "${WEB_ENV_FILE}" NODE_ENV production
write_env_value "${WEB_ENV_FILE}" HOST 0.0.0.0
write_env_value "${WEB_ENV_FILE}" PORT 3000
write_env_value "${WEB_ENV_FILE}" PUBLIC_API_BASE_URL "${PUBLIC_API_BASE_URL}"

chmod 600 "${API_ENV_FILE}" "${WEB_ENV_FILE}"

REGISTRY="${API_IMAGE%%/*}"
aws ecr get-login-password --region "${AWS_REGION}" |
  docker login --username AWS --password-stdin "${REGISTRY}"

docker pull "${API_IMAGE}"
docker pull "${WEB_IMAGE}"

echo "Running database migrations with ${API_IMAGE}"
docker run --rm \
  --name scoutscluj-api-migrate \
  --env-file "${API_ENV_FILE}" \
  "${API_IMAGE}" \
  node apps/api/dist/migrate.js

docker rm -f scoutscluj-api scoutscluj-web >/dev/null 2>&1 || true

docker run -d \
  --name scoutscluj-api \
  --restart unless-stopped \
  --env-file "${API_ENV_FILE}" \
  -p 127.0.0.1:3000:3000 \
  "${API_IMAGE}"

docker run -d \
  --name scoutscluj-web \
  --restart unless-stopped \
  --env-file "${WEB_ENV_FILE}" \
  -p 127.0.0.1:3001:3000 \
  "${WEB_IMAGE}"

for attempt in {1..30}; do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null &&
    curl -fsS http://127.0.0.1:3001/health >/dev/null; then
    echo "Deployment health checks passed."
    docker image prune -af --filter "until=168h" >/dev/null || true
    exit 0
  fi

  sleep 2
done

echo "Deployment health checks failed." >&2
docker logs --tail 200 scoutscluj-api >&2 || true
docker logs --tail 200 scoutscluj-web >&2 || true
exit 1
