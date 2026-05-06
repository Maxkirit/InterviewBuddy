#!/bin/sh
set -e

: "${MINIO_ROOT_USER:?MINIO_ROOT_USER is not set}"
: "${MINIO_BUCKET_NAME:?MINIO_BUCKET_NAME is not set}"
: "${MINIO_APP_USER:?MINIO_APP_USER is not set}"

# Expose root password to MinIO server process via env var
# Docker secrets are files — read once here to avoid multiple cat calls
MINIO_ROOT_PASSWORD="$(cat /run/secrets/minio_root_password)"
MINIO_APP_PASSWORD="$(cat /run/secrets/minio_app_password)"
export MINIO_ROOT_PASSWORD

# Start MinIO in the background
minio server /data \
  --console-address ":9001" \
  --address ":9000" &
MINIO_PID=$!

# Wait for MinIO to be ready
echo "Waiting for MinIO to start..."
until mc alias set local http://localhost:9000 \
  "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" > /dev/null 2>&1; do
  sleep 1
done
echo "MinIO is ready."

# Create bucket if it doesn't exist
if ! mc ls "local/${MINIO_BUCKET_NAME}" > /dev/null 2>&1; then
  mc mb "local/${MINIO_BUCKET_NAME}"
  echo "Bucket '${MINIO_BUCKET_NAME}' created."
else
  echo "Bucket '${MINIO_BUCKET_NAME}' already exists."
fi

# Set bucket policy: public GET, auth required for everything else
mc anonymous set download "local/${MINIO_BUCKET_NAME}"
echo "Bucket policy set to public download."

# Create app user if it doesn't exist
if ! mc admin user info local "${MINIO_APP_USER}" > /dev/null 2>&1; then
  mc admin user add local "${MINIO_APP_USER}" "${MINIO_APP_PASSWORD}"
  echo "User '${MINIO_APP_USER}' created."
else
  echo "User '${MINIO_APP_USER}' already exists."
fi

# Create scoped policy if it doesn't exist
if ! mc admin policy info local app-bucket-policy > /dev/null 2>&1; then
  mc admin policy create local app-bucket-policy /dev/stdin << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::${MINIO_BUCKET_NAME}/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::${MINIO_BUCKET_NAME}"
    }
  ]
}
EOF
  echo "Policy 'app-bucket-policy' created."
else
  echo "Policy 'app-bucket-policy' already exists."
fi

# Attach policy to app user (mc is idempotent here on current MinIO, guard anyway)
if ! mc admin user info local "${MINIO_APP_USER}" | grep -q "app-bucket-policy"; then
  mc admin policy attach local app-bucket-policy --user "${MINIO_APP_USER}"
  echo "Policy attached to '${MINIO_APP_USER}'."
else
  echo "Policy already attached to '${MINIO_APP_USER}'."
fi

# Hand control back to MinIO
wait $MINIO_PID