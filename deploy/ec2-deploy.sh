#!/usr/bin/env bash
set -Eeuo pipefail

: "${AWS_REGION:?AWS_REGION is required}"
: "${API_IMAGE:?API_IMAGE is required}"
: "${WEB_IMAGE:?WEB_IMAGE is required}"
: "${APP_SECRET_NAME:?APP_SECRET_NAME is required}"
: "${DATABASE_SECRET_NAME:?DATABASE_SECRET_NAME is required}"
: "${DATABASE_ENDPOINT:?DATABASE_ENDPOINT is required}"

DB_NAME="${DB_NAME:-scoutscluj_utilities}"
LOG_GROUP_PREFIX="${LOG_GROUP_PREFIX:-/scoutscluj/production}"
API_LOG_GROUP="${API_LOG_GROUP:-${LOG_GROUP_PREFIX}/api}"
WEB_LOG_GROUP="${WEB_LOG_GROUP:-${LOG_GROUP_PREFIX}/web}"
CADDY_LOG_GROUP="${CADDY_LOG_GROUP:-${LOG_GROUP_PREFIX}/caddy}"
RUNTIME_DIR="/opt/scoutscluj/runtime"
API_ENV_FILE="${RUNTIME_DIR}/api.env"
WEB_ENV_FILE="${RUNTIME_DIR}/web.env"
CADDYFILE="/opt/scoutscluj/Caddyfile"
CADDY_DATA_DIR="/opt/scoutscluj/caddy/data"
CADDY_CONFIG_DIR="/opt/scoutscluj/caddy/config"

mkdir -p "${RUNTIME_DIR}" "${CADDY_DATA_DIR}" "${CADDY_CONFIG_DIR}"
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

origin_host() {
  local origin="$1"

  origin="${origin#http://}"
  origin="${origin#https://}"
  origin="${origin%%/*}"

  printf "%s" "${origin}"
}

