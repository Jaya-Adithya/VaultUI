# 🔐 Vault Test Intelligence (VTI)
Automated Component Testing, Auto-Story Generation & Quality Intelligence for VaultUI

---

## 0️⃣ WHAT THIS DOCUMENT IS

This README is a **single source of truth** for building a **fully automated, self-testing component vault** on top of **VaultUI**.

A senior engineer should be able to implement the **entire system end-to-end** using only this document.

This covers:
- Product Requirements (PRD)
- System Architecture
- Auto Story Generation
- Full Testing Pipeline (ALL types)
- Database & Backend changes
- UI/UX behavior
- CI/CD integration
- Execution TODO checklist

**All tools are FREE & Open Source.**

---

## 1️⃣ PRODUCT REQUIREMENT DOCUMENT (PRD)

### Product Name
**Vault Test Intelligence (VTI)**

### Problem
VaultUI currently:
- Has no automated quality signal
- Relies on manual testing
- Cannot detect regressions
- Cannot guarantee component safety

### Goal
Transform VaultUI into a **trustable component system** where:
- Stories are auto-generated
- Tests run automatically on every version
- Every component has a quality score
- Failures are visible and actionable

---

## 2️⃣ CORE PRINCIPLES

1. Storybook is the **single source of truth**
2. Stories are **auto-generated**
3. Every story is a **test case**
4. All testing is **component-first**
5. No paid tools
6. AI assists but never executes tests

---

## 3️⃣ HIGH-LEVEL ARCHITECTURE

Component Code
↓
Framework Detection (existing)
↓
Auto Story Generator
↓
Storybook Runtime
↓
Test Orchestrator
├─ Logic Tests (Vitest)
├─ Component Tests
├─ Visual Regression (Playwright)
├─ Responsive Tests
├─ Accessibility (axe)
├─ Functional Tests
└─ Mutation Tests (Stryker)
↓
Test Result Normalizer
↓
Vault Database
↓
Vault UI (Quality Dashboard)

yaml
Copy code

---

## 4️⃣ AUTO STORY GENERATION SYSTEM

### Why Auto Stories
Stories power:
- Documentation
- Visual baselines
- Test inputs
- Regression detection

Manual stories are **not scalable**.

---

### Strategy (Production-Grade)

**Hybrid deterministic approach**

| Layer | Responsibility |
|---|---|
| Type/AST Parsing | Guaranteed correctness |
| Rule Engine | Known UI patterns |
| Optional AI | Edge & creative cases |

---

### Inputs
- TypeScript props
- Zod schemas
- Default exports
- Framework type (React / Vue / HTML)

---

### Outputs (per component)
- Primary state
- Variant states (enum, size, theme)
- Disabled / loading
- Empty / invalid (negative)
- Overflow / long content

---

### Location
src/lib/story-generator/
├─ parse-props.ts
├─ rules.ts
├─ generate-stories.ts
└─ templates/

yaml
Copy code

---

