FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy files
COPY package*.json ./
COPY . .

# Install everything including puppeteer
RUN npm install

# Default command
CMD ["node", "index.js"]
