FROM node:22-slim
RUN apt-get update && apt-get install -y build-essential python3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY start.sh init-db.js ./
RUN chmod +x start.sh
EXPOSE 20128
CMD ["bash", "start.sh"]
