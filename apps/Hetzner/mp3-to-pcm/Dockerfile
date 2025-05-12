FROM oven/bun:1.0.14

RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN bun install

CMD ["bun", "src/index.ts"]
