# Aponta MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Aponta Service Desk MVP with ticket management, service desks (mesas), basic SLA, and queue dashboard.

**Architecture:** Nx Monorepo with NestJS API (Prisma/PostgreSQL) and React Web (Tailwind/Zustand/Tanstack Query). JWT authentication. Docker Compose for local development.

**Tech Stack:** NestJS 11, Prisma 7.8+, PostgreSQL, React 19, Vite, Tailwind CSS v4, Zustand, Tanstack React Query, Jest, Playwright (e2e).

**Spec:** `docs/superpowers/specs/2026-09-29-aponta-mvp-design.md`

## Global Constraints

- Prisma 7.8+ with PostgreSQL adapter
- NestJS 11 with JWT (Passport) authentication
- React 19 with Tailwind CSS v4
- All code must pass lint, typecheck, and tests
- TDD: Write failing test first, then implement
- Frequent commits with conventional commit messages

## Review Focus

1. **Concurrent ticket updates** — Two agents updating the same ticket simultaneously should not lose data (use optimistic locking or last-write-wins with clear semantics)
2. **SLA deadline calculation edge cases** — Priority changes after creation should recalculate deadlines correctly
3. **Empty queue states** — Dashboard should handle zero tickets gracefully
4. **Invalid status transitions** — Cannot go from RESOLVED back to OPEN without proper authorization
5. **Comment visibility** — Internal comments must never be exposed to CLIENT role users

---

### Task 1: Initialize Nx Workspace & Base Configuration

**Files:**
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/main.ts`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `docker-compose.dev.yml`
- Create: `.env.example`
- Test: `apps/api/src/app.controller.spec.ts`

**Interfaces:**
- Consumes: None
- Produces: Running Nx workspace with `pnpm dev` starting both API (port 3001) and Web (port 3000)

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/app.controller.spec.ts
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule', () => {
  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    expect(module).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test api`
Expected: FAIL with "Cannot find module './app.module'"

- [ ] **Step 3: Create base NestJS app structure**

Create `apps/api/src/app.module.ts` with ConfigModule for env vars.
Create `apps/api/src/main.ts` with global prefix `/api` and CORS enabled for web origin.

- [ ] **Step 4: Create base React app structure**

Create `apps/web/src/main.tsx` with React 19 createRoot.
Create `apps/web/src/App.tsx` with placeholder "Aponta" heading.

- [ ] **Step 5: Create docker-compose.dev.yml and .env.example**

PostgreSQL 16, API, Web services. Environment: DATABASE_URL, JWT_SECRET, API_PORT=3001, WEB_PORT=3000.

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm nx test api`
Expected: PASS

- [ ] **Step 7: Verify dev environment**

Run: `pnpm dev` (should start API on 3001 and Web on 3000)
Expected: Both services start without errors

- [ ] **Step 8: Commit**

```bash
git add apps/api/src apps/web/src docker-compose.dev.yml .env.example
git commit -m "feat: initialize Nx workspace with NestJS API and React web"
```

---

### Task 2: Database Schema (Prisma) & Migration

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/0001_init/migration.sql`
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`
- Test: `apps/api/src/prisma/prisma.service.spec.ts`

**Interfaces:**
- Consumes: Task 1 (app module)
- Produces: `PrismaService` injectable, `PrismaModule`, User/ServiceDesk/Ticket/Comment models

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/prisma/prisma.service.spec.ts
import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('should be defined', async () => {
    const module = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();
    const service = module.get<PrismaService>(PrismaService);
    expect(service).toBeDefined();
  });

  it('should connect to database', async () => {
    const module = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();
    const service = module.get<PrismaService>(PrismaService);
    await service.$connect();
    await service.$disconnect();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test api`
Expected: FAIL with "PrismaService not found"

- [ ] **Step 3: Create Prisma schema with all models**

