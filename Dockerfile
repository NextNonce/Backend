# -------- Build stage --------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
# generate Prisma client & types
RUN npx prisma generate

# compile NestJS
RUN yarn build

# -------- Prune stage --------
FROM builder AS deps-pruned
RUN yarn install --production --ignore-scripts --prefer-offline

# -------- Runtime stage --------
FROM node:22-alpine AS runtime
WORKDIR /app

COPY --from=deps-pruned /app/node_modules ./node_modules
COPY --from=builder      /app/dist          ./dist
COPY package.json .

# ---- allow the non-root user (UID 1000 = "node") to write logs
RUN mkdir /app/logs && chown node:node /app/logs

USER node

ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["node", "dist/main.js"]