### Example Generated Story
```ts
export const Primary = {
  args: { label: "Button" }
};

export const Disabled = {
  args: { label: "Button", disabled: true }
};

export const Invalid = {
  args: { label: "" }
};
Storage Model
Stories are generated at save time

Stored as artifacts

Not committed unless user edits manually

5️⃣ TESTING PIPELINE (FULL)
5.1 Logic & Component Tests
Vitest + Testing Library

Renders every story

Detects crashes

Validates logic

Covers positive & negative cases

5.2 Visual Regression
Storybook Test Runner + Playwright

Screenshot per story

Multiple viewports

Pixel diff threshold

Baseline stored per version

Artifacts:

bash
Copy code
/vault-artifacts/{componentId}/{version}/visual/
5.3 Responsive Testing
Viewports:

Mobile (360px)

Tablet (768px)

Desktop (1440px)

Checks:

Overflow

Hidden content

Layout shifts

5.4 Accessibility Testing
axe-core

Detects:

ARIA issues

Contrast failures

Keyboard traps

Outputs JSON violations.

5.5 Functional Testing
Playwright

Click

Input

Submit

Async state handling

Uses:

bash
Copy code
/iframe.html?id=component--story
5.6 Mutation Testing
Stryker

Injects faults

Ensures tests fail correctly

Produces mutation score

6️⃣ QUALITY SCORING MODEL
Metric	Weight
Logic coverage	20%
Visual regression	20%
Responsive	15%
Accessibility	15%
Functional	15%
Mutation score	15%

Status Mapping
🟢 Ready (≥ 85)

🟡 Experimental (70–84)

🔴 Unsafe (< 70)

7️⃣ DATABASE CHANGES (PRISMA)
prisma
Copy code
model ComponentTestReport {
  id              String   @id @default(uuid())
  componentId     String
  versionId       String
  score           Int
  logicPass       Boolean
  visualPass      Boolean
  responsivePass  Boolean
  a11yPass        Boolean
  mutationScore   Int
  createdAt       DateTime @default(now())
}
8️⃣ VAULT UI / UX BEHAVIOR
Component Card
Quality badge

Last tested timestamp

Failing test icons

Component Detail → Tests Tab
Tabs:

Summary

Visual Diffs

Accessibility Issues

Mutation Report

Raw Logs

Version Selector
Copy code
v1.3.0 🟢
v1.2.0 🟡
v1.1.0 🔴
Failure UX
Side-by-side diff

Slider comparison

Click → open failing story

9️⃣ CI / EXECUTION FLOW
Local (WebContainer)
Runs identical pipeline

Isolated execution

Deterministic output

CI (GitHub Actions)
Runs on PR

Blocks merge if score < threshold

Stores artifacts

🔟 AI ASSIST (OPTIONAL)
AI is used ONLY to:

Generate edge cases

Suggest missing stories

Summarize failures

AI NEVER executes tests.

Supported:

Local LLM (Ollama)

External APIs (optional)

1️⃣1️⃣ EXECUTION TODO CHECKLIST
Phase 1 – Foundation
 Story generator engine

 Internal Storybook runtime

 Test orchestrator

 Artifact storage

 DB schema

Phase 2 – Testing
 Logic tests

 Visual regression

 Responsive checks

 Accessibility integration

 Functional flows

Phase 3 – Intelligence
 Mutation testing

 Quality scoring

 Vault UI dashboards

 Failure explorer

Phase 4 – AI Assist
 Edge case generation

 Failure summarization

 Missing test detection

1️⃣2️⃣ FINAL OUTCOME
VaultUI becomes:

Self-testing

Regression-proof

Quality-scored

Enterprise-grade

Trustable at scale

This is how real internal design systems work.


🔐 Vault Test Intelligence (VTI) — Deep Dive & Implementation Blueprint

This document assumes VaultUI (Next.js + tRPC + Prisma) as the base. It expands each VTI subsystem into executable artifacts: code snippets, configs, folder layout, DB schema, CI, and UI integration.

Table of contents

Folder layout (complete)

Component Analyzer (AST / type parsing)

Auto-Story Generator (engine + templates)

Storybook runtime & config

Test Orchestrator Service (architecture + code)

Test Runners (Vitest / Playwright / axe / Stryker)

Artifact storage & format

DB schema & tRPC endpoints

Vault UI changes (Test Tab, badges, explorer)

CI (GitHub Actions) — PR + nightly

Quality scoring algorithm (detailed)

Rollout, monitoring, metrics

Security, scaling, retention

Troubleshooting & test-of-tests

Appendix: configs & examples

Reference: Vibe Checklist (uploaded). 

Vibe Coding Checklist

1. Folder layout (canonical)
/src
 ├─ lib/
 │   ├─ story-generator/
 │   │   ├─ parse-props.ts
 │   │   ├─ rules.ts
 │   │   ├─ templates/
 │   │   ├─ generate-stories.ts
 │   │   └─ index.ts
 │   ├─ test-orchestrator/
 │   │   ├─ orchestrator.ts
 │   │   ├─ runner-interfaces.ts
 │   │   └─ worker.ts
 │   └─ preview-runtime-generator.ts
 ├─ server/
 │   ├─ routers/
 │   │   ├─ testReports.ts
 │   │   └─ components.ts
 │   └─ workers/
 │       └─ test-worker.ts
 ├─ pages/ (or app/)
 ├─ components/
 │   ├─ TestTab/
 │   │   ├─ TestSummary.tsx
 │   │   ├─ VisualDiffViewer.tsx
 │   │   └─ TestBadge.tsx
 └─ tests/
     └─ playwright/
         ├─ config.ts
         └─ story-runner.spec.ts

2. Component Analyzer (AST / Type parsing)
Goals

Extract prop metadata (name, type, default, JSDoc)

Extract validation schema (zod) if present

Detect exported component type (FC/class)

Gather sample data hints (prop names like url, label, items)

Tools

ts-morph — AST read/write

react-docgen-typescript — prop parsing fallback

zod-to-ts / zod introspection if using zod

Example: parse-props.ts (core)
// src/lib/story-generator/parse-props.ts
import { Project, ts } from "ts-morph";
import { parse } from "react-docgen-typescript";

export function extractProps(filePath: string) {
  const project = new Project({ tsConfigFilePath: "tsconfig.json" });
  const source = project.getSourceFileOrThrow(filePath);

  // attempt zod detection
  // fallback to react-docgen
  const result = parse(filePath, { savePropValueAsString: true });
  if (result.length) {
    const comp = result[0];
    const props = Object.entries(comp.props).map(([name, meta]) => ({
      name,
      type: meta.type.name,
      required: meta.required,
      defaultValue: meta.defaultValue && meta.defaultValue.value,
      description: meta.description
    }));
    return props;
  }

  // fallback AST approach: very small example
  const exported = source.getExportedDeclarations();
  // ...walk AST to get prop types
  return [];
}

3. Auto-Story Generator
Design

Deterministic base stories generated from prop metadata

Rule engine applies patterns (e.g., strings -> empty/long; booleans -> true/false; enums -> each enum value)

Optional AI enhancer step (LLM) to suggest extra scenarios (loading, error, weird data)

Rules (sample)

string → "" (Empty), longText (Overflow), normal

boolean → true, false

number → 0, 100, -1 (if signed)

enum → each enum option

array → [], [singleItem], [manyItems]

zod.string().email() → invalid + valid email

onClick props → simulate clicks in Playwright tests

Generator entrypoint (generate-stories.ts)
// simplified
import { extractProps } from "./parse-props";
import { writeFileSync } from "fs";
import { buildStoryContent } from "./templates";

export async function generateStoriesForComponent(componentPath: string, outPath: string) {
  const props = extractProps(componentPath);
  const stories = [];
  // primary
  stories.push(buildStoryContent("Primary", primaryArgs(props)));
  // variants
  for (const prop of props) {
    stories.push(...generateVariantsForProp(prop));
  }
  writeFileSync(outPath, wrapWithStorybookTemplate(stories));
}

Story template example (templates/default.ts)
export function wrapWithStorybookTemplate(stories: string[]) {
  return `import React from "react";
