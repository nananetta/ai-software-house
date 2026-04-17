FROM node:20-bullseye-slim AS client-build

WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

FROM node:20-bullseye-slim AS server-build

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server/ ./
RUN npm run db:generate
RUN npm run build

FROM node:20-bullseye-slim AS runtime

WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL=file:/data/wealth-plus.db
ENV DATABASE_FILE_PATH=/data/wealth-plus.db

COPY --from=server-build /app/server/package*.json ./
COPY --from=server-build /app/server/node_modules ./node_modules
COPY --from=server-build /app/server/dist ./dist
COPY --from=server-build /app/server/src/prisma ./src/prisma
COPY --from=client-build /app/client/dist ../client/dist
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

VOLUME ["/data"]

EXPOSE 4000

CMD ["./docker-entrypoint.sh"]
