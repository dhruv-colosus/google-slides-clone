SHELL := /usr/bin/env bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

APP_NAME ?= saas-clone-factory
NODE_PM ?= pnpm
PYTHON ?= python3
UV ?= uv
GIT ?= git

ROOT := $(CURDIR)

# Common directories
DIRS := \
	docs/architecture \
	docs/operating-procedures \
	docs/conventions \
	apps/web/public/fonts \
	apps/web/public/icons \
	apps/web/public/images \
	apps/web/src/app/'(public)' \
	apps/web/src/app/'(auth)'/sign-in \
	apps/web/src/app/'(auth)'/sign-up \
	apps/web/src/app/'(app)'/dashboard \
	apps/web/src/app/'(app)'/settings \
	apps/web/src/app/api \
	apps/web/src/features/auth/components \
	apps/web/src/features/auth/hooks \
	apps/web/src/features/auth/screens \
	apps/web/src/features/auth/schemas \
	apps/web/src/features/auth/utils \
	apps/web/src/features/permissions/components \
	apps/web/src/features/permissions/hooks \
	apps/web/src/features/permissions/guards \
	apps/web/src/features/permissions/utils \
	apps/web/src/features/users \
	apps/web/src/features/organizations \
	apps/web/src/features/repositories \
	apps/web/src/features/issues \
	apps/web/src/features/comments \
	apps/web/src/features/notifications \
	apps/web/src/components/primitives \
	apps/web/src/components/layout \
	apps/web/src/components/feedback \
	apps/web/src/components/forms \
	apps/web/src/components/data-display \
	apps/web/src/hooks/api \
	apps/web/src/hooks/ui \
	apps/web/src/hooks/domain \
	apps/web/src/lib/api-client \
	apps/web/src/lib/auth \
	apps/web/src/lib/permissions \
	apps/web/src/lib/routing \
	apps/web/src/lib/constants \
	apps/web/src/lib/formatting \
	apps/web/src/lib/validation \
	apps/web/src/lib/utils \
	apps/web/src/store/ui \
	apps/web/src/store/filters \
	apps/web/src/store/drafts \
	apps/web/src/store/session \
	apps/web/src/styles \
	apps/web/src/testids \
	apps/web/src/generated/routes \
	apps/web/src/generated/screens \
	apps/web/src/generated/forms \
	apps/web/src/generated/guards \
	apps/web/tests-e2e/clone/auth \
	apps/web/tests-e2e/clone/workflows \
	apps/web/tests-e2e/clone/permissions \
	apps/web/tests-e2e/clone/parity \
	apps/web/tests-e2e/clone/smoke \
	apps/web/tests-e2e/fixtures \
	apps/web/tests-e2e/pom \
	apps/web/tests-e2e/snapshots \
	apps/web/tests-e2e/utils \
	apps/web/reports/playwright \
	apps/web/reports/parity \
	apps/api/app/api/routes \
	apps/api/app/core \
	apps/api/app/db \
	apps/api/app/models \
	apps/api/app/schemas \
	apps/api/app/repositories \
	apps/api/app/services \
	apps/api/app/permissions/resolvers \
	apps/api/app/audit \
	apps/api/app/search \
	apps/api/app/auth \
	apps/api/app/workflows \
	apps/api/app/seeds/factories \
	apps/api/app/seeds/scenarios \
	apps/api/app/generated/crud \
	apps/api/app/generated/policies \
	apps/api/app/generated/filters \
	apps/api/app/generated/endpoints \
	apps/api/alembic/versions \
	apps/api/tests/unit/services \
	apps/api/tests/unit/permissions \
	apps/api/tests/unit/repositories \
	apps/api/tests/unit/workflows \
	apps/api/tests/integration/routes \
	apps/api/tests/integration/auth \
	apps/api/tests/integration/permissions \
	apps/api/tests/integration/database \
	apps/api/tests/contract/openapi \
	apps/api/tests/contract/response-shapes \
	apps/api/tests/fixtures \
	apps/api/tests/helpers \
	apps/api/reports/pytest \
	apps/api/reports/openapi \
	apps/desktop/src/security \
	apps/desktop/src/windows \
	apps/desktop/src/ipc \
	apps/desktop/src/config \
	apps/desktop/src/utils \
	apps/desktop/assets/icons \
	apps/desktop/assets/installers \
	apps/desktop/reports/packaging \
	research/raw/computer-use/target \
	research/raw/computer-use/clone \
	research/raw/playwright-target/auth \
	research/raw/playwright-target/routes \
	research/raw/playwright-target/workflows \
	research/raw/playwright-target/locators/page-objects \
	research/raw/playwright-clone/auth \
	research/raw/playwright-clone/routes \
	research/raw/playwright-clone/workflows \
	research/raw/playwright-clone/locators \
	research/normalized \
	research/reports/coverage \
	research/reports/parity \
	research/reports/failures \
	research/reports/qa \
	specs/schema/semantic-rules \
	specs/generated \
	agents/capture-agent/prompts \
	agents/capture-agent/src \
	agents/capture-agent/fixtures \
	agents/capture-agent/tests \
	agents/formalization-agent/prompts \
	agents/formalization-agent/src \
	agents/formalization-agent/tests \
	agents/playwright-synthesis-agent/prompts \
	agents/playwright-synthesis-agent/src \
	agents/playwright-synthesis-agent/tests \
	agents/spec-agent/prompts \
	agents/spec-agent/src \
	agents/spec-agent/tests \
	agents/generation-agent/prompts \
	agents/generation-agent/src \
	agents/generation-agent/tests \
	agents/qa-agent/prompts \
	agents/qa-agent/src \
	agents/qa-agent/tests \
	agents/patch-agent/prompts \
	agents/patch-agent/src \
	agents/patch-agent/tests \
	scripts/capture \
	scripts/formalize \
	scripts/synthesize \
	scripts/generate \
	scripts/validate \
	scripts/package \
	scripts/deploy \
	packages/ui/src/components \
	packages/ui/src/tokens \
	packages/ui/src/icons \
	packages/ui/src/styles \
	packages/api-client/src \
	packages/api-client/generated \
	packages/config/eslint \
	packages/config/typescript \
	packages/config/prettier \
	packages/config/tailwind \
	packages/spec-types/src \
	packages/test-utils/src/playwright \
	packages/test-utils/src/pytest \
	packages/test-utils/src/factories \
	packages/shared-types/src \
	templates/clone-base/web-feature-template \
	templates/clone-base/api-entity-template \
	templates/clone-base/permission-template \
	templates/clone-base/workflow-template \
	templates/feature-slice/create \
	templates/feature-slice/list \
	templates/feature-slice/detail \
	templates/feature-slice/edit \
	templates/feature-slice/delete \
	templates/entity-crud \
	templates/page-object \
	templates/docker \
	templates/electron \
	generated/manifests \
	generated/codegen/backend \
	generated/codegen/frontend \
	generated/codegen/permissions \
	generated/codegen/tests \
	generated/diffs \
	docker/compose \
	docker/api \
	docker/web \
	docker/desktop/packaging \
	docker/postgres \
	docker/nginx \
	deployment/environments/local \
	deployment/environments/qa \
	deployment/environments/staging \
	deployment/environments/production \
	deployment/smoke \
	deployment/releases/manifests \
	deployment/releases/notes \
	deployment/releases/checksums \
	deployment/rollback \
	.github/workflows \
	.github/actions