User (id, name, email, password, role), ServiceDesk (id, name), Ticket (id, protocol, title, description, status, priority, requesterId, agentId, serviceDeskId, responseDeadline, resolveDeadline), Comment (id, content, isInternal, ticketId, authorId).
Enums: Role (ADMIN, AGENT, CLIENT), TicketStatus (OPEN, IN_PROGRESS, RESOLVED, CLOSED), TicketPriority (LOW, MEDIUM, HIGH, CRITICAL).

- [ ] **Step 4: Create PrismaService and PrismaModule**

PrismaService extends PrismaClient with onModuleInit ($connect) and onModuleDestroy ($disconnect).

- [ ] **Step 5: Run migration**

Run: `pnpm nx run api:prisma-migrate`
Expected: Migration applied, schema.prisma synced

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm nx test api`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma apps/api/src/prisma
git commit -m "feat: add Prisma schema with User, ServiceDesk, Ticket, Comment models"
```

---

### Task 3: Authentication (JWT + Local Strategy)

**Files:**
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/jwt.strategy.ts`
- Create: `apps/api/src/auth/local.strategy.ts`
- Create: `apps/api/src/auth/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/auth/guards/roles.guard.ts`
- Create: `apps/api/src/auth/decorators/roles.decorator.ts`
- Create: `apps/api/src/users/users.module.ts`
- Create: `apps/api/src/users/users.service.ts`
- Create: `apps/api/src/users/dto/create-user.dto.ts`
- Test: `apps/api/src/auth/auth.service.spec.ts`
- Test: `apps/api/src/auth/auth.controller.spec.ts`

**Interfaces:**
- Consumes: Task 2 (PrismaService)
- Produces: `AuthService.validateUser()`, `AuthService.login()`, `JwtAuthGuard`, `RolesGuard`, `@Roles()` decorator

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/auth/auth.service.spec.ts
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  it('should validate user with correct credentials', async () => {
    // Test implementation
  });

  it('should return JWT token on login', async () => {
    // Test implementation
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test api`
Expected: FAIL with "AuthService not found"

- [ ] **Step 3: Implement UsersService with bcrypt password hashing**

- [ ] **Step 4: Implement AuthService with validateUser and login**

- [ ] **Step 5: Implement JWT Strategy and Guards**

- [ ] **Step 6: Implement AuthController with POST /auth/login and POST /auth/register**

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm nx test api`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/auth apps/api/src/users
git commit -m "feat: add JWT authentication with local strategy"
```

---

### Task 4: Service Desk (Mesas) CRUD

**Files:**
- Create: `apps/api/src/service-desks/service-desks.module.ts`
- Create: `apps/api/src/service-desks/service-desks.service.ts`
- Create: `apps/api/src/service-desks/service-desks.controller.ts`
- Create: `apps/api/src/service-desks/dto/create-service-desk.dto.ts`
- Create: `apps/api/src/service-desks/dto/update-service-desk.dto.ts`
- Test: `apps/api/src/service-desks/service-desks.service.spec.ts`

