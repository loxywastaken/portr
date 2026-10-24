#!/bin/sh
set -eu
# Mounted disks (Render, some volume drivers) arrive owned by root: hand the media
# directory to the node user, then drop root before running anything else.
if [ "$(id -u)" = 0 ]; then
	mkdir -p "${MEDIA_DIR}"
	find "${MEDIA_DIR}" ! -user node -exec chown node:node {} +
	exec setpriv --reuid=node --regid=node --init-groups sh "$0" "$@"
fi
if [ ! -f "${CLIENT_DIR}/index.html" ]; then
	node scripts/capture.mjs
fi
exec node src/server.mjs