FILES := \
	README.md \
	.env.example \
	.gitignore \
	package.json \
	pnpm-workspace.yaml \
	turbo.json \
	docker-compose.yml \
	Makefile \
	docs/architecture/clone-factory-overview.md \
	docs/architecture/artifact-lifecycle.md \
	docs/architecture/pipeline-stages.md \
	docs/architecture/deployment-strategy.md \
	docs/operating-procedures/capture-checklist.md \
	docs/operating-procedures/visual-parity-rubric.md \
	docs/operating-procedures/qa-checklist.md \
	docs/operating-procedures/release-checklist.md \
	docs/conventions/naming.md \
	docs/conventions/routing.md \
	docs/conventions/permissions.md \
	docs/conventions/state-management.md \
	docs/conventions/testing.md \
	apps/web/package.json \
	apps/web/next.config.ts \
	apps/web/tsconfig.json \
	apps/web/tailwind.config.ts \
	apps/web/postcss.config.js \
	apps/web/playwright.config.ts \
	apps/web/src/app/layout.tsx \
	apps/web/src/app/providers.tsx \
	apps/web/src/app/'(public)'/page.tsx \
	apps/web/src/app/'(public)'/layout.tsx \
	apps/web/src/app/'(auth)'/layout.tsx \
	apps/web/src/app/'(auth)'/sign-in/page.tsx \
	apps/web/src/app/'(auth)'/sign-up/page.tsx \
	apps/web/src/app/'(app)'/layout.tsx \
	apps/web/src/app/'(app)'/loading.tsx \
	apps/web/src/app/'(app)'/error.tsx \
	apps/web/src/app/'(app)'/not-found.tsx \
	apps/web/src/styles/globals.css \
	apps/api/pyproject.toml \
	apps/api/alembic.ini \
	apps/api/app/main.py \
	apps/api/app/api/router.py \
	apps/api/app/api/deps.py \
	apps/api/app/core/config.py \
	apps/api/app/core/security.py \
	apps/api/app/db/base.py \
	apps/api/app/db/session.py \
	apps/api/alembic/env.py \
	apps/desktop/package.json \
	apps/desktop/forge.config.ts \
	apps/desktop/src/main.ts \
	apps/desktop/src/preload.ts \
	specs/app-definition.yaml \
	specs/pages.yaml \
	specs/entities.yaml \
	specs/workflows.yaml \
	specs/permissions.yaml \
	specs/state-model.yaml \
	specs/seed-plan.yaml \
	specs/stub-register.yaml \
	specs/api-conventions.yaml \
	specs/feature-matrix.csv \
	specs/schema/app-definition.schema.yaml \
	specs/schema/pages.schema.yaml \
	specs/schema/entities.schema.yaml \
	specs/schema/workflows.schema.yaml \
	specs/schema/permissions.schema.yaml \
	specs/schema/state-model.schema.yaml \
	specs/schema/seed-plan.schema.yaml \
	specs/schema/stub-register.schema.yaml \
	specs/schema/api-conventions.schema.yaml \
	specs/schema/feature-matrix.schema.yaml \
	research/normalized/routes.json \
	research/normalized/workflows.json \
	research/normalized/components.json \
	research/normalized/locator-hints.json \
	research/normalized/network-hints.json \
	research/normalized/route-groups.json \
	research/normalized/component-taxonomy.json \
	research/normalized/page-state-map.json \
	research/normalized/permission-surface.json \
	research/normalized/entity-hypotheses.json \
	research/normalized/workflow-coverage.json \
	agents/capture-agent/src/run.ts \
	agents/formalization-agent/src/run.ts \
	agents/playwright-synthesis-agent/src/run.ts \
	agents/spec-agent/src/run.ts \
	agents/generation-agent/src/run.ts \
	agents/qa-agent/src/run.ts \
	agents/patch-agent/src/run.ts \
	scripts/capture/run-computer-use.ts \
	scripts/formalize/normalize-session.ts \
	scripts/synthesize/generate-playwright-assets.ts \
	scripts/synthesize/generate-specs.ts \
	scripts/synthesize/validate-spec-shape.ts \
	scripts/synthesize/validate-spec-semantics.ts \
	scripts/synthesize/compile-generation-plans.ts \
	scripts/generate/generate-backend.ts \
	scripts/generate/generate-openapi-client.ts \
	scripts/generate/generate-frontend.ts \
	scripts/generate/generate-tests.ts \
	scripts/generate/generate-seeds.ts \
	scripts/generate/sync-feature-matrix.ts \
	scripts/validate/run-typecheck.sh \
	scripts/validate/run-eslint.sh \
	scripts/validate/run-pytests.sh \
	scripts/validate/run-contract-tests.sh \
	scripts/validate/run-playwright-target.sh \
	scripts/validate/run-playwright-clone.sh \
	scripts/validate/run-visual-diff.sh \
	scripts/validate/run-permission-checks.sh \
	scripts/validate/smoke.sh \
	scripts/package/build-api-image.sh \
	scripts/package/build-web-image.sh \
	scripts/package/build-compose-bundle.sh \
	scripts/package/build-electron.sh \
	scripts/package/generate-release-notes.ts \
	scripts/deploy/deploy-local.sh \
	scripts/deploy/deploy-qa.sh \
	scripts/deploy/deploy-staging.sh \
	scripts/deploy/deploy-production.sh \
	scripts/deploy/rollback.sh \
	scripts/deploy/verify-release.sh \
	docker/compose/dev.yaml \
	docker/compose/qa.yaml \
	docker/compose/staging.yaml \
	docker/compose/prod.yaml \
	docker/api/Dockerfile \
	docker/api/entrypoint.sh \
	docker/web/Dockerfile \
	docker/web/entrypoint.sh \
	docker/postgres/init.sql \
	docker/postgres/healthcheck.sh \
	docker/nginx/default.conf \
	deployment/environments/local/.env.example \
	deployment/environments/local/release-config.json \
	deployment/smoke/api-smoke.sh \
	deployment/smoke/web-smoke.sh \
	deployment/smoke/auth-smoke.sh \
	deployment/rollback/rollback-compose.sh \
	deployment/rollback/rollback-checklist.md \
	.github/workflows/ci.yml \
	.github/workflows/release.yml

