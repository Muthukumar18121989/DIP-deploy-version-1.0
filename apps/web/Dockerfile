# VITE_API_URL is a client-side env var Vite bakes into the static bundle at
# BUILD time (not readable/changeable at container runtime) — pass it via
# --build-arg when building the image, pointed at your deployed backend URL.
FROM node:22.12-slim AS build
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Cloud Run injects $PORT (defaults to 8080); nginx's templating (envsubst)
# substitutes it into the listen directive at container start.
ENV PORT=8080
EXPOSE 8080
