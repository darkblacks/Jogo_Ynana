FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm --prefix backend install --omit=dev
ENV PORT=8080
EXPOSE 8080
CMD ["node", "backend/server.js"]
