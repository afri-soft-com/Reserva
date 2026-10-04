FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm ci
RUN npm run build:shared && npm run build -w apps/api

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/apps/api/prisma apps/api/prisma
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
EXPOSE 4101
ENV PORT=4101
CMD ["node", "apps/api/dist/server.js"]
