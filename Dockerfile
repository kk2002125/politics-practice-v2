FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json ./
COPY scripts ./scripts
COPY src ./src
COPY worker ./worker
COPY server ./server
RUN npm run build
ENV NODE_ENV=production PORT=3000
USER node
EXPOSE 3000
CMD ["node", "server/index.mjs"]