import Component from "./Component";
export default { title: "Auto/Component", component: Component };
${stories.join("\n")}
`;
}

Handling multiple frameworks

For Vue/HTML: use heuristics; still generate simple story wrappers (Storybook supports multi-framework)

4. Storybook runtime & config
Storybook config (.storybook/main.ts)
module.exports = {
  framework: "@storybook/react",
  stories: [
    "../src/components/**/*.stories.@(ts|tsx|js|jsx)",
    "../.vault-generated-stories/**/*.stories.@(ts|tsx|js|jsx)"
  ],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions"
  ],
  core: { builder: "storybook-builder-vite" },
};

Preview (.storybook/preview.ts)
export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: { expanded: true },
  viewport: {
    viewports: {
      mobile: { name: "mobile", styles: { width: "360px", height: "800px" } },
      tablet: { name: "tablet", styles: { width: "768px", height: "1024px" } },
      desktop: { name: "desktop", styles: { width: "1440px", height: "900" } }
    }
  }
};

5. Test Orchestrator Service
Purpose

Receive a "test job" for a component version

Run the pipeline steps (generate stories, run runners, collect artifacts)

Push test report into DB and artifact storage

Support parallelism via worker pool

Implementation pattern

Node.js microservice (inside Next server or separate worker)

Queueing: use BullMQ (Redis) or simple in-process queue in first phase

Workers spawn child processes to run test commands in isolated env (WebContainer or Docker)

Minimal orchestrator (orchestrator.ts)
import { spawnSync } from "child_process";
import { saveTestReport } from "../server/api/saveReport";

export async function runTestJob({ componentId, versionId, storyPaths }) {
  // 1. generate stories (if not already)
  spawnSync("node", ["scripts/generate-stories.js", componentId, versionId]);

  // 2. run unit/component tests
  const vitest = spawnSync("npx", ["vitest", "--run", "--reporter=json"]);
  const vitestOutput = parseVitestOutput(vitest.stdout);

  // 3. run storybook test runner (visual)
  spawnSync("npx", ["storybook", "build", "-c", ".storybook", "-o", "storybook-static"]);
  const pw = spawnSync("npx", ["playwright", "test", "--config=tests/playwright/config.ts"]);
  // parse results & collect artifacts

  // 4. run Stryker
  spawnSync("npx", ["stryker", "run"]);

  // normalize
  const report = normalizeResults(vitestOutput, pw.stdout);
  await saveTestReport(report);

  return report;
}

6. Test Runners & Configs
6.1 Vitest (component/logic)

vitest.config.ts

import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "jsdom", globals: true, setupFiles: ["./tests/setup.ts"] },
});


tests/setup.ts

import "@testing-library/jest-dom";


Vitest runs tests generated from stories by Storybook Test Runner or by the generator creating .test.tsx files that import story args.

6.2 Playwright (visual & functional)

tests/playwright/config.ts

import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/playwright',
  timeout: 60_000,
  use: { headless: true, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium-mobile', use: { ...devices['Pixel 5'] } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
  ],
});


tests/playwright/story-runner.spec.ts

import { test, expect } from '@playwright/test';

test.describe('storybook stories', () => {
  const stories = [
    { id: 'button--primary', viewports: [{w:360,h:800},{w:768,h:1024}] }
  ];

  for (const s of stories) {
    for (const vp of s.viewports) {
      test(`${s.id} @ ${vp.w}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.w, height: vp.h });
        await page.goto(`http://localhost:6006/iframe.html?id=${s.id}`);
        await page.waitForLoadState('networkidle');
        const screenshot = await page.screenshot();
        expect(screenshot).toMatchSnapshot(`${s.id}-${vp.w}.png`);
        // a11y
        const accessibilityScan = await new AxeBuilder({ page }).analyze();
        expect(accessibilityScan.violations.length).toBe(0);
      });
    }
  }
});

