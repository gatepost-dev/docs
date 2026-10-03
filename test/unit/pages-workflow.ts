// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
import { parse } from 'yaml';

interface Step {
  readonly uses?: string;
  readonly with?: Readonly<Record<string, unknown>>;
}

interface Workflow {
  readonly on?: Readonly<Record<string, unknown>>;
  readonly jobs?: Readonly<
    Record<string, { readonly if?: string; readonly steps?: readonly Step[] } | undefined>
  >;
}

const MAIN_ONLY = "github.ref == 'refs/heads/main'";

function triggerProblems(workflow: Workflow): readonly string[] {
  const triggers = Object.keys(workflow.on ?? {}).sort();
  const problems: string[] = [];
  if (triggers.join() !== 'push,workflow_dispatch') {
    problems.push(`The triggers are ${triggers.join(', ')}. Use push and workflow_dispatch only.`);
  }
  const push = workflow.on?.['push'] as { readonly branches?: readonly string[] } | null;
  if (push?.branches?.join() !== 'main') {
    problems.push('The push trigger must name the branch main and no other.');
  }
  return problems;
}

function checkoutProblems(workflow: Workflow): readonly string[] {
  return Object.entries(workflow.jobs ?? {}).flatMap(([name, job]) =>
    (job?.steps ?? [])
      .filter((step) => step.uses?.startsWith('actions/checkout@') === true)
      .filter((step) => step.with?.['persist-credentials'] !== false)
      .map(() => `The checkout in ${name} must set persist-credentials to false.`),
  );
}

/**
 * Checks the rules that keep the publishing workflow safe. Only a push to main and a manual run
 * may start it, the deploy job runs only on main, and no checkout leaves a token in the clone.
 *
 * @param text - The YAML text of the workflow.
 * @returns One line for each rule that the workflow breaks.
 */
export function pagesProblems(text: string): readonly string[] {
  const workflow = parse(text) as Workflow;
  const guard =
    workflow.jobs?.['deploy']?.if === MAIN_ONLY
      ? []
      : [`The deploy job needs the guard if: ${MAIN_ONLY}.`];
  return [...triggerProblems(workflow), ...guard, ...checkoutProblems(workflow)];
}
