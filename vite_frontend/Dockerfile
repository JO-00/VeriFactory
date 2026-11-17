FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Vite uses 5173; Create React App uses 3000
EXPOSE 5173 3000

# For Vite (--host is required so Docker can expose it to Windows):
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]