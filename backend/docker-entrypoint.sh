#!/bin/sh
set -e

# Named volumes may retain root-owned files from earlier deploys.
# Ensure the app user can create/update the SQLite database.
if [ -d /app/data ]; then
  chown -R node:node /app/data
fi

cd /app
exec su -s /bin/sh node -c "$*"
