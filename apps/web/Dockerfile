FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm ci
RUN npm run build:shared && npm run build -w apps/web

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3001
CMD ["node", "apps/web/server.js"]
