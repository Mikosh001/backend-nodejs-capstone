FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p public/uploads && chown node:node public/uploads
USER node
ENV NODE_ENV=production
EXPOSE 3060
CMD ["npm", "start"]