**Interfaces:**
- Consumes: Task 2 (PrismaService), Task 3 (JwtAuthGuard, RolesGuard)
- Produces: `ServiceDesksService.create()`, `findAll()`, `findOne()`, `update()`, `remove()`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/service-desks/service-desks.service.spec.ts
import { Test } from '@nestjs/testing';
import { ServiceDesksService } from './service-desks.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ServiceDesksService', () => {
  it('should create a service desk', async () => {
    // Test implementation
  });

  it('should list all service desks', async () => {
    // Test implementation
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test api`
Expected: FAIL

- [ ] **Step 3: Implement ServiceDesksService with CRUD operations**

- [ ] **Step 4: Implement ServiceDesksController with REST endpoints**

POST /service-desks (ADMIN only), GET /service-desks, GET /service-desks/:id, PATCH /service-desks/:id (ADMIN only), DELETE /service-desks/:id (ADMIN only)

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm nx test api`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/service-desks
git commit -m "feat: add Service Desk (Mesas) CRUD with admin-only mutations"
```

---

### Task 5: Ticket Management Core

**Files:**
- Create: `apps/api/src/tickets/tickets.module.ts`
- Create: `apps/api/src/tickets/tickets.service.ts`
- Create: `apps/api/src/tickets/tickets.controller.ts`
- Create: `apps/api/src/tickets/dto/create-ticket.dto.ts`
- Create: `apps/api/src/tickets/dto/update-ticket.dto.ts`
- Create: `apps/api/src/tickets/dto/ticket-query.dto.ts`
- Test: `apps/api/src/tickets/tickets.service.spec.ts`
- Test: `apps/api/src/tickets/tickets.controller.spec.ts`

**Interfaces:**
- Consumes: Task 2 (PrismaService), Task 3 (JwtAuthGuard, RolesGuard, @Roles), Task 4 (ServiceDesksService)
- Produces: `TicketsService.create()`, `findAll()`, `findOne()`, `update()`, `assign()`, `changeStatus()`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/tickets/tickets.service.spec.ts
import { Test } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TicketsService', () => {
  it('should create ticket with auto-calculated SLA deadlines', async () => {
    // Test implementation
  });

  it('should list tickets filtered by serviceDeskId and status', async () => {
    // Test implementation
  });

  it('should not allow CLIENT to see other users tickets', async () => {
    // Test implementation
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test api`
Expected: FAIL

- [ ] **Step 3: Implement SLA calculation logic**

CRITICAL: 1h response, 4h resolve. HIGH: 4h response, 8h resolve. MEDIUM: 8h response, 24h resolve. LOW: 24h response, 72h resolve.

- [ ] **Step 4: Implement TicketsService with create, findAll, findOne, update, assign, changeStatus**

Generate protocol: `AP-YYYY-NNNN` (auto-increment per year).

- [ ] **Step 5: Implement TicketsController with role-based access**

CLIENT: create, read own. AGENT: read all (filtered by serviceDesk), update, assign. ADMIN: all.

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm nx test api`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/tickets
git commit -m "feat: add Ticket management with SLA calculation and role-based access"
```

---

### Task 6: Ticket Comments (Timeline)

**Files:**
- Create: `apps/api/src/comments/comments.module.ts`
- Create: `apps/api/src/comments/comments.service.ts`
- Create: `apps/api/src/comments/comments.controller.ts`
- Create: `apps/api/src/comments/dto/create-comment.dto.ts`
- Test: `apps/api/src/comments/comments.service.spec.ts`

**Interfaces:**
- Consumes: Task 2 (PrismaService), Task 3 (JwtAuthGuard), Task 5 (TicketsService)
- Produces: `CommentsService.create()`, `findByTicket()`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/comments/comments.service.spec.ts
import { Test } from '@nestjs/testing';
import { CommentsService } from './comments.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CommentsService', () => {
  it('should create comment on ticket', async () => {
    // Test implementation
  });

  it('should filter internal comments for CLIENT role', async () => {
    // Test implementation
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test api`
Expected: FAIL

- [ ] **Step 3: Implement CommentsService with create and findByTicket**

- [ ] **Step 4: Implement CommentsController with POST /tickets/:id/comments**

Internal flag only settable by AGENT/ADMIN. CLIENT never sees internal comments.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm nx test api`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/comments
git commit -m "feat: add Ticket comments (timeline) with internal note visibility"
```

---

### Task 7: Web - Authentication Pages & Layout

**Files:**
- Create: `apps/web/src/pages/LoginPage.tsx`
- Create: `apps/web/src/pages/RegisterPage.tsx`
- Create: `apps/web/src/components/layout/AppLayout.tsx`
- Create: `apps/web/src/components/layout/Sidebar.tsx`
- Create: `apps/web/src/stores/authStore.ts`
- Create: `apps/web/src/lib/api.ts`
- Test: `apps/web/src/pages/LoginPage.test.tsx`

**Interfaces:**
- Consumes: Task 3 (API auth endpoints)
- Produces: `useAuthStore` (Zustand), `api` (Axios instance with interceptors), `AppLayout` component

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/pages/LoginPage.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('should render login form', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('should call login on submit', () => {
    // Test implementation
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test web`
Expected: FAIL

- [ ] **Step 3: Create authStore with Zustand (token, user, login, logout)**

- [ ] **Step 4: Create api.ts with Axios instance, JWT interceptor, error handling**

- [ ] **Step 5: Create LoginPage and RegisterPage with react-hook-form + zod validation**

- [ ] **Step 6: Create AppLayout with Sidebar navigation**

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm nx test web`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/pages/LoginPage.tsx apps/web/src/pages/RegisterPage.tsx apps/web/src/components/layout apps/web/src/stores/authStore.ts apps/web/src/lib/api.ts
git commit -m "feat: add web authentication pages and app layout"
```

---

### Task 8: Web - Dashboard (Queue View)

**Files:**
- Create: `apps/web/src/pages/DashboardPage.tsx`
- Create: `apps/web/src/components/tickets/TicketList.tsx`
- Create: `apps/web/src/components/tickets/TicketCard.tsx`
- Create: `apps/web/src/components/tickets/TicketFilters.tsx`
- Create: `apps/web/src/hooks/useTickets.ts`
- Test: `apps/web/src/pages/DashboardPage.test.tsx`

**Interfaces:**
- Consumes: Task 5 (API tickets endpoints), Task 7 (AppLayout, authStore)
- Produces: `useTickets` hook (Tanstack Query), `TicketList` component

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/pages/DashboardPage.test.tsx
import { render, screen } from '@testing-library/react';
import { DashboardPage } from './DashboardPage';

describe('DashboardPage', () => {
  it('should render ticket list', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/tickets/i)).toBeInTheDocument();
  });

  it('should show empty state when no tickets', () => {
    // Test implementation
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test web`
Expected: FAIL

- [ ] **Step 3: Create useTickets hook with Tanstack Query**

- [ ] **Step 4: Create TicketList and TicketCard components with status/priority badges**

- [ ] **Step 5: Create TicketFilters (serviceDesk, status, priority)**

- [ ] **Step 6: Create DashboardPage integrating all components**

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm nx test web`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/pages/DashboardPage.tsx apps/web/src/components/tickets apps/web/src/hooks/useTickets.ts
git commit -m "feat: add dashboard with ticket queue and filters"
```

---

### Task 9: Web - Ticket Detail & Comments

**Files:**
- Create: `apps/web/src/pages/TicketDetailPage.tsx`
- Create: `apps/web/src/components/tickets/TicketDetail.tsx`
- Create: `apps/web/src/components/tickets/TicketComments.tsx`
- Create: `apps/web/src/components/tickets/CommentForm.tsx`
- Create: `apps/web/src/hooks/useTicket.ts`
- Test: `apps/web/src/pages/TicketDetailPage.test.tsx`

**Interfaces:**
- Consumes: Task 5 (API tickets), Task 6 (API comments), Task 7 (AppLayout), Task 8 (useTickets)
- Produces: `useTicket` hook, `TicketDetail` component, `TicketComments` component

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/pages/TicketDetailPage.test.tsx
import { render, screen } from '@testing-library/react';
import { TicketDetailPage } from './TicketDetailPage';

describe('TicketDetailPage', () => {
  it('should render ticket details', () => {
    // Test implementation
  });

  it('should show comment form for agents', () => {
    // Test implementation
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test web`
Expected: FAIL

- [ ] **Step 3: Create useTicket hook for single ticket fetch**

- [ ] **Step 4: Create TicketDetail with status/priority/SLA display**

- [ ] **Step 5: Create TicketComments timeline with internal note indicator**

- [ ] **Step 6: Create CommentForm with isInternal checkbox (agents only)**

- [ ] **Step 7: Create TicketDetailPage with routing**

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm nx test web`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/pages/TicketDetailPage.tsx apps/web/src/components/tickets/TicketDetail.tsx apps/web/src/components/tickets/TicketComments.tsx apps/web/src/components/tickets/CommentForm.tsx apps/web/src/hooks/useTicket.ts
git commit -m "feat: add ticket detail page with comments timeline"
```

---

### Task 10: Web - Create Ticket Flow

**Files:**
- Create: `apps/web/src/pages/CreateTicketPage.tsx`
- Create: `apps/web/src/components/tickets/TicketForm.tsx`
- Test: `apps/web/src/pages/CreateTicketPage.test.tsx`

**Interfaces:**
- Consumes: Task 5 (API tickets), Task 7 (AppLayout), Task 8 (useTickets)
- Produces: `TicketForm` component, `CreateTicketPage`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/src/pages/CreateTicketPage.test.tsx
import { render, screen } from '@testing-library/react';
import { CreateTicketPage } from './CreateTicketPage';

describe('CreateTicketPage', () => {
  it('should render ticket form', () => {
    render(<CreateTicketPage />);
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test web`
Expected: FAIL

- [ ] **Step 3: Create TicketForm with react-hook-form + zod validation**

Fields: title, description, priority (select), serviceDeskId (select from API).

- [ ] **Step 4: Create CreateTicketPage with form submission and redirect**

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm nx test web`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/CreateTicketPage.tsx apps/web/src/components/tickets/TicketForm.tsx
git commit -m "feat: add create ticket page with form validation"
```

---

### Task 11: E2E Tests (Playwright)

**Files:**
- Create: `apps/web-e2e/src/auth.spec.ts`
- Create: `apps/web-e2e/src/tickets.spec.ts`
- Create: `apps/web-e2e/src/dashboard.spec.ts`

**Interfaces:**
- Consumes: All previous tasks (full stack)
- Produces: E2E test suite covering auth, ticket CRUD, dashboard

- [ ] **Step 1: Write E2E test for authentication flow**

```typescript
// apps/web-e2e/src/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can login and see dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'agent@aponta.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

- [ ] **Step 2: Write E2E test for ticket creation and viewing**

- [ ] **Step 3: Write E2E test for dashboard filtering**

- [ ] **Step 4: Run E2E tests**

Run: `pnpm nx e2e web-e2e`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/web-e2e/src
git commit -m "test: add E2E tests for auth, tickets, and dashboard"
```

---

### Task 12: Docker & CI Configuration

**Files:**
- Modify: `docker-compose.yml` (production)
- Create: `Dockerfile` (production)
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: All previous tasks
- Produces: Production-ready Docker images and CI pipeline

- [ ] **Step 1: Create production Dockerfile (multi-stage: build → runtime)**

- [ ] **Step 2: Update docker-compose.yml for production**

- [ ] **Step 3: Create GitHub Actions CI workflow**

Lint, typecheck, test (unit + e2e), build.

- [ ] **Step 4: Verify CI passes**

- [ ] **Step 5: Commit**

```bash
git add Dockerfile docker-compose.yml .github/workflows/ci.yml
git commit -m "ci: add production Dockerfile and GitHub Actions workflow"
```

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-09-29-aponta-mvp-plan.md`. Please review the plan. Which execution approach would you prefer?**

- **Subagent-driven** - A fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end. Most thorough; costs a fresh context per task and per review.
- **Native** - I implement every task myself in this session, the way this harness runs work, then one fresh reviewer on the most capable model checks the whole branch. Cheapest and fastest; no independent review until the end. Runs well with a mid-tier session model, since the plan carries the design.

**For this plan I recommend Subagent-driven**, because the tasks have clear interfaces between them (each task produces services/hooks that later tasks consume), and a fresh reviewer per task catches interface mismatches early. Does the plan capture what you want, and which approach should we use?