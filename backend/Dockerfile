FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install --production
COPY . .
ENV PORT=3001
EXPOSE $PORT
CMD ["node", "server.js"]
