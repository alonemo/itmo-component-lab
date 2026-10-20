FROM node:22-alpine
LABEL org.opencontainers.image.source="https://github.com/alonemo/itmo-component-lab"
WORKDIR /app
COPY index.mjs .
CMD ["node", "index.mjs"]
