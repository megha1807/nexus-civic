FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configurations
COPY package*.json ./
COPY tsconfig.json ./

# Copy packages
COPY packages/ ./packages/

# Copy service
COPY services/terra-scan/ ./services/terra-scan/

# Install dependencies (workspaces will link packages)
RUN npm install

# Build everything
RUN npm run build --workspaces

FROM node:20-alpine AS runner

WORKDIR /app

# Copy built code and node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/terra-scan ./services/terra-scan

WORKDIR /app/services/terra-scan
EXPOSE 3006

CMD ["npm", "start"]