6.3 axe-playwright

npm i -D axe-playwright and use inside Playwright tests as above.

6.4 Stryker (mutation)

stryker.conf.js

module.exports = function(config) {
  config.set({
    mutator: "javascript",
    packageManager: "npm",
    reporters: ["html","clear-text"],
    testRunner: "vitest",
    coverageAnalysis: "off",
    mutate: ["src/components/**/*.ts", "src/lib/**/*.ts"]
  });
};


Run: npx stryker run

7. Artifact storage & format
Storage options

Local filesystem (dev) — /vault-artifacts/...

S3 / object store (prod) — use presigned URLs

DB holds metadata only

Artifact layout (filesystem)
/vault-artifacts/{componentId}/{version}/
  - report.json
  - visual/
      - button--primary-360.png
      - diffs/
  - logs/
      - vitest.log
      - playwright.log
  - mutation/
      - stryker-report.json

report.json (schema)
{
  "componentId":"abc",
  "versionId":"v1.2.3",
  "score":87,
  "metrics": {
    "logicCoverage": 78,
    "visualPass": true,
    "responsivePass": true,
    "a11yViolations": 2,
    "mutationScore": 85
  },
  "artifacts": {
    "visualPath": "s3://bucket/abc/v1.2.3/visual/",
    "logs": "s3://bucket/abc/v1.2.3/logs/"
  },
  "createdAt": "2026-01-28T..."
}

