FROM node:20-alpine AS builder

WORKDIR /app

# Install native dependencies for node-s2 native bindings compilation
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY tsconfig.json ./

# Assuming monorepo structure, these might need adjustments based on how the workspace is built
# For this service specifically we will focus on its own package
COPY . .

# Run npm install. If in a workspace, it should have been run from root, but we build it here individually for the image
RUN npm install

RUN npm run build

FROM node:20-alpine

WORKDIR /app

# We also need native build tools in the final image if node-s2 recompiles on install, but typically only builder needs it.
# However, node-s2 requires the shared lib or compiles on install. To be safe, adding it here.
RUN apk add --no-cache python3 make g++

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3007

CMD ["npm", "start"]
