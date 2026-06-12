FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Cache bust - cambiar valor para forzar rebuild sin cache
ARG CACHE_BUST=20260612_3

# Build-time args para Vite
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_API_URL
ARG VITE_N8N_WEBHOOK

# Exponer como ENV para que Vite los incruste en el bundle
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_N8N_WEBHOOK=$VITE_N8N_WEBHOOK

RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "dist", "-p", "3000", "--single"]