8. DB schema & tRPC endpoints
Prisma model (extended)
model Component {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  versions  ComponentVersion[]
}

model ComponentVersion {
  id          String   @id @default(uuid())
  component   Component @relation(fields: [componentId], references: [id])
  componentId String
  number      String
  createdAt   DateTime @default(now())
  report      ComponentTestReport?
}

model ComponentTestReport {
  id            String   @id @default(uuid())
  componentId   String
  versionId     String
  score         Int
  metrics       Json
  artifactsUrl  String?
  createdAt     DateTime @default(now())
}

tRPC endpoints (example)

/server/routers/testReports.ts

import { createRouter } from "../trpc";

export const testReportsRouter = createRouter()
  .query("latestByComponent", {
    input: z.string(),
    resolve: async ({ input }) => {
      // fetch latest report for component
    }
  })
  .mutation("submit", {
    input: z.object({ componentId: z.string(), versionId: z.string(), report: z.any() }),
    resolve: async ({ input }) => {
      // upsert ComponentTestReport
    }
  });

9. Vault UI changes (component level)
New components

TestBadge — small badge rendering 🟢🟡🔴 with tooltip and score

TestSummary — displays last report summary, score breakdown, timestamp

VisualDiffViewer — slider + thumbnails + list of diffs

TestsTab — inside component editor, contains Summary, Visuals, Accessibility, Mutation

React pseudocode: TestBadge.tsx
export function TestBadge({score}:{score:number}) {
  const color = score>=85 ? "green" : score>=70 ? "yellow" : "red";
  return <div className={`badge badge-${color}`}>{score} • VTI</div>
}

Tests Tab layout

Header: score, last run, run now button

Left: timeline of runs

Right: selected run details (visual diff viewer + logs)

Bottom: actions — "Mark as accepted", "Create issue", "Re-run"

Re-run UX

"Run now" triggers POST /api/vti/run → queue job → show progress (WebSocket or polling)

Disable save/publish until run passes baseline if policy requires it

