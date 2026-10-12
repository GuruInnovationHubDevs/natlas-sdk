# natlas-sdk playground on a free Hugging Face Space.
# Space secrets: NATLAS_BASE_URL, NATLAS_API_KEY, ADMIN_KEY.
FROM node:22

ARG REPO=https://github.com/GuruInnovationHubDevs/natlas-sdk
ARG REF=main
RUN git clone --depth 1 --branch "$REF" "$REPO" /app && cd /app && npm ci && npm run compile

WORKDIR /app
ENV PORT=7860 PLAYGROUND_DATA_DIR=/tmp/playground-data
EXPOSE 7860
CMD ["node", "playground/server.mjs"]
