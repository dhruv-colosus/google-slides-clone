FROM node:22-alpine
WORKDIR /app
COPY apps/web /app
RUN npm install -g pnpm && pnpm install && pnpm build
CMD ["pnpm", "start"]