define WRITE_IF_MISSING
@if [ ! -f "$(1)" ]; then \
	mkdir -p "$$(dirname "$(1)")"; \
	cat > "$(1)" <<'EOF'; \
$(2) \
EOF \
	echo "created $(1)"; \
fi
endef

.PHONY: help
help:
	@echo ""
	@echo "Kickstart targets"
	@echo "  make init            - scaffold repo + write starter files"
	@echo "  make doctor          - check local tools"
	@echo "  make install         - install root/web/api/desktop deps when manifests exist"
	@echo "  make capture         - run computer-use capture"
	@echo "  make formalize       - normalize capture artifacts"
	@echo "  make synthesize      - generate Playwright assets + specs"
	@echo "  make validate        - run shape/semantic validation + tests"
	@echo "  make generate        - generate backend/frontend/tests/seeds"
	@echo "  make qa              - run clone Playwright + parity + smoke"
	@echo "  make package         - build docker images + electron package"
	@echo "  make deploy ENV=qa   - deploy selected env"
	@echo "  make clean           - remove transient generated reports"
	@echo ""

.PHONY: init
init: scaffold bootstrap-files chmod-scripts doctor
	@echo "Repo scaffolded."

.PHONY: scaffold
scaffold:
	@printf '%s\n' $(DIRS) | xargs -I {} mkdir -p "{}"
	@printf '%s\n' $(FILES) | xargs -I {} sh -c 'mkdir -p "$$(dirname "{}")"; touch "{}"'

