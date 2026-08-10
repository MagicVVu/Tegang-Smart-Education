FROM node:24.18.0-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/mock-data/package.json ./packages/mock-data/package.json
COPY packages/business-rules/package.json ./packages/business-rules/package.json
COPY packages/design-tokens/package.json ./packages/design-tokens/package.json
COPY packages/shared-utils/package.json ./packages/shared-utils/package.json
RUN pnpm install --frozen-lockfile

COPY apps/web ./apps/web
COPY packages ./packages

ARG VITE_API_BASE_URL=http://127.0.0.1:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN pnpm build:web

FROM node:24.18.0-bookworm-slim AS runtime

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

COPY --from=build /workspace/package.json ./package.json
COPY --from=build /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/web ./apps/web
COPY --from=build /workspace/packages ./packages

EXPOSE 4173

CMD ["pnpm", "--filter", "@tegang/web", "preview", "--host", "0.0.0.0", "--port", "4173"]
