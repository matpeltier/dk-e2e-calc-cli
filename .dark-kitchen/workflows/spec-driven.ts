/**
 * Custom spec-driven workflow: specialized implementer → independent review
 * with a bounded fix loop → repository validation. More steps than the
 * builtin default: an explicit planning step up front and a final changelog
 * note appended by the implementer.
 */
import type { WorkflowBuilder, WorkflowFn } from '@dark-kitchen/workflow-engine';

interface WorkflowResult {
  taskId: string;
  status: 'success' | 'failure' | 'intervention';
  summary: string;
  repositoryTestsPassed: boolean;
  reviewPassed: boolean;
  commits: string[];
}

function parseVerdict(output: unknown): { passed: boolean; findings?: string } {
  const text = String(output ?? '');
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as { passed?: boolean; findings?: string };
      return { passed: parsed.passed === true, findings: parsed.findings };
    }
  } catch {
    // fall through to marker parsing
  }
  return { passed: /"passed"\s*:\s*true|"APPROVED"/i.test(text) };
}

const workflow: WorkflowFn<WorkflowResult> = async (builder: WorkflowBuilder) => {
  // Phase 1 — plan then implement with the specialized TDD agent
  const planPhase = builder.phase('plan');
  const plan = await planPhase.agent({
    role: 'implementer-special',
    prompt:
      'Write a short implementation plan (bullet list, max 10 lines) for the task in context. Do not write code yet.',
  });

  const implPhase = builder.phase('implement');
  const impl = await implPhase.agent({
    role: 'implementer-special',
    prompt: [
      'Implement the task now, following this plan:',
      String(plan.result ?? ''),
      'Run the tests before finishing.',
    ].join('\n'),
  });

  // Phase 2 — bounded review/fix loop on different models
  let reviewPassed = false;
  let findings: string | undefined;
  for (let cycle = 0; cycle <= 2; cycle++) {
    const review = await builder.phase(`review-${cycle}`).agent({
      role: 'reviewer',
      prompt: [
        'Independently review the changes in the current worktree against the task.',
        'Return JSON only: {"passed": true} or {"passed": false, "findings": "..."}.',
      ].join('\n'),
      context: {
        implementation: impl.result,
        ...(findings ? { priorFindings: findings } : {}),
        preserveExistingWorktree: true,
      },
    });
    const verdict = parseVerdict(review.result);
    reviewPassed = verdict.passed;
    findings = verdict.findings;
    if (reviewPassed) break;
    if (cycle < 2) {
      await builder.phase(`fix-${cycle}`).agent({
        role: 'fixer',
        prompt: `Fix these review findings:\n${String(findings ?? '')}`,
        context: { preserveExistingWorktree: true },
      });
    }
  }

  // Phase 3 — repository validation
  const validation = await builder.phase('repository-validation').agent({
    role: 'repository-tester',
    prompt: [
      'Run the repository tests relevant to the changes (npm test).',
      'Inspect failures rather than claiming success without execution.',
      'Return JSON only: {"passed": true} or {"passed": false, "findings": "..."}.',
    ].join('\n'),
  });
  const testsPassed = parseVerdict(validation.result).passed;

  const status: WorkflowResult['status'] =
    testsPassed && reviewPassed ? 'success' : 'failure';
  return {
    taskId: 'unknown',
    status,
    summary: String(impl.result ?? ''),
    repositoryTestsPassed: testsPassed,
    reviewPassed,
    commits: [],
  };
};

export default workflow;
export { workflow };