.PHONY: bootstrap-files
bootstrap-files:
	$(call WRITE_IF_MISSING,README.md,# $(APP_NAME)\n\nMonorepo for SaaS clone research, spec synthesis, generation, QA, packaging, and deployment.)
	$(call WRITE_IF_MISSING,.env.example,NODE_ENV=development\nNEXT_PUBLIC_API_BASE_URL=http://localhost:8000\nDATABASE_URL=postgresql://app:app@localhost:5432/app\nAPI_PORT=8000\nWEB_PORT=3000\n)
	$(call WRITE_IF_MISSING,.gitignore,node_modules/\n.pnpm-store/\n.next/\ndist/\nout/\ncoverage/\nplaywright-report/\napps/web/test-results/\napps/web/.next/\napps/web/node_modules/\napps/desktop/node_modules/\n__pycache__/\n.pytest_cache/\n.venv/\n*.pyc\n.env\nresearch/raw/playwright-target/auth/*.json\nresearch/raw/playwright-clone/auth/*.json\n)
	$(call WRITE_IF_MISSING,package.json,{\
  "name": "$(APP_NAME)",\
  "private": true,\
  "packageManager": "pnpm@10",\
  "scripts": {\
    "dev:web": "pnpm --dir apps/web dev",\
    "dev:api": "cd apps/api && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000",\
    "build:web": "pnpm --dir apps/web build",\
    "test:web": "pnpm --dir apps/web test",\
    "test:e2e": "pnpm --dir apps/web playwright test",\
    "capture": "node scripts/capture/run-computer-use.ts",\
    "formalize": "node scripts/formalize/normalize-session.ts",\
    "synthesize:playwright": "node scripts/synthesize/generate-playwright-assets.ts",\
    "synthesize:specs": "node scripts/synthesize/generate-specs.ts",\
    "validate:specs": "node scripts/synthesize/validate-spec-shape.ts && node scripts/synthesize/validate-spec-semantics.ts",\
    "generate": "node scripts/generate/generate-backend.ts && node scripts/generate/generate-openapi-client.ts && node scripts/generate/generate-frontend.ts && node scripts/generate/generate-tests.ts && node scripts/generate/generate-seeds.ts",\
    "validate": "bash scripts/validate/run-typecheck.sh && bash scripts/validate/run-eslint.sh && bash scripts/validate/run-pytests.sh && bash scripts/validate/run-contract-tests.sh && bash scripts/validate/run-playwright-clone.sh && bash scripts/validate/run-visual-diff.sh && bash scripts/validate/smoke.sh",\
    "package": "bash scripts/package/build-api-image.sh && bash scripts/package/build-web-image.sh && bash scripts/package/build-electron.sh"\
  }\
})
	$(call WRITE_IF_MISSING,pnpm-workspace.yaml,packages:\n  - "apps/*"\n  - "packages/*"\n)
	$(call WRITE_IF_MISSING,turbo.json,{\
  "$$schema": "https://turbo.build/schema.json",\
  "tasks": {\
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },\
    "lint": { "dependsOn": ["^lint"] },\
    "test": { "dependsOn": ["^test"] },\
    "typecheck": { "dependsOn": ["^typecheck"] }\
  }\
})
	$(call WRITE_IF_MISSING,docker-compose.yml,services:\n  db:\n    image: postgres:16\n    environment:\n      POSTGRES_DB: app\n      POSTGRES_USER: app\n      POSTGRES_PASSWORD: app\n    ports:\n      - "5432:5432"\n  api:\n    build:\n      context: .\n      dockerfile: docker/api/Dockerfile\n    env_file:\n      - .env.example\n    depends_on:\n      - db\n    ports:\n      - "8000:8000"\n  web:\n    build:\n      context: .\n      dockerfile: docker/web/Dockerfile\n    env_file:\n      - .env.example\n    depends_on:\n      - api\n    ports:\n      - "3000:3000"\n)
	$(call WRITE_IF_MISSING,apps/web/package.json,{\
  "name": "@$(APP_NAME)/web",\
  "private": true,\
  "scripts": {\
    "dev": "next dev -p 3000",\
    "build": "next build",\
    "start": "next start -p 3000",\
    "lint": "next lint",\
    "playwright": "playwright test"\
  },\
  "dependencies": {\
    "next": "^15.0.0",\
    "react": "^19.0.0",\
    "react-dom": "^19.0.0"\
  },\
  "devDependencies": {\
    "@playwright/test": "^1.54.0",\
    "@types/node": "^22.0.0",\
    "@types/react": "^19.0.0",\
    "@types/react-dom": "^19.0.0",\
    "typescript": "^5.6.0",\
    "tailwindcss": "^3.4.0",\
    "postcss": "^8.4.0",\
    "autoprefixer": "^10.4.0"\
  }\
})
	$(call WRITE_IF_MISSING,apps/web/next.config.ts,const nextConfig = {};\nexport default nextConfig;\n)
	$(call WRITE_IF_MISSING,apps/web/tsconfig.json,{\
  "compilerOptions": {\
    "target": "ES2022",\
    "lib": ["dom", "dom.iterable", "es2022"],\
    "allowJs": false,\
    "skipLibCheck": true,\
    "strict": true,\
    "noEmit": true,\
    "module": "esnext",\
    "moduleResolution": "bundler",\
    "resolveJsonModule": true,\
    "isolatedModules": true,\
    "jsx": "preserve",\
    "incremental": true,\
    "baseUrl": ".",\
    "paths": { "@/*": ["./src/*"] }\
  },\
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],\
  "exclude": ["node_modules"]\
})
	$(call WRITE_IF_MISSING,apps/web/tailwind.config.ts,import type { Config } from "tailwindcss";\nconst config: Config = { content: ["./src/**/*.{ts,tsx}"], theme: { extend: {} }, plugins: [] };\nexport default config;\n)
	$(call WRITE_IF_MISSING,apps/web/postcss.config.js,module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };\n)
	$(call WRITE_IF_MISSING,apps/web/playwright.config.ts,import { defineConfig } from "@playwright/test";\nexport default defineConfig({\n  testDir: "./tests-e2e",\n  fullyParallel: false,\n  use: {\n    baseURL: "http://127.0.0.1:3000",\n    trace: "retain-on-failure",\n    screenshot: "only-on-failure",\n    video: "retain-on-failure"\n  }\n});\n)
	$(call WRITE_IF_MISSING,apps/web/src/app/layout.tsx,import "@/styles/globals.css";\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}\n)
	$(call WRITE_IF_MISSING,apps/web/src/app/providers.tsx,export function Providers({ children }: { children: React.ReactNode }) {\n  return <>{children}</>;\n}\n)
	$(call WRITE_IF_MISSING,apps/web/src/app/'(public)'/layout.tsx,export default function PublicLayout({ children }: { children: React.ReactNode }) {\n  return children;\n}\n)
	$(call WRITE_IF_MISSING,apps/web/src/app/'(public)'/page.tsx,export default function HomePage() {\n  return <main className="p-8">Clone factory</main>;\n}\n)
	$(call WRITE_IF_MISSING,apps/web/src/app/'(auth)'/layout.tsx,export default function AuthLayout({ children }: { children: React.ReactNode }) {\n  return <div className="min-h-screen grid place-items-center">{children}</div>;\n}\n)
	$(call WRITE_IF_MISSING,apps/web/src/app/'(auth)'/sign-in/page.tsx,export default function SignInPage() {\n  return <div>Sign in</div>;\n}\n)
	$(call WRITE_IF_MISSING,apps/web/src/app/'(auth)'/sign-up/page.tsx,export default function SignUpPage() {\n  return <div>Sign up</div>;\n}\n)
	$(call WRITE_IF_MISSING,apps/web/src/app/'(app)'/layout.tsx,export default function AppLayout({ children }: { children: React.ReactNode }) {\n  return <div className="min-h-screen">{children}</div>;\n}\n)
	$(call WRITE_IF_MISSING,apps/web/src/app/'(app)'/loading.tsx,export default function Loading() { return <div>Loading...</div>; }\n)
	$(call WRITE_IF_MISSING,apps/web/src/app/'(app)'/error.tsx,"use client";\nexport default function Error() { return <div>Something went wrong.</div>; }\n)
	$(call WRITE_IF_MISSING,apps/web/src/app/'(app)'/not-found.tsx,export default function NotFound() { return <div>Not found.</div>; }\n)
	$(call WRITE_IF_MISSING,apps/web/src/styles/globals.css,@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nhtml, body { margin: 0; padding: 0; }\n)
	$(call WRITE_IF_MISSING,apps/api/pyproject.toml,[project]\nname = "$(APP_NAME)-api"\nversion = "0.1.0"\nrequires-python = ">=3.11"\ndependencies = [\n  "fastapi>=0.115.0",\n  "uvicorn[standard]>=0.30.0",\n  "sqlalchemy>=2.0.0",\n  "alembic>=1.13.0",\n  "psycopg[binary]>=3.2.0",\n  "pydantic>=2.8.0"\n]\n\n[tool.pytest.ini_options]\npythonpath = ["."]\n)
	$(call WRITE_IF_MISSING,apps/api/alembic.ini,[alembic]\nscript_location = alembic\nsqlalchemy.url = postgresql://app:app@db:5432/app\n)
	$(call WRITE_IF_MISSING,apps/api/app/main.py,from fastapi import FastAPI\nfrom app.api.router import api_router\n\napp = FastAPI(title="$(APP_NAME) API")\napp.include_router(api_router, prefix="/api")\n\n@app.get("/health")\ndef health():\n    return {"status": "ok"}\n)
	$(call WRITE_IF_MISSING,apps/api/app/api/router.py,from fastapi import APIRouter\n\napi_router = APIRouter()\n)
	$(call WRITE_IF_MISSING,apps/api/app/api/deps.py,from typing import Generator\n\nfrom app.db.session import SessionLocal\n\n\ndef get_db() -> Generator:\n    db = SessionLocal()\n    try:\n        yield db\n    finally:\n        db.close()\n)
	$(call WRITE_IF_MISSING,apps/api/app/core/config.py,from pydantic import BaseModel\n\n\nclass Settings(BaseModel):\n    app_name: str = "$(APP_NAME) API"\n\n\nsettings = Settings()\n)
	$(call WRITE_IF_MISSING,apps/api/app/core/security.py,def noop_security() -> None:\n    return None\n)
	$(call WRITE_IF_MISSING,apps/api/app/db/base.py,from sqlalchemy.orm import DeclarativeBase\n\n\nclass Base(DeclarativeBase):\n    pass\n)
	$(call WRITE_IF_MISSING,apps/api/app/db/session.py,from sqlalchemy import create_engine\nfrom sqlalchemy.orm import sessionmaker\n\nDATABASE_URL = "postgresql://app:app@db:5432/app"\nengine = create_engine(DATABASE_URL)\nSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)\n)
	$(call WRITE_IF_MISSING,apps/api/alembic/env.py,from logging.config import fileConfig\nfrom alembic import context\nfrom sqlalchemy import engine_from_config, pool\n\nconfig = context.config\nif config.config_file_name is not None:\n    fileConfig(config.config_file_name)\n\ntarget_metadata = None\n\ndef run_migrations_offline():\n    context.configure(url=config.get_main_option("sqlalchemy.url"), literal_binds=True)\n    with context.begin_transaction():\n        context.run_migrations()\n\ndef run_migrations_online():\n    connectable = engine_from_config(config.get_section(config.config_ini_section), prefix="sqlalchemy.", poolclass=pool.NullPool)\n    with connectable.connect() as connection:\n        context.configure(connection=connection, target_metadata=target_metadata)\n        with context.begin_transaction():\n            context.run_migrations()\n\nif context.is_offline_mode():\n    run_migrations_offline()\nelse:\n    run_migrations_online()\n)
	$(call WRITE_IF_MISSING,apps/desktop/package.json,{\
  "name": "@$(APP_NAME)/desktop",\
  "private": true,\
  "main": "dist/main.js",\
  "scripts": {\
    "dev": "electron .",\
    "package": "electron-forge package",\
    "make": "electron-forge make"\
  },\
  "devDependencies": {\
    "@electron-forge/cli": "^7.6.0",\
    "@electron-forge/maker-zip": "^7.6.0",\
    "electron": "^37.0.0",\
    "typescript": "^5.6.0"\
  }\
})
	$(call WRITE_IF_MISSING,apps/desktop/forge.config.ts,export default {\n  packagerConfig: {},\n  makers: [{ name: "@electron-forge/maker-zip", platforms: ["darwin", "linux", "win32"] }]\n};\n)
	$(call WRITE_IF_MISSING,apps/desktop/src/main.ts,import { app, BrowserWindow } from "electron";\n\nfunction createWindow() {\n  const win = new BrowserWindow({\n    width: 1440,\n    height: 900,\n    webPreferences: {\n      contextIsolation: true,\n      nodeIntegration: false,\n      preload: __dirname + "/preload.js"\n    }\n  });\n\n  win.loadURL(process.env.ELECTRON_START_URL || "http://127.0.0.1:3000");\n}\n\napp.whenReady().then(createWindow);\n)
	$(call WRITE_IF_MISSING,apps/desktop/src/preload.ts,export {};\n)
	$(call WRITE_IF_MISSING,specs/app-definition.yaml,schema_version: "1.0"\napp:\n  key: ""\n  name: ""\n)
	$(call WRITE_IF_MISSING,specs/pages.yaml,schema_version: "1.0"\npages: []\n)
	$(call WRITE_IF_MISSING,specs/entities.yaml,schema_version: "1.0"\nentities: []\n)
	$(call WRITE_IF_MISSING,specs/workflows.yaml,schema_version: "1.0"\nworkflows: []\n)
	$(call WRITE_IF_MISSING,specs/permissions.yaml,schema_version: "1.0"\nroles: []\n)
	$(call WRITE_IF_MISSING,specs/state-model.yaml,schema_version: "1.0"\nstate_model: {}\n)
	$(call WRITE_IF_MISSING,specs/seed-plan.yaml,schema_version: "1.0"\nseed_plan: {}\n)
	$(call WRITE_IF_MISSING,specs/stub-register.yaml,schema_version: "1.0"\nstubs: []\n)
	$(call WRITE_IF_MISSING,specs/api-conventions.yaml,schema_version: "1.0"\napi:\n  style: rest\n)
	$(call WRITE_IF_MISSING,specs/feature-matrix.csv,feature_key,page_key,route,component_key,entity_key,action_type,workflow_key,query_keys,mutation_keys,permission_keys,backend_endpoint,status,test_unit,test_integration,test_e2e,visual_covered,seed_covered,notes\n)
	$(call WRITE_IF_MISSING,specs/schema/app-definition.schema.yaml,type: object\n)
	$(call WRITE_IF_MISSING,specs/schema/pages.schema.yaml,type: object\n)
	$(call WRITE_IF_MISSING,specs/schema/entities.schema.yaml,type: object\n)
	$(call WRITE_IF_MISSING,specs/schema/workflows.schema.yaml,type: object\n)
	$(call WRITE_IF_MISSING,specs/schema/permissions.schema.yaml,type: object\n)
	$(call WRITE_IF_MISSING,specs/schema/state-model.schema.yaml,type: object\n)
	$(call WRITE_IF_MISSING,specs/schema/seed-plan.schema.yaml,type: object\n)
	$(call WRITE_IF_MISSING,specs/schema/stub-register.schema.yaml,type: object\n)
	$(call WRITE_IF_MISSING,specs/schema/api-conventions.schema.yaml,type: object\n)
	$(call WRITE_IF_MISSING,specs/schema/feature-matrix.schema.yaml,type: object\n)
	$(call WRITE_IF_MISSING,research/normalized/routes.json,{\n  "routes": []\n}\n)
	$(call WRITE_IF_MISSING,research/normalized/workflows.json,{\n  "workflows": []\n}\n)
	$(call WRITE_IF_MISSING,research/normalized/components.json,{\n  "components": []\n}\n)
	$(call WRITE_IF_MISSING,research/normalized/locator-hints.json,{\n  "locator_hints": []\n}\n)
	$(call WRITE_IF_MISSING,research/normalized/network-hints.json,{\n  "network_hints": []\n}\n)
	$(call WRITE_IF_MISSING,research/normalized/route-groups.json,{\n  "route_groups": []\n}\n)
	$(call WRITE_IF_MISSING,research/normalized/component-taxonomy.json,{\n  "component_taxonomy": []\n}\n)
	$(call WRITE_IF_MISSING,research/normalized/page-state-map.json,{\n  "page_states": []\n}\n)
	$(call WRITE_IF_MISSING,research/normalized/permission-surface.json,{\n  "permission_surface": []\n}\n)
	$(call WRITE_IF_MISSING,research/normalized/entity-hypotheses.json,{\n  "entity_hypotheses": []\n}\n)
	$(call WRITE_IF_MISSING,research/normalized/workflow-coverage.json,{\n  "workflow_coverage": []\n}\n)
	$(call WRITE_IF_MISSING,agents/capture-agent/src/run.ts,console.log("capture-agent placeholder");\n)
	$(call WRITE_IF_MISSING,agents/formalization-agent/src/run.ts,console.log("formalization-agent placeholder");\n)
	$(call WRITE_IF_MISSING,agents/playwright-synthesis-agent/src/run.ts,console.log("playwright-synthesis-agent placeholder");\n)
	$(call WRITE_IF_MISSING,agents/spec-agent/src/run.ts,console.log("spec-agent placeholder");\n)
	$(call WRITE_IF_MISSING,agents/generation-agent/src/run.ts,console.log("generation-agent placeholder");\n)
	$(call WRITE_IF_MISSING,agents/qa-agent/src/run.ts,console.log("qa-agent placeholder");\n)
	$(call WRITE_IF_MISSING,agents/patch-agent/src/run.ts,console.log("patch-agent placeholder");\n)
	$(call WRITE_IF_MISSING,scripts/capture/run-computer-use.ts,console.log("run computer-use capture");\n)
	$(call WRITE_IF_MISSING,scripts/formalize/normalize-session.ts,console.log("normalize capture session");\n)
	$(call WRITE_IF_MISSING,scripts/synthesize/generate-playwright-assets.ts,console.log("generate Playwright assets");\n)
	$(call WRITE_IF_MISSING,scripts/synthesize/generate-specs.ts,console.log("generate specs");\n)
	$(call WRITE_IF_MISSING,scripts/synthesize/validate-spec-shape.ts,console.log("validate spec shape");\n)
	$(call WRITE_IF_MISSING,scripts/synthesize/validate-spec-semantics.ts,console.log("validate spec semantics");\n)
	$(call WRITE_IF_MISSING,scripts/synthesize/compile-generation-plans.ts,console.log("compile generation plans");\n)
	$(call WRITE_IF_MISSING,scripts/generate/generate-backend.ts,console.log("generate backend");\n)
	$(call WRITE_IF_MISSING,scripts/generate/generate-openapi-client.ts,console.log("generate openapi client");\n)
	$(call WRITE_IF_MISSING,scripts/generate/generate-frontend.ts,console.log("generate frontend");\n)
	$(call WRITE_IF_MISSING,scripts/generate/generate-tests.ts,console.log("generate tests");\n)
	$(call WRITE_IF_MISSING,scripts/generate/generate-seeds.ts,console.log("generate seeds");\n)
	$(call WRITE_IF_MISSING,scripts/generate/sync-feature-matrix.ts,console.log("sync feature matrix");\n)
	$(call WRITE_IF_MISSING,scripts/validate/run-typecheck.sh,#!/usr/bin/env bash\nset -euo pipefail\necho "typecheck placeholder"\n)
	$(call WRITE_IF_MISSING,scripts/validate/run-eslint.sh,#!/usr/bin/env bash\nset -euo pipefail\necho "eslint placeholder"\n)
	$(call WRITE_IF_MISSING,scripts/validate/run-pytests.sh,#!/usr/bin/env bash\nset -euo pipefail\necho "pytest placeholder"\n)
	$(call WRITE_IF_MISSING,scripts/validate/run-contract-tests.sh,#!/usr/bin/env bash\nset -euo pipefail\necho "contract tests placeholder"\n)
	$(call WRITE_IF_MISSING,scripts/validate/run-playwright-target.sh,#!/usr/bin/env bash\nset -euo pipefail\necho "playwright target placeholder"\n)
	$(call WRITE_IF_MISSING,scripts/validate/run-playwright-clone.sh,#!/usr/bin/env bash\nset -euo pipefail\necho "playwright clone placeholder"\n)
	$(call WRITE_IF_MISSING,scripts/validate/run-visual-diff.sh,#!/usr/bin/env bash\nset -euo pipefail\necho "visual diff placeholder"\n)
	$(call WRITE_IF_MISSING,scripts/validate/run-permission-checks.sh,#!/usr/bin/env bash\nset -euo pipefail\necho "permission checks placeholder"\n)
	$(call WRITE_IF_MISSING,scripts/validate/smoke.sh,#!/usr/bin/env bash\nset -euo pipefail\necho "smoke placeholder"\n)
	$(call WRITE_IF_MISSING,scripts/package/build-api-image.sh,#!/usr/bin/env bash\nset -euo pipefail\ndocker build -f docker/api/Dockerfile -t $(APP_NAME)-api .\n)
	$(call WRITE_IF_MISSING,scripts/package/build-web-image.sh,#!/usr/bin/env bash\nset -euo pipefail\ndocker build -f docker/web/Dockerfile -t $(APP_NAME)-web .\n)
	$(call WRITE_IF_MISSING,scripts/package/build-compose-bundle.sh,#!/usr/bin/env bash\nset -euo pipefail\necho "compose bundle placeholder"\n)
	$(call WRITE_IF_MISSING,scripts/package/build-electron.sh,#!/usr/bin/env bash\nset -euo pipefail\necho "electron build placeholder"\n)
	$(call WRITE_IF_MISSING,scripts/package/generate-release-notes.ts,console.log("generate release notes");\n)
	$(call WRITE_IF_MISSING,scripts/deploy/deploy-local.sh,#!/usr/bin/env bash\nset -euo pipefail\ndocker compose -f docker/compose/dev.yaml up -d --build\n)
	$(call WRITE_IF_MISSING,scripts/deploy/deploy-qa.sh,#!/usr/bin/env bash\nset -euo pipefail\ndocker compose -f docker/compose/qa.yaml up -d --build\n)
	$(call WRITE_IF_MISSING,scripts/deploy/deploy-staging.sh,#!/usr/bin/env bash\nset -euo pipefail\ndocker compose -f docker/compose/staging.yaml up -d --build\n)
	$(call WRITE_IF_MISSING,scripts/deploy/deploy-production.sh,#!/usr/bin/env bash\nset -euo pipefail\ndocker compose -f docker/compose/prod.yaml up -d --build\n)
	$(call WRITE_IF_MISSING,scripts/deploy/rollback.sh,#!/usr/bin/env bash\nset -euo pipefail\necho "rollback placeholder"\n)
	$(call WRITE_IF_MISSING,scripts/deploy/verify-release.sh,#!/usr/bin/env bash\nset -euo pipefail\necho "verify release placeholder"\n)
	$(call WRITE_IF_MISSING,docker/compose/dev.yaml,include:\n  - ../../docker-compose.yml\n)
	$(call WRITE_IF_MISSING,docker/compose/qa.yaml,include:\n  - ../../docker-compose.yml\n)
	$(call WRITE_IF_MISSING,docker/compose/staging.yaml,include:\n  - ../../docker-compose.yml\n)
	$(call WRITE_IF_MISSING,docker/compose/prod.yaml,include:\n  - ../../docker-compose.yml\n)
	$(call WRITE_IF_MISSING,docker/api/Dockerfile,FROM python:3.12-slim\nWORKDIR /app\nCOPY apps/api /app\nRUN pip install --no-cache-dir fastapi uvicorn sqlalchemy alembic psycopg[binary] pydantic\nCMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]\n)
	$(call WRITE_IF_MISSING,docker/api/entrypoint.sh,#!/usr/bin/env bash\nset -euo pipefail\nexec uvicorn app.main:app --host 0.0.0.0 --port 8000\n)
	$(call WRITE_IF_MISSING,docker/web/Dockerfile,FROM node:22-alpine\nWORKDIR /app\nCOPY apps/web /app\nRUN npm install -g pnpm && pnpm install && pnpm build\nCMD ["pnpm", "start"]\n)
	$(call WRITE_IF_MISSING,docker/web/entrypoint.sh,#!/usr/bin/env bash\nset -euo pipefail\npnpm start\n)
	$(call WRITE_IF_MISSING,docker/postgres/init.sql,SELECT 1;\n)
	$(call WRITE_IF_MISSING,docker/postgres/healthcheck.sh,#!/usr/bin/env bash\npg_isready -U app -d app\n)
	$(call WRITE_IF_MISSING,docker/nginx/default.conf,server {\n  listen 80;\n  location / {\n    proxy_pass http://web:3000;\n  }\n  location /api/ {\n    proxy_pass http://api:8000;\n  }\n}\n)
	$(call WRITE_IF_MISSING,deployment/environments/local/.env.example,NODE_ENV=development\n)
	$(call WRITE_IF_MISSING,deployment/environments/local/release-config.json,{\n  "env": "local"\n}\n)
	$(call WRITE_IF_MISSING,deployment/smoke/api-smoke.sh,#!/usr/bin/env bash\nset -euo pipefail\ncurl -fsS http://127.0.0.1:8000/health\n)
	$(call WRITE_IF_MISSING,deployment/smoke/web-smoke.sh,#!/usr/bin/env bash\nset -euo pipefail\ncurl -fsS http://127.0.0.1:3000\n)
	$(call WRITE_IF_MISSING,deployment/smoke/auth-smoke.sh,#!/usr/bin/env bash\nset -euo pipefail\necho "auth smoke placeholder"\n)
	$(call WRITE_IF_MISSING,deployment/rollback/rollback-compose.sh,#!/usr/bin/env bash\nset -euo pipefail\necho "rollback compose placeholder"\n)
	$(call WRITE_IF_MISSING,deployment/rollback/rollback-checklist.md,# Rollback checklist\n)
	$(call WRITE_IF_MISSING,.github/workflows/ci.yml,name: ci\non: [push, pull_request]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: echo "CI placeholder"\n)
	$(call WRITE_IF_MISSING,.github/workflows/release.yml,name: release\non:\n  workflow_dispatch:\njobs:\n  release:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: echo "Release placeholder"\n)

.PHONY: chmod-scripts
chmod-scripts:
	@find scripts docker deployment -type f \( -name "*.sh" -o -name "*.ts" \) | while read -r f; do \
		case "$$f" in \
			*.sh) chmod +x "$$f" ;; \
		esac; \
	done

.PHONY: doctor
doctor:
	@echo "Checking local tools..."
	@command -v $(NODE_PM) >/dev/null 2>&1 || { echo "$(NODE_PM) not found"; exit 1; }
	@command -v $(PYTHON) >/dev/null 2>&1 || { echo "$(PYTHON) not found"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "docker not found"; exit 1; }
	@command -v $(GIT) >/dev/null 2>&1 || { echo "git not found"; exit 1; }
	@echo "OK"

.PHONY: install
install:
	@if [ -f package.json ]; then $(NODE_PM) install; fi
	@if [ -f apps/web/package.json ]; then $(NODE_PM) --dir apps/web install; fi
	@if [ -f apps/desktop/package.json ]; then $(NODE_PM) --dir apps/desktop install; fi
	@if [ -f apps/api/pyproject.toml ]; then \
		if command -v $(UV) >/dev/null 2>&1; then cd apps/api && $(UV) sync; \
		else echo "uv not found; skipping api dependency sync"; fi; \
	fi

.PHONY: git-init
git-init:
	@if [ ! -d .git ]; then $(GIT) init; fi

.PHONY: capture
capture:
	@node scripts/capture/run-computer-use.ts

.PHONY: formalize
formalize:
	@node scripts/formalize/normalize-session.ts

.PHONY: synthesize
synthesize:
	@node scripts/synthesize/generate-playwright-assets.ts
	@node scripts/synthesize/generate-specs.ts
	@node scripts/synthesize/validate-spec-shape.ts
	@node scripts/synthesize/validate-spec-semantics.ts
	@node scripts/synthesize/compile-generation-plans.ts

.PHONY: generate
generate:
	@node scripts/generate/generate-backend.ts
	@node scripts/generate/generate-openapi-client.ts
	@node scripts/generate/generate-frontend.ts
	@node scripts/generate/generate-tests.ts
	@node scripts/generate/generate-seeds.ts
	@node scripts/generate/sync-feature-matrix.ts

.PHONY: validate
validate:
	@bash scripts/validate/run-typecheck.sh
	@bash scripts/validate/run-eslint.sh
	@bash scripts/validate/run-pytests.sh
	@bash scripts/validate/run-contract-tests.sh
	@bash scripts/validate/run-permission-checks.sh

.PHONY: qa
qa:
	@bash scripts/validate/run-playwright-clone.sh
	@bash scripts/validate/run-visual-diff.sh
	@bash scripts/validate/smoke.sh

.PHONY: package
package:
	@bash scripts/package/build-api-image.sh
	@bash scripts/package/build-web-image.sh
	@bash scripts/package/build-compose-bundle.sh
	@bash scripts/package/build-electron.sh

ENV ?= local
.PHONY: deploy
deploy:
	@case "$(ENV)" in \
		local) bash scripts/deploy/deploy-local.sh ;; \
		qa) bash scripts/deploy/deploy-qa.sh ;; \
		staging) bash scripts/deploy/deploy-staging.sh ;; \
		production) bash scripts/deploy/deploy-production.sh ;; \
		*) echo "Unknown ENV=$(ENV). Use local|qa|staging|production"; exit 1 ;; \
	esac
	@bash scripts/deploy/verify-release.sh

.PHONY: full
full: capture formalize synthesize generate validate qa package

.PHONY: clean
clean:
	@rm -rf apps/web/.next apps/web/test-results playwright-report coverage dist out
	@find research/reports -type f ! -name ".gitkeep" -delete 2>/dev/null || true
	@find generated/diffs -type f ! -name ".gitkeep" -delete 2>/dev/null || true
	@echo "Cleaned transient artifacts."

.PHONY: reset-generated
reset-generated:
	@rm -rf generated/codegen/* specs/generated/* research/reports/* apps/web/reports/* apps/api/reports/*
	@echo "Reset generated artifacts."
