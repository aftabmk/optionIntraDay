FROM node:18-slim

# Set timezone to IST (Asia/Kolkata)
RUN apt-get update && apt-get install -y tzdata && \
    ln -sf /usr/share/zoneinfo/Asia/Kolkata /etc/localtime && \
    echo "Asia/Kolkata" > /etc/timezone && \
    dpkg-reconfigure -f noninteractive tzdata && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install required dependencies for Chromium (Puppeteer)
RUN apt-get update && apt-get install -y \
  wget \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxkbcommon0 \
  libxrandr2 \
  libxss1 \
  libxtst6 \
  libpangocairo-1.0-0 \
  libpango-1.0-0 \
  libu2f-udev \
  libvulkan1 \
  lsb-release \
  libxshmfence1 \
  xdg-utils \
  --no-install-recommends && \
  apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Expose app port
EXPOSE 3000

# Use environment port or default
ENV PORT=3000

# Start the app
CMD ["node", "index.js"]
