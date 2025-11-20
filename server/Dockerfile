# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory in container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy server source code
COPY . .

# Expose the port the server runs on
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
