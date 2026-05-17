FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Expose ports that might be used by the services
EXPOSE 3021 3022

# Start the application using npm start
CMD ["npm", "start"]
