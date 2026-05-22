FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_DEMO_EMAIL_EMPLOYEE=
ARG VITE_DEMO_EMAIL_MANAGER=
ARG VITE_DEMO_EMAIL_HR=
ENV VITE_DEMO_EMAIL_EMPLOYEE=$VITE_DEMO_EMAIL_EMPLOYEE \
    VITE_DEMO_EMAIL_MANAGER=$VITE_DEMO_EMAIL_MANAGER \
    VITE_DEMO_EMAIL_HR=$VITE_DEMO_EMAIL_HR

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