10. CI: GitHub Actions (PR + Nightly)
/.github/workflows/vti.yml
name: VTI Tests
on:
  pull_request:
  schedule:
    - cron: "0 2 * * *" # nightly at 02:00 UTC

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with: node-version: "20"
      - name: Install
        run: npm ci
      - name: Build Storybook
        run: npm run build-storybook
      - name: Run Vitest
        run: npx vitest --run --reporter json > vitest-output.json
      - name: Run Playwright (visual)
        run: |
          npx playwright install --with-deps
          npx playwright test --config=tests/playwright/config.ts --reporter=json > playwright-output.json
      - name: Run Stryker
        run: npx stryker run --logLevel info || true
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: vti-artifacts
          path: vault-artifacts/**
      - name: Post report
        run: |
          node scripts/post-report.js vitest-output.json playwright-output.json


For PRs, run a fast subset: only changed components’ primary stories + smoke visual checks.

For nightly, run full matrix.

11. Quality scoring algorithm (detailed)
Raw metrics collected

logicCoverage (0–100) — code coverage from Vitest for the component files

visualPass (boolean) — all primary snapshots diff < threshold

visualScore (0–100) — average pixel similarity

responsivePass (boolean)

a11yViolations (count) → converted to a11yScore = max(0, 100 - 10 * violations)

mutationScore (0–100)

Combining

Pseudocode:

const finalScore = Math.round(
  logicCoverage*0.2 +
  visualScore*0.2 +
  (responsivePass ? 100 : 0)*0.15 +
  a11yScore*0.15 +
  functionalScore*0.15 +
  mutationScore*0.15
);


functionalScore derived from Playwright pass ratio (0–100)

If critical a11y violation (e.g., missing label), immediate penalty of -20 points

Thresholds & gating

PR gating threshold: 70

Recommended production threshold: 85

Mutation score recommended minimum: 60

12. Rollout plan & timelines
Phase A — Internal alpha (2 weeks)

Implement generator + Storybook integration (local)

Run Vitest smoke on primary stories

Expose TestBadge in dev dashboard

Phase B — Beta (4 weeks)

Add Playwright visual snapshots + responsive

Build orchestrator + artifact store (local fs or S3)

Add tRPC endpoint to store ComponentTestReport

Phase C — Production (6–8 weeks)

Add mutation testing + quality scoring

Implement CI gating for PRs + nightly full runs

UI: TestTab + VisualDiffViewer + run-on-demand

Monitoring & alerts

13. Monitoring, metrics & alerts
Metrics to collect

Jobs per hour

Job failure rate

Average run time

Artifact size (per component)

Last green per component

Test flakiness (fail/pass toggle rate)

Alerts

If job failure rate > 5% in last 24h → Slack + email

If avg run time > expected by 30% → perf alert

Tools

Prometheus / Grafana (self-host)

Sentry for orchestrator errors

Slack webhook for job failures

14. Security & scaling
Isolation

Run tests in sandboxed environment:

WebContainer for in-browser builds OR

Docker containers (recommended for CI)

Avoid running untrusted code on main host

Resource limits

Limit CPU/Memory per worker

Timeout per job (e.g., 15 minutes)

Auth

tRPC endpoints require auth (only permitted roles can trigger re-runs)

Component owners receive notification when tests fail

Scaling

Worker autoscaling with K8s / ECS using queue length as metric

Artifact storage in S3 with lifecycle policy (30 days -> archive)

15. Retention & cleanup

Keep latest 5 reports per component version

Keep latest 30 reports across versions

Nightly cleanup job to remove old artifacts

Optionally store compressed diffs (not all images)

16. Troubleshooting & test-of-tests
Common failure modes

Snapshot drift: Baseline outdated — provide "Approve baseline" UX

Flaky Playwright: Add retries (1-2) and investigate flakiness metric

Stryker long runs: Run mutation only nightly; PR runs only smoke mutation test

A11y false positives: Mark as suppressed with reason (audit needed)

Test-of-tests

Add meta-tests to validate the pipeline: small set of known components with synthetic failures to ensure failures are detected

Example: sample component vti-selftest that intentionally fails visual and a11y tests — orchestrator must surface those failures

17. Examples & code snippets (Appendix)
Script: scripts/generate-stories.js
#!/usr/bin/env node
const { generateStoriesForComponent } = require("../src/lib/story-generator/generate-stories");
const [,, componentPath, outPath] = process.argv;
generateStoriesForComponent(componentPath, outPath).then(()=>console.log("done"));

Script: scripts/post-report.js

Parses outputs and calls the tRPC endpoint to store a report.

Playwright snapshot matcher config

Use expect.toMatchSnapshot() from Playwright and store baseline in __snapshots__.

18. Testing the pipeline itself (how to validate)

Create vti-selftest component with known outcomes:

Visual: intentionally different color

A11y: missing label

Logic: crash on null prop

Run orchestrator locally and assert:

report.score < 70

artifacts present

DB entry created

19. Operational checklist (daily/weekly)

Daily

Check pending jobs queue

Check failing jobs and triage

Weekly

Review flakiness metrics

Re-baseline approved snapshots if intentionally changed

20. Final notes — policy & governance

Define owner for each component collection

Require owner approval for baseline changes

Provide "override reason" when marking test failures as accepted

Appendix: Quick-Start Commands
# dev deps
npm i -D ts-morph react-docgen-typescript vitest @testing-library/react @playwright/test axe-playwright stryker @stryker-mutator/core

# run storybook (local)
npm run storybook

# generate stories for one component
node scripts/generate-stories.js src/components/Button/Button.tsx ./.vault-generated-stories/Button.stories.tsx

# run vitest
npx vitest

# run playwright
npx playwright install --with-deps
npx playwright test

# run stryker
npx stryker run