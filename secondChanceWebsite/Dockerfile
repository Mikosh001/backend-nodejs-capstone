FROM node:22-bookworm-slim AS frontend
WORKDIR /app
COPY secondChance-frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY secondChance-frontend/ ./
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
COPY secondChanceWebsite/package*.json ./
RUN npm ci --omit=dev
COPY secondChanceWebsite/index.js ./
COPY --from=frontend /app/build ./build
USER node
EXPOSE 8080
CMD ["npm", "start"]