write_caddyfile() {
  local app_host_name="$1"

  cat >"${CADDYFILE}" <<EOF
{
	email admin@scoutscluj.ro
}

${app_host_name} {
	encode zstd gzip

	log {
		output stdout
		format filter {
			wrap json
			fields {
				request>uri query {
					delete access_token
					delete code
					delete id_token
					delete refresh_token
					delete state
					delete token
				}
				request>headers>Authorization delete
				request>headers>Cookie delete
				request>headers>Proxy-Authorization delete
				request>headers>Set-Cookie delete
				resp_headers>Set-Cookie delete
			}
		}
	}

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
	}

	reverse_proxy /api/* 127.0.0.1:3000
	reverse_proxy 127.0.0.1:3001
}
EOF
}

restart_caddy() {
  local app_host_name="$1"

  write_caddyfile "${app_host_name}"
  docker pull caddy:2 || true
  docker rm -f scoutscluj-caddy >/dev/null 2>&1 || true

  docker run -d \
    --name scoutscluj-caddy \
    --restart unless-stopped \
    --network host \
    --log-driver awslogs \
    --log-opt "awslogs-region=${AWS_REGION}" \
    --log-opt "awslogs-group=${CADDY_LOG_GROUP}" \
    --log-opt awslogs-stream=scoutscluj-caddy \
    --log-opt mode=non-blocking \
    --log-opt max-buffer-size=4m \
    -v "${CADDYFILE}:/etc/caddy/Caddyfile:ro" \
    -v "${CADDY_DATA_DIR}:/data" \
    -v "${CADDY_CONFIG_DIR}:/config" \
    caddy:2
}

print_container_logs() {
  local container_name="$1"
  local log_group="$2"

  if docker logs --tail 200 "${container_name}" >&2; then
    return
  fi

  echo "Docker logs are unavailable for ${container_name}; tailing CloudWatch ${log_group}." >&2
  aws logs tail "${log_group}" \
    --region "${AWS_REGION}" \
    --since 10m \
    --format short >&2 || true
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
PUBLIC_APP_VERSION="$(secret_value "${APP_SECRET_JSON}" PUBLIC_APP_VERSION)"
PUBLIC_COMMIT_HASH="$(secret_value "${APP_SECRET_JSON}" PUBLIC_COMMIT_HASH)"
WEB_ORIGIN="$(secret_value "${APP_SECRET_JSON}" WEB_ORIGIN)"
WEB_ORIGINS="$(secret_value "${APP_SECRET_JSON}" WEB_ORIGINS)"
VAPID_PUBLIC_KEY="$(secret_value "${APP_SECRET_JSON}" VAPID_PUBLIC_KEY)"
VAPID_PRIVATE_KEY="$(secret_value "${APP_SECRET_JSON}" VAPID_PRIVATE_KEY)"
VAPID_SUBJECT="$(secret_value "${APP_SECRET_JSON}" VAPID_SUBJECT)"

PUBLIC_APP_VERSION="${PUBLIC_APP_VERSION:-${APP_VERSION:-0.0.0}}"
PUBLIC_COMMIT_HASH="${PUBLIC_COMMIT_HASH:-${GITHUB_SHA:-unknown}}"
VAPID_SUBJECT="${VAPID_SUBJECT:-mailto:admin@scoutscluj.ro}"

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

APP_HOST_NAME="$(origin_host "${WEB_ORIGIN}")"

if [[ -z "${APP_HOST_NAME}" ]]; then
  echo "WEB_ORIGIN must contain a hostname." >&2
  exit 1
fi

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
write_env_value "${API_ENV_FILE}" VAPID_PUBLIC_KEY "${VAPID_PUBLIC_KEY}"
write_env_value "${API_ENV_FILE}" VAPID_PRIVATE_KEY "${VAPID_PRIVATE_KEY}"
write_env_value "${API_ENV_FILE}" VAPID_SUBJECT "${VAPID_SUBJECT}"

: >"${WEB_ENV_FILE}"
write_env_value "${WEB_ENV_FILE}" NODE_ENV production
write_env_value "${WEB_ENV_FILE}" HOST 0.0.0.0
write_env_value "${WEB_ENV_FILE}" PORT 3000
write_env_value "${WEB_ENV_FILE}" PUBLIC_API_BASE_URL "${PUBLIC_API_BASE_URL}"
write_env_value "${WEB_ENV_FILE}" PUBLIC_APP_VERSION "${PUBLIC_APP_VERSION}"
write_env_value "${WEB_ENV_FILE}" PUBLIC_COMMIT_HASH "${PUBLIC_COMMIT_HASH}"

chmod 600 "${API_ENV_FILE}" "${WEB_ENV_FILE}"

REGISTRY="${API_IMAGE%%/*}"
aws ecr get-login-password --region "${AWS_REGION}" |
  docker login --username AWS --password-stdin "${REGISTRY}"

docker pull "${API_IMAGE}"
docker pull "${WEB_IMAGE}"

echo "Running database migrations with ${API_IMAGE}"
docker run --rm \
  --name scoutscluj-api-migrate \
  --log-driver awslogs \
  --log-opt "awslogs-region=${AWS_REGION}" \
  --log-opt "awslogs-group=${API_LOG_GROUP}" \
  --log-opt awslogs-stream=scoutscluj-api-migrate \
  --log-opt mode=non-blocking \
  --log-opt max-buffer-size=4m \
  --env-file "${API_ENV_FILE}" \
  "${API_IMAGE}" \
  node apps/api/dist/migrate.js

echo "Importing kitchen legacy catalog with ${API_IMAGE}"
docker run --rm \
  --name scoutscluj-api-kitchen-seed \
  --log-driver awslogs \
  --log-opt "awslogs-region=${AWS_REGION}" \
  --log-opt "awslogs-group=${API_LOG_GROUP}" \
  --log-opt awslogs-stream=scoutscluj-api-kitchen-seed \
  --log-opt mode=non-blocking \
  --log-opt max-buffer-size=4m \
  --env-file "${API_ENV_FILE}" \
  "${API_IMAGE}" \
  node apps/api/dist/seed-kitchen-catalog.js

restart_caddy "${APP_HOST_NAME}"

docker rm -f scoutscluj-api scoutscluj-web >/dev/null 2>&1 || true

docker run -d \
  --name scoutscluj-api \
  --restart unless-stopped \
  --log-driver awslogs \
  --log-opt "awslogs-region=${AWS_REGION}" \
  --log-opt "awslogs-group=${API_LOG_GROUP}" \
  --log-opt awslogs-stream=scoutscluj-api \
  --log-opt mode=non-blocking \
  --log-opt max-buffer-size=4m \
  --env-file "${API_ENV_FILE}" \
  -p 127.0.0.1:3000:3000 \
  "${API_IMAGE}"

docker run -d \
  --name scoutscluj-web \
  --restart unless-stopped \
  --log-driver awslogs \
  --log-opt "awslogs-region=${AWS_REGION}" \
  --log-opt "awslogs-group=${WEB_LOG_GROUP}" \
  --log-opt awslogs-stream=scoutscluj-web \
  --log-opt mode=non-blocking \
  --log-opt max-buffer-size=4m \
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
print_container_logs scoutscluj-api "${API_LOG_GROUP}"
print_container_logs scoutscluj-web "${WEB_LOG_GROUP}"
print_container_logs scoutscluj-caddy "${CADDY_LOG_GROUP}"
exit 1
