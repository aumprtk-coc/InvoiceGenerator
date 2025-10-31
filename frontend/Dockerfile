FROM node:20-slim

WORKDIR /app

# Copy package manifests
COPY frontend/package.json frontend/yarn.lock* ./

RUN npm install --silent

# Copy app
COPY frontend /app

EXPOSE 3000

ENV CHOKIDAR_USEPOLLING=true

CMD ["npm", "start"]
