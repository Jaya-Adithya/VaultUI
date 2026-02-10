🔐 Vault Test Intelligence (VTI) — Playwright Agents + Visual Regression Testing

This document provides a complete implementation blueprint for automated testing of VaultUI components using Playwright Test Agents (2026 standard) combined with Vitest visual regression testing. All components are tested through the existing preview system.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Folder Structure](#folder-structure)
3. [Test Flow & Pipeline](#test-flow--pipeline)
4. [Playwright Test Agents Integration](#playwright-test-agents-integration)
5. [Component Test Generator](#component-test-generator)
6. [Visual Regression Testing](#visual-regression-testing)
7. [Accessibility Testing](#accessibility-testing)
8. [Test Orchestrator](#test-orchestrator)
9. [Database Schema](#database-schema)
10. [tRPC Endpoints](#trpc-endpoints)
11. [UI Integration](#ui-integration)
12. [CI/CD Integration](#cicd-integration)
13. [Quality Scoring](#quality-scoring)
14. [Artifact Storage](#artifact-storage)
15. [Implementation Details](#implementation-details)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Vault Test Intelligence                   │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌────────────────────┼────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Planner     │───▶│   Generator    │───▶│    Healer     │
│   Agent       │    │   Agent        │    │   Agent       │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Test Orchestrator│
                    └──────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Playwright  │    │     Vitest     │    │  Accessibility│
│   Functional  │    │   Visual Reg   │    │     (axe)     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Test Reports DB  │
                    └──────────────────┘
```

### Key Components

1. **Playwright Test Agents**: AI-powered test generation, planning, and healing
2. **Vitest Visual Regression**: Screenshot comparison across browsers/devices
3. **Test Orchestrator**: Coordinates all test runners and collects results
4. **Component Test Generator**: Creates test suites from component metadata
5. **Artifact Storage**: Stores screenshots, diffs, logs, and reports

---

## Folder Structure

```
/src
├── lib/
│   ├── test-intelligence/
│   │   ├── component-analyzer.ts      # Extract component metadata
│   │   ├── test-generator.ts          # Generate test suites
│   │   ├── playwright-agents.ts      # Playwright agents integration
│   │   └── test-orchestrator.ts       # Main orchestrator
│   ├── test-runners/
│   │   ├── playwright-runner.ts      # Playwright test execution
│   │   ├── vitest-visual-runner.ts    # Vitest visual regression
│   │   └── accessibility-runner.ts     # axe-core integration
│   └── preview-runtime-generator.ts   # Existing preview system
│
├── server/
│   ├── api/
│   │   └── routers/
│   │       ├── testReports.ts          # tRPC endpoints for test reports
│   │       └── testRunner.ts          # tRPC endpoints for running tests
│   └── workers/
│       └── test-worker.ts              # Background test execution
│
├── components/
│   ├── TestTab/
│   │   ├── TestSummary.tsx            # Test results summary
│   │   ├── VisualDiffViewer.tsx       # Visual diff comparison
│   │   ├── TestBadge.tsx              # Component test status badge
│   │   ├── TestTimeline.tsx           # Test run history
│   │   └── TestRunner.tsx             # Manual test trigger
│   └── editor/
│       └── playground.tsx              # Existing editor (add test tab)
│
├── tests/
│   ├── playwright/
│   │   ├── config.ts                   # Playwright configuration
│   │   ├── fixtures/
│   │   │   └── component-fixture.ts    # Component test fixtures
│   │   ├── agents/
│   │   │   ├── planner.ts              # Planner agent setup
│   │   │   ├── generator.ts            # Generator agent setup
│   │   │   └── healer.ts               # Healer agent setup
│   │   └── generated/                 # Auto-generated test files
│   │       └── [component-id].spec.ts
│   │
│   ├── vitest/
│   │   ├── config.ts                   # Vitest configuration
│   │   ├── visual-regression.ts        # Visual test utilities
│   │   └── setup.ts                    # Test setup
│   │
│   └── utils/
│       ├── component-loader.ts         # Load component from DB
│       ├── preview-helper.ts           # Preview URL generation
│       └── test-helpers.ts            # Common test utilities
│
└── app/
    └── api/
        └── test/
            └── preview/
                └── [componentId]/
                    └── route.ts        # Test preview endpoint
```

---

## Test Flow & Pipeline

### Complete Test Execution Flow

```
1. Component Saved/Updated
   │
   ├─▶ Trigger Test Job (via tRPC or webhook)
   │
2. Test Orchestrator Receives Job
   │
   ├─▶ Component Analyzer
   │   ├─ Extract component code
   │   ├─ Parse props/types
   │   ├─ Detect framework
   │   └─ Identify test scenarios
   │
3. Playwright Agents Pipeline
   │
   ├─▶ Planner Agent
   │   ├─ Analyze component structure
   │   ├─ Identify user interactions
   │   ├─ Generate test plan (Markdown)
   │   └─ Output: test-plan.md
   │
   ├─▶ Generator Agent
   │   ├─ Read test plan
   │   ├─ Generate Playwright test code
   │   ├─ Create test scenarios
   │   └─ Output: [component-id].spec.ts
   │
   ├─▶ Test Execution
   │   ├─ Run generated tests
   │   ├─ Capture screenshots
   │   ├─ Record interactions
   │   └─ Collect results
   │
   ├─▶ Healer Agent (if failures)
   │   ├─ Analyze failure
   │   ├─ Update selectors
   │   ├─ Fix test code
   │   └─ Re-run tests
   │
4. Visual Regression Testing
   │
   ├─▶ Vitest Visual Runner
   │   ├─ Load component preview
   │   ├─ Capture screenshots (multiple viewports)
   │   ├─ Compare with baseline
   │   ├─ Generate diff images
   │   └─ Calculate similarity score
   │
5. Accessibility Testing
   │
   ├─▶ axe-core Runner
   │   ├─ Load component preview
   │   ├─ Run accessibility scan
   │   ├─ Detect violations
   │   └─ Generate report
   │
6. Results Aggregation
   │
   ├─▶ Test Orchestrator
   │   ├─ Combine all results
   │   ├─ Calculate quality score
   │   ├─ Store artifacts
   │   └─ Save to database
   │
7. UI Update
   │
   └─▶ Update TestTab component
       ├─ Display results
       ├─ Show visual diffs
       └─ Update badges
```

### Test Trigger Points

1. **Manual Trigger**: User clicks "Run Tests" in TestTab
2. **Auto on Save**: Component version saved → trigger tests
3. **Scheduled**: Nightly full test suite
4. **PR Hook**: GitHub webhook on PR creation
5. **API Call**: External system triggers via tRPC

---

## Playwright Test Agents Integration

### Setup & Configuration

```typescript
// tests/playwright/config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
  ],
  use: {
    baseURL: process.env.PREVIEW_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Planner Agent Implementation

```typescript
// tests/playwright/agents/planner.ts
import { test } from '@playwright/test';
import { generateTestPlan } from '@playwright/test-agents';

export async function planComponentTests(componentId: string, componentCode: string) {
  const plan = await generateTestPlan({
    component: {
      id: componentId,
      code: componentCode,
      framework: detectFramework(componentCode),
    },
    options: {
      includeInteractions: true,
      includeEdgeCases: true,
      includeAccessibility: true,
    },
  });

  return plan;
}

// Usage in test generator
export async function createTestPlan(component: Component) {
  const plan = await planComponentTests(component.id, component.code);
  
  // Save plan to file for Generator agent
  await writeFile(
    `tests/playwright/plans/${component.id}.md`,
    plan.markdown
  );
  
  return plan;
}
```

### Generator Agent Implementation

```typescript
// tests/playwright/agents/generator.ts
import { generateTests } from '@playwright/test-agents';
import { readFile } from 'fs/promises';

export async function generateTestCode(componentId: string, planPath: string) {
  const plan = await readFile(planPath, 'utf-8');
  
  const testCode = await generateTests({
    plan: plan,
    framework: 'playwright',
    options: {
      usePageObjectModel: false, // Simple component tests
      includeAssertions: true,
      includeScreenshots: true,
    },
  });

  return testCode;
}

// Generate test file
export async function createTestFile(component: Component, plan: TestPlan) {
  const testCode = await generateTestCode(component.id, plan.path);
  
  const testFilePath = `tests/playwright/generated/${component.id}.spec.ts`;
  await writeFile(testFilePath, testCode);
  
  return testFilePath;
}
```

### Healer Agent Implementation

```typescript
// tests/playwright/agents/healer.ts
import { healTests } from '@playwright/test-agents';

export async function healFailedTest(
  testFile: string,
  failureReport: TestFailure
) {
  const healedCode = await healTests({
    testFile: testFile,
    failure: failureReport,
    options: {
      updateSelectors: true,
      fixAssertions: true,
      retryLogic: true,
    },
  });

  return healedCode;
}

// Auto-heal on failure
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'failed') {
    const healedCode = await healFailedTest(
      testInfo.file,
      {
        test: testInfo.title,
        error: testInfo.error?.message || '',
        screenshot: testInfo.attachments.find(a => a.name === 'screenshot'),
      }
    );
    
    // Update test file with healed code
    await updateTestFile(testInfo.file, healedCode);
    
    // Re-run the test
    await test.step('Re-run healed test', async () => {
      // Re-execute test
    });
  }
});
```

### Component Test Fixture

```typescript
// tests/playwright/fixtures/component-fixture.ts
import { test as base } from '@playwright/test';
import { Component } from '@/server/db';

type ComponentFixture = {
  component: Component;
  previewUrl: string;
  loadComponent: (componentId: string) => Promise<void>;
};

export const test = base.extend<ComponentFixture>({
  component: async ({}, use, testInfo) => {
    const componentId = testInfo.title.match(/\[(.*?)\]/)?.[1];
    if (!componentId) throw new Error('Component ID not found in test title');
    
    // Load component from database
    const component = await loadComponentFromDB(componentId);
    await use(component);
  },

  previewUrl: async ({ component }, use) => {
    const url = `/api/test/preview/${component.id}`;
    await use(url);
  },

  loadComponent: async ({ page, previewUrl }, use) => {
    await use(async (componentId: string) => {
      const url = `/api/test/preview/${componentId}`;
      await page.goto(url);
      await page.waitForLoadState('networkidle');
    });
  },
});

export { expect } from '@playwright/test';
```

### Generated Test Example

```typescript
// tests/playwright/generated/button-component.spec.ts
import { test, expect } from '../fixtures/component-fixture';

test.describe('Button Component [button-component]', () => {
  test('should render button with text', async ({ page, previewUrl }) => {
    await page.goto(previewUrl);
    
    const button = page.getByRole('button', { name: /click me/i });
    await expect(button).toBeVisible();
  });

  test('should handle click interaction', async ({ page, previewUrl }) => {
    await page.goto(previewUrl);
    
    const button = page.getByRole('button');
    await button.click();
    
    // Verify click handler executed
    await expect(page.locator('.clicked')).toBeVisible();
  });

  test('should be accessible', async ({ page, previewUrl }) => {
    await page.goto(previewUrl);
    
    // Accessibility check
    const violations = await page.accessibility.snapshot();
    expect(violations).toHaveLength(0);
  });
});
```

---

## Component Test Generator

### Component Analyzer

```typescript
// src/lib/test-intelligence/component-analyzer.ts
import { Project } from 'ts-morph';
import { parse } from 'react-docgen-typescript';

export interface ComponentMetadata {
  id: string;
  name: string;
  framework: 'react' | 'next' | 'vue' | 'html' | 'css' | 'js';
  props: PropMetadata[];
  hasInteractions: boolean;
  hasState: boolean;
  complexity: 'simple' | 'medium' | 'complex';
}

export interface PropMetadata {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export async function analyzeComponent(
  componentId: string,
  files: Array<{ filename: string; code: string; language: string }>
): Promise<ComponentMetadata> {
  const mainFile = files.find(f => 
    ['tsx', 'jsx', 'ts', 'js'].includes(f.language)
  );

  if (!mainFile) {
    throw new Error('No valid component file found');
  }

  // Parse props using react-docgen-typescript
  const parsed = parse(mainFile.code, {
    savePropValueAsString: true,
  });

  const props: PropMetadata[] = parsed[0]?.props 
    ? Object.entries(parsed[0].props).map(([name, meta]) => ({
        name,
        type: meta.type.name,
        required: meta.required,
        defaultValue: meta.defaultValue?.value,
        description: meta.description,
      }))
    : [];

  // Detect interactions
  const hasInteractions = /onClick|onChange|onSubmit|onHover/i.test(mainFile.code);
  
  // Detect state
  const hasState = /useState|useReducer|this\.state/i.test(mainFile.code);

  // Calculate complexity
  const linesOfCode = mainFile.code.split('\n').length;
  const complexity = 
    linesOfCode > 200 || props.length > 10 ? 'complex' :
    linesOfCode > 50 || props.length > 5 ? 'medium' : 'simple';

  return {
    id: componentId,
    name: parsed[0]?.displayName || 'Component',
    framework: detectFramework(mainFile.code),
    props,
    hasInteractions,
    hasState,
    complexity,
  };
}

function detectFramework(code: string): ComponentMetadata['framework'] {
  if (/from ['"]react['"]|import.*React/i.test(code)) return 'react';
  if (/from ['"]next\//i.test(code)) return 'next';
  if (/from ['"]vue['"]|Vue\.component/i.test(code)) return 'vue';
  if (/<html|<!DOCTYPE/i.test(code)) return 'html';
  return 'js';
}
```

### Test Generator

```typescript
// src/lib/test-intelligence/test-generator.ts
import { ComponentMetadata } from './component-analyzer';
import { planComponentTests, generateTestCode } from '../playwright-agents';

export interface TestSuite {
  componentId: string;
  testPlan: string;
  testCode: string;
  scenarios: TestScenario[];
}

export interface TestScenario {
  name: string;
  type: 'functional' | 'visual' | 'accessibility' | 'performance';
  priority: 'high' | 'medium' | 'low';
}

export async function generateTestSuite(
  metadata: ComponentMetadata,
  componentCode: string
): Promise<TestSuite> {
  // Step 1: Create test plan using Planner agent
  const plan = await planComponentTests(metadata.id, componentCode);
  
  // Step 2: Generate test code using Generator agent
  const testCode = await generateTestCode(metadata.id, plan.path);
  
  // Step 3: Extract test scenarios
  const scenarios = extractScenarios(plan, testCode);
  
  return {
    componentId: metadata.id,
    testPlan: plan.markdown,
    testCode: testCode,
    scenarios,
  };
}

function extractScenarios(plan: any, testCode: string): TestScenario[] {
  const scenarios: TestScenario[] = [];
  
  // Parse test code for test.describe and test() blocks
  const testMatches = testCode.matchAll(/test\(['"](.*?)['"]/g);
  for (const match of testMatches) {
    scenarios.push({
      name: match[1],
      type: 'functional',
      priority: determinePriority(match[1]),
    });
  }
  
  return scenarios;
}

function determinePriority(testName: string): TestScenario['priority'] {
  if (/critical|important|must/i.test(testName)) return 'high';
  if (/should|can/i.test(testName)) return 'medium';
  return 'low';
}
```

---

## Visual Regression Testing

### Vitest Visual Configuration

```typescript
// tests/vitest/config.ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/vitest/setup.ts'],
    include: ['tests/vitest/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

### Visual Regression Utilities

```typescript
// tests/vitest/visual-regression.ts
import { expect, test } from 'vitest';
import { chromium, Browser, Page } from 'playwright';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const SCREENSHOT_DIR = join(process.cwd(), 'tests/screenshots');
const BASELINE_DIR = join(SCREENSHOT_DIR, 'baseline');
const ACTUAL_DIR = join(SCREENSHOT_DIR, 'actual');
const DIFF_DIR = join(SCREENSHOT_DIR, 'diff');

interface VisualTestOptions {
  viewports?: Array<{ width: number; height: number; name: string }>;
  threshold?: number; // 0-1, default 0.2
  fullPage?: boolean;
}

export async function visualTest(
  componentId: string,
  previewUrl: string,
  options: VisualTestOptions = {}
) {
  const {
    viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' },
    ],
    threshold = 0.2,
    fullPage = true,
  } = options;

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(previewUrl);
    await page.waitForLoadState('networkidle');

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Wait for any animations to complete
      await page.waitForTimeout(500);
      
      const screenshot = await page.screenshot({
        fullPage,
        path: join(ACTUAL_DIR, `${componentId}-${viewport.name}.png`),
      });

      const baselinePath = join(BASELINE_DIR, `${componentId}-${viewport.name}.png`);
      const diffPath = join(DIFF_DIR, `${componentId}-${viewport.name}.png`);

      // Compare with baseline
      const comparison = await compareScreenshots(
        screenshot,
        baselinePath,
        diffPath,
        threshold
      );

      if (!comparison.match) {
        throw new Error(
          `Visual regression detected for ${componentId} at ${viewport.name} viewport. ` +
          `Similarity: ${(comparison.similarity * 100).toFixed(2)}% ` +
          `(threshold: ${threshold * 100}%)`
        );
      }
    }
  } finally {
    await browser.close();
  }
}

async function compareScreenshots(
  actual: Buffer,
  baselinePath: string,
  diffPath: string,
  threshold: number
): Promise<{ match: boolean; similarity: number; diff?: Buffer }> {
  try {
    const baseline = await readFile(baselinePath);
    
    // Use pixelmatch or similar library for comparison
    const { compareImages } = await import('pixelmatch');
    const diff = Buffer.alloc(actual.length);
    
    const numDiffPixels = compareImages(
      actual,
      baseline,
      diff,
      { threshold: 0.1 }
    );

    const similarity = 1 - (numDiffPixels / (actual.length / 4));
    const match = similarity >= (1 - threshold);

    if (!match) {
      await mkdir(DIFF_DIR, { recursive: true });
      await writeFile(diffPath, diff);
    }

    return { match, similarity, diff: match ? undefined : diff };
  } catch (error) {
    // Baseline doesn't exist - create it
    await mkdir(BASELINE_DIR, { recursive: true });
    await writeFile(baselinePath, actual);
    return { match: true, similarity: 1 };
  }
}
```

### Visual Test Usage

```typescript
// tests/vitest/component-visual.test.ts
import { describe, it } from 'vitest';
import { visualTest } from './visual-regression';

describe('Component Visual Regression', () => {
  it('Button component visual test', async () => {
    await visualTest(
      'button-component',
      'http://localhost:3000/api/test/preview/button-component',
      {
        viewports: [
          { width: 1920, height: 1080, name: 'desktop' },
          { width: 375, height: 667, name: 'mobile' },
        ],
        threshold: 0.2,
      }
    );
  });
});
```

---

## Accessibility Testing

### Accessibility Runner

```typescript
// src/lib/test-runners/accessibility-runner.ts
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';
import { Page } from 'playwright';

export interface AccessibilityReport {
  violations: Violation[];
  passes: number;
  incomplete: number;
  score: number; // 0-100
}

export interface Violation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
  }>;
}

export async function runAccessibilityTest(
  page: Page,
  componentId: string
): Promise<AccessibilityReport> {
  // Inject axe-core
  await injectAxe(page);

  // Run accessibility scan
  const violations = await getViolations(page);

  // Calculate score
  const criticalCount = violations.filter(v => v.impact === 'critical').length;
  const seriousCount = violations.filter(v => v.impact === 'serious').length;
  const moderateCount = violations.filter(v => v.impact === 'moderate').length;
  const minorCount = violations.filter(v => v.impact === 'minor').length;

  // Score calculation: 100 - (critical*20 + serious*10 + moderate*5 + minor*1)
  const score = Math.max(
    0,
    100 - (criticalCount * 20 + seriousCount * 10 + moderateCount * 5 + minorCount * 1)
  );

  return {
    violations: violations.map(v => ({
      id: v.id,
      impact: v.impact as Violation['impact'],
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.map(n => ({
        html: n.html,
        target: n.target,
      })),
    })),
    passes: 0, // Can be calculated from full results
    incomplete: 0,
    score,
  };
}
```

### Accessibility Test Integration

```typescript
// tests/playwright/generated/button-component.spec.ts (extended)
import { test, expect } from '../fixtures/component-fixture';
import { runAccessibilityTest } from '@/lib/test-runners/accessibility-runner';

test.describe('Button Component [button-component]', () => {
  // ... existing tests ...

  test('should pass accessibility checks', async ({ page, previewUrl }) => {
    await page.goto(previewUrl);
    await page.waitForLoadState('networkidle');

    const a11yReport = await runAccessibilityTest(page, 'button-component');

    expect(a11yReport.score).toBeGreaterThanOrEqual(90);
    expect(a11yReport.violations.filter(v => v.impact === 'critical')).toHaveLength(0);
    expect(a11yReport.violations.filter(v => v.impact === 'serious')).toHaveLength(0);
  });
});
```

---

## Test Orchestrator

### Orchestrator Implementation

```typescript
// src/lib/test-intelligence/test-orchestrator.ts
import { Component } from '@/server/db';
import { analyzeComponent } from './component-analyzer';
import { generateTestSuite } from './test-generator';
import { runPlaywrightTests } from '../test-runners/playwright-runner';
import { runVisualTests } from '../test-runners/vitest-visual-runner';
import { runAccessibilityTests } from '../test-runners/accessibility-runner';
import { saveTestReport } from '@/server/api/routers/testReports';

export interface TestJob {
  componentId: string;
  versionId: string;
  priority: 'high' | 'medium' | 'low';
  triggeredBy: 'user' | 'auto' | 'scheduled' | 'pr';
}

export interface TestResult {
  componentId: string;
  versionId: string;
  score: number;
  metrics: {
    functional: FunctionalMetrics;
    visual: VisualMetrics;
    accessibility: AccessibilityMetrics;
  };
  artifacts: {
    screenshots: string[];
    diffs: string[];
    logs: string[];
  };
  duration: number;
  status: 'passed' | 'failed' | 'partial';
}

export interface FunctionalMetrics {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage: number;
}

export interface VisualMetrics {
  totalScreenshots: number;
  passed: number;
  failed: number;
  similarity: number; // Average similarity score
}

export interface AccessibilityMetrics {
  score: number;
  violations: number;
  critical: number;
  serious: number;
}

export class TestOrchestrator {
  async executeTestJob(job: TestJob): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // 1. Load component
      const component = await this.loadComponent(job.componentId, job.versionId);
      
      // 2. Analyze component
      const metadata = await analyzeComponent(component.id, component.files);
      
      // 3. Generate test suite (if not exists)
      const testSuite = await this.ensureTestSuite(metadata, component);
      
      // 4. Run functional tests (Playwright)
      const functionalResults = await runPlaywrightTests(
        component.id,
        testSuite.testCode
      );
      
      // 5. Run visual regression tests (Vitest)
      const visualResults = await runVisualTests(
        component.id,
        `/api/test/preview/${component.id}`
      );
      
      // 6. Run accessibility tests
      const accessibilityResults = await runAccessibilityTests(
        component.id,
        `/api/test/preview/${component.id}`
      );
      
      // 7. Calculate quality score
      const score = this.calculateQualityScore({
        functional: functionalResults,
        visual: visualResults,
        accessibility: accessibilityResults,
      });
      
      // 8. Collect artifacts
      const artifacts = await this.collectArtifacts(component.id);
      
      // 9. Create test result
      const result: TestResult = {
        componentId: component.id,
        versionId: job.versionId,
        score,
        metrics: {
          functional: functionalResults,
          visual: visualResults,
          accessibility: accessibilityResults,
        },
        artifacts,
        duration: Date.now() - startTime,
        status: this.determineStatus(score, functionalResults, visualResults),
      };
      
      // 10. Save to database
      await saveTestReport(result);
      
      return result;
    } catch (error) {
      console.error('Test execution failed:', error);
      throw error;
    }
  }

  private async loadComponent(componentId: string, versionId: string): Promise<Component> {
    // Load from database via tRPC
    const { trpc } = await import('@/lib/trpc');
    return await trpc.component.getById.query(componentId);
  }

  private async ensureTestSuite(
    metadata: ComponentMetadata,
    component: Component
  ) {
    // Check if test suite exists
    const testFile = `tests/playwright/generated/${component.id}.spec.ts`;
    const exists = await fileExists(testFile);
    
    if (!exists) {
      // Generate new test suite
      return await generateTestSuite(metadata, component.files[0].code);
    }
    
    // Load existing test suite
    return await loadTestSuite(component.id);
  }

  private calculateQualityScore(metrics: {
    functional: FunctionalMetrics;
    visual: VisualMetrics;
    accessibility: AccessibilityMetrics;
  }): number {
    const functionalScore = (metrics.functional.passed / metrics.functional.totalTests) * 100;
    const visualScore = metrics.visual.similarity * 100;
    const a11yScore = metrics.accessibility.score;

    // Weighted average
    return Math.round(
      functionalScore * 0.4 +
      visualScore * 0.3 +
      a11yScore * 0.3
    );
  }

  private determineStatus(
    score: number,
    functional: FunctionalMetrics,
    visual: VisualMetrics
  ): TestResult['status'] {
    if (score >= 90 && functional.failed === 0 && visual.failed === 0) {
      return 'passed';
    }
    if (score >= 70) {
      return 'partial';
    }
    return 'failed';
  }

  private async collectArtifacts(componentId: string) {
    const screenshots = await glob(`tests/screenshots/actual/${componentId}-*.png`);
    const diffs = await glob(`tests/screenshots/diff/${componentId}-*.png`);
    const logs = await glob(`tests/logs/${componentId}-*.log`);

    return {
      screenshots: screenshots.map(p => `/artifacts/${p}`),
      diffs: diffs.map(p => `/artifacts/${p}`),
      logs: logs.map(p => `/artifacts/${p}`),
    };
  }
}
```

---

## Database Schema

### Prisma Schema Extensions

```prisma
// prisma/schema.prisma (additions)

model ComponentTestReport {
  id            String   @id @default(uuid())
  componentId   String
  versionId     String
  score         Int      // 0-100 quality score
  status        String   // passed | failed | partial
  metrics       Json     // Functional, visual, accessibility metrics
  artifacts     Json?    // Screenshot paths, diff paths, logs
  duration      Int?     // Test execution time in ms
  triggeredBy   String   // user | auto | scheduled | pr
  createdAt     DateTime @default(now())

  component     Component @relation(fields: [componentId], references: [id], onDelete: Cascade)
  version       ComponentVersion @relation(fields: [versionId], references: [id], onDelete: Cascade)

  @@index([componentId])
  @@index([versionId])
  @@index([createdAt])
}

model ComponentTestSuite {
  id            String   @id @default(uuid())
  componentId   String   @unique
  testPlan      String   @db.Text // Markdown test plan
  testCode      String   @db.Text // Generated Playwright test code
  scenarios     Json     // Array of test scenarios
  lastUpdated   DateTime @default(now())
  autoGenerated Boolean  @default(true)

  component     Component @relation(fields: [componentId], references: [id], onDelete: Cascade)

  @@index([componentId])
}

// Add relation to Component model
model Component {
  // ... existing fields ...
  testReports   ComponentTestReport[]
  testSuite     ComponentTestSuite?
}
```

---

## tRPC Endpoints

### Test Reports Router

```typescript
// src/server/api/routers/testReports.ts
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { TestOrchestrator } from '@/lib/test-intelligence/test-orchestrator';

export const testReportsRouter = createTRPCRouter({
  // Get latest test report for a component
  getLatest: publicProcedure
    .input(z.object({ componentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const report = await ctx.db.componentTestReport.findFirst({
        where: { componentId: input.componentId },
        orderBy: { createdAt: 'desc' },
        include: {
          component: true,
          version: true,
        },
      });

      return report;
    }),

  // Get all test reports for a component
  getAll: publicProcedure
    .input(z.object({ componentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const reports = await ctx.db.componentTestReport.findMany({
        where: { componentId: input.componentId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return reports;
    }),

  // Get test report by ID
  getById: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const report = await ctx.db.componentTestReport.findUnique({
        where: { id: input },
        include: {
          component: true,
          version: true,
        },
      });

      return report;
    }),

  // Save test report
  save: publicProcedure
    .input(
      z.object({
        componentId: z.string(),
        versionId: z.string(),
        score: z.number(),
        status: z.enum(['passed', 'failed', 'partial']),
        metrics: z.any(),
        artifacts: z.any().optional(),
        duration: z.number().optional(),
        triggeredBy: z.enum(['user', 'auto', 'scheduled', 'pr']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.componentTestReport.create({
        data: {
          componentId: input.componentId,
          versionId: input.versionId,
          score: input.score,
          status: input.status,
          metrics: input.metrics,
          artifacts: input.artifacts,
          duration: input.duration,
          triggeredBy: input.triggeredBy,
        },
      });

      return report;
    }),
});
```

### Test Runner Router

```typescript
// src/server/api/routers/testRunner.ts
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { TestOrchestrator } from '@/lib/test-intelligence/test-orchestrator';

const orchestrator = new TestOrchestrator();

export const testRunnerRouter = createTRPCRouter({
  // Run tests for a component
  run: publicProcedure
    .input(
      z.object({
        componentId: z.string(),
        versionId: z.string().optional(),
        priority: z.enum(['high', 'medium', 'low']).default('medium'),
        triggeredBy: z.enum(['user', 'auto', 'scheduled', 'pr']).default('user'),
      })
    )
    .mutation(async ({ input }) => {
      // Get latest version if not specified
      const versionId = input.versionId || await getLatestVersionId(input.componentId);

      const job = {
        componentId: input.componentId,
        versionId,
        priority: input.priority,
        triggeredBy: input.triggeredBy,
      };

      // Execute test job (can be async/background)
      const result = await orchestrator.executeTestJob(job);

      return result;
    }),

  // Get test status
  getStatus: publicProcedure
    .input(z.object({ componentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const latestReport = await ctx.db.componentTestReport.findFirst({
        where: { componentId: input.componentId },
        orderBy: { createdAt: 'desc' },
      });

      return {
        hasTests: !!latestReport,
        lastRun: latestReport?.createdAt,
        score: latestReport?.score,
        status: latestReport?.status,
      };
    }),

  // Regenerate test suite
  regenerateSuite: publicProcedure
    .input(z.object({ componentId: z.string() }))
    .mutation(async ({ input }) => {
      // Load component
      const component = await loadComponent(input.componentId);
      
      // Analyze and regenerate
      const metadata = await analyzeComponent(component.id, component.files);
      const testSuite = await generateTestSuite(metadata, component.files[0].code);
      
      // Save to database
      await saveTestSuite(component.id, testSuite);
      
      return testSuite;
    }),
});
```

---

## UI Integration

### Test Tab Component

```typescript
// src/components/TestTab/TestTab.tsx
'use client';

import { trpc } from '@/lib/trpc';
import { TestSummary } from './TestSummary';
import { VisualDiffViewer } from './VisualDiffViewer';
import { TestTimeline } from './TestTimeline';
import { TestRunner } from './TestRunner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TestTabProps {
  componentId: string;
}

export function TestTab({ componentId }: TestTabProps) {
  const { data: latestReport, isLoading } = trpc.testReports.getLatest.useQuery({
    componentId,
  });

  const { data: allReports } = trpc.testReports.getAll.useQuery({
    componentId,
  });

  if (isLoading) {
    return <div>Loading test results...</div>;
  }

  return (
    <div className="space-y-4">
      <TestSummary report={latestReport} />
      
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="visual">Visual Diffs</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="run">Run Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <TestSummary report={latestReport} detailed />
        </TabsContent>

        <TabsContent value="visual">
          <VisualDiffViewer
            componentId={componentId}
            artifacts={latestReport?.artifacts}
          />
        </TabsContent>

        <TabsContent value="timeline">
          <TestTimeline reports={allReports || []} />
        </TabsContent>

        <TabsContent value="run">
          <TestRunner componentId={componentId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Test Badge Component

```typescript
// src/components/TestTab/TestBadge.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TestBadgeProps {
  score?: number;
  status?: 'passed' | 'failed' | 'partial';
}

export function TestBadge({ score, status }: TestBadgeProps) {
  if (!score && !status) {
    return (
      <Badge variant="outline" className="bg-gray-100">
        No Tests
      </Badge>
    );
  }

  const getColor = () => {
    if (status === 'passed' || (score && score >= 90)) return 'bg-green-500';
    if (status === 'partial' || (score && score >= 70)) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getIcon = () => {
    if (status === 'passed' || (score && score >= 90)) return '🟢';
    if (status === 'partial' || (score && score >= 70)) return '🟡';
    return '🔴';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge className={getColor()}>
            {getIcon()} {score || 'N/A'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div>Status: {status || 'unknown'}</div>
            {score && <div>Score: {score}/100</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

### Visual Diff Viewer

```typescript
// src/components/TestTab/VisualDiffViewer.tsx
'use client';

import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VisualDiffViewerProps {
  componentId: string;
  artifacts?: {
    screenshots?: string[];
    diffs?: string[];
  };
}

export function VisualDiffViewer({ componentId, artifacts }: VisualDiffViewerProps) {
  const [sliderValue, setSliderValue] = useState([50]);

  const screenshots = artifacts?.screenshots || [];
  const diffs = artifacts?.diffs || [];

  if (screenshots.length === 0) {
    return <div className="text-muted-foreground">No visual test results available</div>;
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="desktop">
        <TabsList>
          {screenshots.map((screenshot, index) => {
            const viewport = screenshot.match(/-(\w+)\.png$/)?.[1] || 'unknown';
            return (
              <TabsTrigger key={index} value={viewport}>
                {viewport}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {screenshots.map((screenshot, index) => {
          const viewport = screenshot.match(/-(\w+)\.png$/)?.[1] || 'unknown';
          const diff = diffs.find(d => d.includes(viewport));

          return (
            <TabsContent key={index} value={viewport}>
              <div className="relative">
                {diff ? (
                  <div className="relative">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="text-sm font-medium mb-2">Baseline</div>
                        <img
                          src={screenshot.replace('actual', 'baseline')}
                          alt="Baseline"
                          className="border rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium mb-2">Current</div>
                        <img
                          src={screenshot}
                          alt="Current"
                          className="border rounded"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="text-sm font-medium mb-2">Diff (slider to compare)</div>
                      <div className="relative">
                        <img
                          src={diff}
                          alt="Diff"
                          className="border rounded"
                          style={{
                            clipPath: `inset(0 ${100 - sliderValue[0]}% 0 0)`,
                          }}
                        />
                        <Slider
                          value={sliderValue}
                          onValueChange={setSliderValue}
                          max={100}
                          step={1}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-medium mb-2">Screenshot</div>
                    <img
                      src={screenshot}
                      alt="Screenshot"
                      className="border rounded"
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
```

### Test Runner Component

```typescript
// src/components/TestTab/TestRunner.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';

interface TestRunnerProps {
  componentId: string;
}

export function TestRunner({ componentId }: TestRunnerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const utils = trpc.useUtils();

  const runTestsMutation = trpc.testRunner.run.useMutation({
    onSuccess: () => {
      toast.success('Tests completed successfully');
      utils.testReports.getLatest.invalidate({ componentId });
      setIsRunning(false);
    },
    onError: (error) => {
      toast.error(`Test execution failed: ${error.message}`);
      setIsRunning(false);
    },
  });

  const handleRunTests = async () => {
    setIsRunning(true);
    runTestsMutation.mutate({
      componentId,
      priority: 'high',
      triggeredBy: 'user',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Run Tests</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Execute all test suites for this component including functional, visual, and accessibility tests.
        </p>
      </div>

      <Button
        onClick={handleRunTests}
        disabled={isRunning}
        className="w-full"
      >
        {isRunning ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Running Tests...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Run Tests
          </>
        )}
      </Button>

      {isRunning && (
        <div className="text-sm text-muted-foreground">
          Tests are running in the background. Results will appear when complete.
        </div>
      )}
    </div>
  );
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/vti-tests.yml
name: VTI Component Tests

on:
  pull_request:
    paths:
      - 'src/components/**'
      - 'tests/**'
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Nightly at 2 AM UTC

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup database
        run: |
          npx prisma generate
          npx prisma db push --skip-generate

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Start application
        run: npm start &
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Wait for server
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:3000; do sleep 2; done'

      - name: Run Playwright tests
        run: npx playwright test
        continue-on-error: true

      - name: Run Vitest visual tests
        run: npx vitest run tests/vitest
        continue-on-error: true

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: |
            playwright-report/
            test-results.json
            tests/screenshots/

      - name: Upload screenshots
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: screenshots
          path: tests/screenshots/
```

---

## Quality Scoring

### Scoring Algorithm

```typescript
// src/lib/test-intelligence/quality-scorer.ts
export interface QualityMetrics {
  functional: {
    totalTests: number;
    passed: number;
    failed: number;
    coverage: number;
  };
  visual: {
    totalScreenshots: number;
    passed: number;
    failed: number;
    averageSimilarity: number;
  };
  accessibility: {
    score: number;
    violations: number;
    critical: number;
  };
}

export function calculateQualityScore(metrics: QualityMetrics): number {
  // Functional score (40% weight)
  const functionalScore = metrics.functional.totalTests > 0
    ? (metrics.functional.passed / metrics.functional.totalTests) * 100
    : 0;
  const functionalWeighted = functionalScore * 0.4;

  // Visual score (30% weight)
  const visualScore = metrics.visual.averageSimilarity * 100;
  const visualWeighted = visualScore * 0.3;

  // Accessibility score (30% weight)
  const a11yScore = metrics.accessibility.score;
  const a11yWeighted = a11yScore * 0.3;

  // Base score
  let baseScore = functionalWeighted + visualWeighted + a11yWeighted;

  // Penalties
  if (metrics.accessibility.critical > 0) {
    baseScore -= metrics.accessibility.critical * 10; // -10 per critical violation
  }

  if (metrics.functional.failed > 0) {
    const failureRate = metrics.functional.failed / metrics.functional.totalTests;
    baseScore -= failureRate * 20; // Penalty for failures
  }

  // Bonus for high coverage
  if (metrics.functional.coverage > 80) {
    baseScore += 5; // +5 bonus for >80% coverage
  }

  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, Math.round(baseScore)));
}
```

---

## Artifact Storage

### Storage Structure

```
/vault-artifacts/
├── {componentId}/
│   ├── {versionId}/
│   │   ├── report.json
│   │   ├── functional/
│   │   │   ├── test-results.json
│   │   │   └── logs/
│   │   ├── visual/
│   │   │   ├── baseline/
│   │   │   │   ├── {componentId}-desktop.png
│   │   │   │   ├── {componentId}-tablet.png
│   │   │   │   └── {componentId}-mobile.png
│   │   │   ├── actual/
│   │   │   │   └── ...
│   │   │   └── diff/
│   │   │       └── ...
│   │   └── accessibility/
│   │       └── report.json
```

### Artifact Manager

```typescript
// src/lib/test-intelligence/artifact-manager.ts
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';

const ARTIFACTS_DIR = join(process.cwd(), 'vault-artifacts');

export class ArtifactManager {
  async saveReport(componentId: string, versionId: string, report: any) {
    const dir = join(ARTIFACTS_DIR, componentId, versionId);
    await mkdir(dir, { recursive: true });

    const reportPath = join(dir, 'report.json');
    await writeFile(reportPath, JSON.stringify(report, null, 2));

    return `/artifacts/${componentId}/${versionId}/report.json`;
  }

  async saveScreenshot(
    componentId: string,
    versionId: string,
    viewport: string,
    screenshot: Buffer,
    type: 'baseline' | 'actual' | 'diff'
  ) {
    const dir = join(ARTIFACTS_DIR, componentId, versionId, 'visual', type);
    await mkdir(dir, { recursive: true });

    const filename = `${componentId}-${viewport}.png`;
    const filepath = join(dir, filename);
    await writeFile(filepath, screenshot);

    return `/artifacts/${componentId}/${versionId}/visual/${type}/${filename}`;
  }

  async getArtifactUrl(componentId: string, versionId: string, path: string) {
    // In production, this would return S3/Cloud Storage URL
    // For now, return local path
    return `/api/artifacts/${componentId}/${versionId}/${path}`;
  }
}
```

---

## Implementation Details

### Preview Endpoint for Testing

```typescript
// src/app/api/test/preview/[componentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { generatePreviewRuntime } from '@/lib/preview-runtime-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: { componentId: string } }
) {
  const componentId = params.componentId;

  // Load component
  const component = await db.component.findUnique({
    where: { id: componentId },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          files: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  if (!component || !component.versions[0]) {
    return NextResponse.json({ error: 'Component not found' }, { status: 404 });
  }

  const version = component.versions[0];
  const mainFile = version.files.find(f => 
    ['tsx', 'jsx', 'ts', 'js'].includes(f.language)
  );

  if (!mainFile) {
    return NextResponse.json({ error: 'No valid component file' }, { status: 400 });
  }

  // Generate preview runtime
  const runtime = generatePreviewRuntime(
    mainFile.code,
    component.title,
    version.files.map(f => ({ filename: f.filename, code: f.code }))
  );

  // Generate HTML document
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { margin: 0; padding: 20px; }
          #root { min-height: 100vh; }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script type="module">
          ${runtime.runtimeCode}
        </script>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
```

### Package Dependencies

```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@playwright/test-agents": "^1.0.0",
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "axe-playwright": "^4.8.0",
    "pixelmatch": "^5.3.0",
    "pngjs": "^7.0.0",
    "ts-morph": "^21.0.0",
    "react-docgen-typescript": "^2.2.0"
  }
}
```

---

## Test Execution Flow (Detailed)

### Step-by-Step Execution

1. **Component Analysis Phase**
   - Load component from database
   - Extract all files (TSX, JSX, HTML, CSS, JS)
   - Parse component structure using AST
   - Detect framework (React, Vue, HTML, etc.)
   - Extract props and their types
   - Identify interactions (onClick, onChange, etc.)
   - Calculate complexity score

2. **Test Planning Phase (Planner Agent)**
   - Analyze component structure
   - Identify user interaction points
   - Generate test scenarios:
     - Render tests
     - Interaction tests
     - Edge case tests
     - Accessibility tests
   - Create Markdown test plan
   - Save plan to `tests/playwright/plans/{componentId}.md`

3. **Test Generation Phase (Generator Agent)**
   - Read test plan from Planner
   - Generate Playwright test code
   - Create test file: `tests/playwright/generated/{componentId}.spec.ts`
   - Include:
     - Component loading
     - Interaction tests
     - Assertions
     - Screenshot captures

4. **Test Execution Phase**
   - Start Playwright test runner
   - Load component preview via `/api/test/preview/{componentId}`
   - Execute all generated tests
   - Capture screenshots at key points
   - Record test results (pass/fail/skip)
   - If failures occur → trigger Healer Agent

5. **Visual Regression Phase**
   - Load component preview
   - Capture screenshots at multiple viewports:
     - Desktop (1920x1080)
     - Tablet (768x1024)
     - Mobile (375x667)
   - Compare with baseline images
   - Generate diff images if differences found
   - Calculate similarity scores

6. **Accessibility Testing Phase**
   - Inject axe-core into preview page
   - Run full accessibility scan
   - Detect violations (critical, serious, moderate, minor)
   - Calculate accessibility score
   - Generate violation report

7. **Results Aggregation Phase**
   - Combine all test results
   - Calculate quality score:
     - Functional: 40% weight
     - Visual: 30% weight
     - Accessibility: 30% weight
   - Determine overall status (passed/failed/partial)
   - Collect all artifacts (screenshots, diffs, logs)

8. **Storage Phase**
   - Save test report to database
   - Store artifacts in file system or S3
   - Update component test suite metadata
   - Trigger UI updates via tRPC subscriptions

9. **Healing Phase (if failures)**
   - Analyze failed test
   - Identify root cause (selector issue, timing, etc.)
   - Update test code automatically
   - Re-run failed tests
   - Update test suite if healing successful

---

## Test Healer Agent (Detailed)

### How Healer Works

```typescript
// src/lib/test-intelligence/test-healer.ts
import { healTests } from '@playwright/test-agents';

export interface TestFailure {
  testName: string;
  error: string;
  screenshot?: Buffer;
  selector?: string;
  action?: string;
}

export async function healTestFailure(
  testFile: string,
  failure: TestFailure
): Promise<{ healed: boolean; newCode?: string }> {
  // Analyze failure
  const analysis = await analyzeFailure(failure);
  
  // Common failure patterns:
  // 1. Selector not found → Update selector
  // 2. Element not visible → Add wait
  // 3. Timing issue → Add delay/wait
  // 4. Assertion failed → Update assertion
  
  if (analysis.type === 'selector') {
    // Healer finds alternative selector
    const newSelector = await findAlternativeSelector(failure.selector!);
    const healedCode = await updateSelectorInTest(testFile, failure.selector!, newSelector);
    return { healed: true, newCode: healedCode };
  }
  
  if (analysis.type === 'timing') {
    // Add wait for element
    const healedCode = await addWaitToTest(testFile, failure.selector!);
    return { healed: true, newCode: healedCode };
  }
  
  // Use Playwright Healer Agent
  const result = await healTests({
    testFile,
    failure: {
      test: failure.testName,
      error: failure.error,
      screenshot: failure.screenshot,
    },
  });
  
  return { healed: result.healed, newCode: result.code };
}
```

### Healer Integration in Test Runner

```typescript
// tests/playwright/fixtures/component-fixture.ts (extended)
import { test as base } from '@playwright/test';
import { healTestFailure } from '@/lib/test-intelligence/test-healer';

export const test = base.extend({
  // ... existing fixtures ...
  
  autoHeal: [true, { option: true }],
});

// Auto-heal hook
test.afterEach(async ({ page, autoHeal }, testInfo) => {
  if (testInfo.status === 'failed' && autoHeal) {
    const screenshot = await page.screenshot();
    
    const failure = {
      testName: testInfo.title,
      error: testInfo.error?.message || '',
      screenshot,
      selector: extractSelectorFromError(testInfo.error),
    };
    
    const healed = await healTestFailure(testInfo.file, failure);
    
    if (healed.healed && healed.newCode) {
      // Update test file
      await updateTestFile(testInfo.file, healed.newCode);
      
      // Re-run test
      console.log(`Test healed, re-running: ${testInfo.title}`);
      // Re-execution logic here
    }
  }
});
```

---

## Component Preview for Testing

### Preview URL Structure

```
/api/test/preview/{componentId}
/api/test/preview/{componentId}?version={versionId}
/api/test/preview/{componentId}?props={encodedProps}
```

### Preview Endpoint Features

- Loads latest version by default
- Supports version parameter for specific version testing
- Supports props parameter for prop-based testing
- Generates isolated preview (no VaultUI chrome)
- Includes all component dependencies
- Handles all frameworks (React, Vue, HTML, etc.)

### Preview HTML Structure

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- Component-specific styles -->
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
      // Preview runtime code
      // Component code
      // Dependency loading
    </script>
  </body>
</html>
```

---

## Test Scenarios by Component Type

### React Components

**Test Coverage:**
- Component renders without errors
- Props are applied correctly
- State changes trigger re-renders
- Event handlers execute correctly
- Hooks work as expected
- Conditional rendering works
- Lists render correctly

**Example Test:**
```typescript
test('Button component with onClick', async ({ page, previewUrl }) => {
  await page.goto(previewUrl);
  
  const button = page.getByRole('button', { name: /click me/i });
  await expect(button).toBeVisible();
  
  await button.click();
  
  // Verify click handler executed
  await expect(page.locator('.clicked')).toBeVisible();
});
```

### Vue Components

**Test Coverage:**
- Component mounts correctly
- Props are reactive
- Events emit correctly
- Computed properties work
- Watchers trigger

**Example Test:**
```typescript
test('Vue component with v-model', async ({ page, previewUrl }) => {
  await page.goto(previewUrl);
  
  const input = page.getByRole('textbox');
  await input.fill('test value');
  
  // Verify v-model binding
  await expect(page.locator('.value')).toHaveText('test value');
});
```

### HTML/CSS Components

**Test Coverage:**
- HTML structure is correct
- CSS styles apply correctly
- Responsive breakpoints work
- Animations complete
- No layout shifts

**Example Test:**
```typescript
test('HTML card component layout', async ({ page, previewUrl }) => {
  await page.goto(previewUrl);
  
  const card = page.locator('.card');
  await expect(card).toBeVisible();
  
  // Check CSS properties
  const styles = await card.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      padding: computed.padding,
      borderRadius: computed.borderRadius,
    };
  });
  
  expect(styles.borderRadius).toBe('8px');
});
```

---

## Visual Regression Best Practices

### Baseline Management

1. **Initial Baseline Creation**
   - First test run creates baseline automatically
   - Baselines stored in `tests/screenshots/baseline/`
   - Named: `{componentId}-{viewport}.png`

2. **Baseline Updates**
   - Manual approval required for baseline updates
   - UI provides "Approve Baseline" button
   - Updates stored with version ID

3. **Baseline Versioning**
   - Each baseline linked to component version
   - Can compare across versions
   - Historical baselines preserved

### Diff Threshold Configuration

```typescript
// tests/vitest/visual-regression.ts
export const VISUAL_THRESHOLDS = {
  // Pixel difference threshold (0-1)
  pixelThreshold: 0.2, // 20% difference allowed
  
  // Perceptual difference threshold
  perceptualThreshold: 0.1,
  
  // Ignore anti-aliasing differences
  ignoreAntialiasing: true,
  
  // Ignore colors (grayscale comparison)
  ignoreColors: false,
  
  // Custom comparison regions
  customRegions: [],
};
```

### Viewport Configuration

```typescript
export const TEST_VIEWPORTS = [
  { width: 1920, height: 1080, name: 'desktop' },
  { width: 1440, height: 900, name: 'desktop-small' },
  { width: 1024, height: 768, name: 'tablet-landscape' },
  { width: 768, height: 1024, name: 'tablet-portrait' },
  { width: 375, height: 667, name: 'mobile' },
  { width: 320, height: 568, name: 'mobile-small' },
];
```

---

## Accessibility Testing Details

### axe-core Rules

**Enabled Rules:**
- WCAG 2.1 Level A & AA
- Best practices
- ARIA rules

**Custom Rules:**
- Component-specific accessibility patterns
- Design system compliance

### Violation Severity

```typescript
const VIOLATION_WEIGHTS = {
  critical: 20, // -20 points per violation
  serious: 10,  // -10 points per violation
  moderate: 5,  // -5 points per violation
  minor: 1,     // -1 point per violation
};

// Score calculation
const score = Math.max(
  0,
  100 - (
    criticalCount * VIOLATION_WEIGHTS.critical +
    seriousCount * VIOLATION_WEIGHTS.serious +
    moderateCount * VIOLATION_WEIGHTS.moderate +
    minorCount * VIOLATION_WEIGHTS.minor
  )
);
```

### Common Accessibility Checks

1. **Color Contrast**
   - Text contrast ratio ≥ 4.5:1 (normal text)
   - Text contrast ratio ≥ 3:1 (large text)

2. **Keyboard Navigation**
   - All interactive elements focusable
   - Tab order is logical
   - Focus indicators visible

3. **Screen Reader Support**
   - ARIA labels present
   - Semantic HTML used
   - Alt text for images

4. **Form Accessibility**
   - Labels associated with inputs
   - Error messages announced
   - Required fields indicated

---

## Performance Testing (Optional)

### Performance Metrics

```typescript
// src/lib/test-runners/performance-runner.ts
export interface PerformanceMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
}

export async function measurePerformance(
  page: Page,
  componentId: string
): Promise<PerformanceMetrics> {
  // Use Playwright's performance API
  const metrics = await page.evaluate(() => {
    const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      firstContentfulPaint: perf.responseEnd - perf.fetchStart,
      // ... other metrics
    };
  });
  
  return metrics;
}
```

---

## Error Handling & Recovery

### Test Execution Errors

```typescript
// src/lib/test-intelligence/test-orchestrator.ts (extended)
export class TestOrchestrator {
  async executeTestJob(job: TestJob): Promise<TestResult> {
    try {
      // ... test execution ...
    } catch (error) {
      // Log error
      await this.logError(job.componentId, error);
      
      // Attempt recovery
      if (error instanceof PreviewError) {
        return await this.recoverFromPreviewError(job, error);
      }
      
      if (error instanceof TestGenerationError) {
        return await this.recoverFromGenerationError(job, error);
      }
      
      // Return failed result
      return {
        componentId: job.componentId,
        versionId: job.versionId,
        score: 0,
        status: 'failed',
        metrics: { /* empty metrics */ },
        artifacts: {},
        duration: 0,
        error: error.message,
      };
    }
  }
  
  private async recoverFromPreviewError(job: TestJob, error: PreviewError) {
    // Try alternative preview method
    // Fallback to static HTML generation
    // Retry test execution
  }
}
```

### Retry Logic

```typescript
// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryableErrors: [
    'TimeoutError',
    'NetworkError',
    'SelectorNotFound',
  ],
};

async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config = RETRY_CONFIG
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < config.maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (!config.retryableErrors.includes(error.constructor.name)) {
        throw error;
      }
      
      if (i < config.maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      }
    }
  }
  
  throw lastError!;
}
```

---

## Monitoring & Observability

### Test Metrics Collection

```typescript
// src/lib/test-intelligence/metrics-collector.ts
export interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageDuration: number;
  flakinessRate: number;
  componentCoverage: number;
}

export class MetricsCollector {
  async collectMetrics(componentId: string): Promise<TestMetrics> {
    const reports = await db.componentTestReport.findMany({
      where: { componentId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    
    return {
      totalTests: reports.reduce((sum, r) => sum + r.metrics.functional.totalTests, 0),
      passedTests: reports.reduce((sum, r) => sum + r.metrics.functional.passed, 0),
      failedTests: reports.reduce((sum, r) => sum + r.metrics.functional.failed, 0),
      averageDuration: reports.reduce((sum, r) => sum + (r.duration || 0), 0) / reports.length,
      flakinessRate: this.calculateFlakiness(reports),
      componentCoverage: this.calculateCoverage(componentId),
    };
  }
  
  private calculateFlakiness(reports: TestReport[]): number {
    // Tests that pass and fail intermittently
    // Implementation here
    return 0;
  }
}
```

### Logging

```typescript
// Structured logging
import { createLogger } from 'winston';

const testLogger = createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'tests/logs/test-execution.log' }),
  ],
});

// Usage
testLogger.info('Test execution started', {
  componentId,
  versionId,
  triggeredBy: 'user',
});

testLogger.error('Test execution failed', {
  componentId,
  error: error.message,
  stack: error.stack,
});
```

---

## Security Considerations

### Test Isolation

- Each test runs in isolated browser context
- No shared state between tests
- Clean database state per test
- Sandboxed preview environment

### Code Execution Safety

- Preview code runs in iframe with sandbox
- No access to parent window
- CSP headers enforced
- No eval() of untrusted code

### API Security

- Test endpoints require authentication
- Rate limiting on test execution
- Resource limits (timeout, memory)
- Input validation on all parameters

---

## Troubleshooting Guide

### Common Issues

**1. Tests fail with "Component not found"**
- Check component ID is correct
- Verify component exists in database
- Check preview endpoint is accessible

**2. Visual regression false positives**
- Adjust threshold in config
- Check for dynamic content (timestamps, etc.)
- Verify viewport sizes match

**3. Playwright agents not generating tests**
- Check Playwright Test Agents is installed
- Verify component code is parseable
- Check logs for generation errors

**4. Accessibility violations in preview but not component**
- Preview wrapper may add violations
- Check iframe accessibility
- Verify axe-core is injected correctly

**5. Test execution timeout**
- Increase timeout in Playwright config
- Check component loads quickly
- Verify network requests complete

### Debug Mode

```typescript
// Enable debug mode
process.env.DEBUG = 'playwright:*';
process.env.PWDEBUG = '1'; // Playwright inspector

// Run tests with debug
npx playwright test --debug
```

---

## Quick Reference

### Commands

```bash
# Run all tests
npm run test

# Run Playwright tests only
npx playwright test

# Run visual regression only
npx vitest run tests/vitest

# Run tests for specific component
npx playwright test tests/playwright/generated/{componentId}.spec.ts

# Generate test suite for component
npm run test:generate -- --component {componentId}

# Update baselines
npm run test:update-baselines

# View test report
npx playwright show-report
```

### Environment Variables

```bash
# Test configuration
PREVIEW_BASE_URL=http://localhost:3000
TEST_TIMEOUT=30000
VISUAL_THRESHOLD=0.2

# Playwright
PLAYWRIGHT_BROWSERS_PATH=./browsers

# Debug
DEBUG=playwright:*
PWDEBUG=1
```

---

## Conclusion

This comprehensive testing system provides:

✅ **Automated test generation** via Playwright Test Agents  
✅ **Visual regression testing** across multiple viewports  
✅ **Accessibility compliance** checking  
✅ **Self-healing tests** that adapt to changes  
✅ **Quality scoring** for component health  
✅ **Complete UI integration** for test management  
✅ **CI/CD ready** for automated testing  

The system is designed to scale with your component library and provide continuous quality assurance for all components in VaultUI.