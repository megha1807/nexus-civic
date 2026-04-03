FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy monorepo config
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.seed.json ./
COPY pnpm-lock.yaml ./

# Copy packages
COPY packages/ ./packages/
COPY services/near-give ./services/near-give

RUN pnpm install --frozen-lockfile

# Build everything needed
RUN pnpm --filter @nexus-civic/near-give... build

FROM node:20-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

ENV NODE_ENV production
ENV PORT 3005

COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY services/near-give/package.json ./services/near-give/
COPY services/near-give/dist ./services/near-give/dist

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

WORKDIR /app/services/near-give

EXPOSE 3005
CMD ["npm", "start"]
