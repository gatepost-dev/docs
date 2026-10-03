// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
// Connects the playground's markup to describePostcode. It writes text only, never HTML, and it
// keeps nothing: no request, no storage and no change of the address bar.
import { describeAccuracy, describePostcode, message, type PostcodeView } from './describe.ts';

// A screen reader hears the status after the typing pauses, not at each keystroke.
const STATUS_DELAY_MS = 600;

function part(root: HTMLElement, name: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (element === null) throw new Error(`The playground has no part named ${name}.`);
  return element;
}

function inputPart(root: HTMLElement, name: string): HTMLInputElement {
  const element = part(root, name);
  if (!(element instanceof HTMLInputElement)) throw new Error(`${name} is not an input.`);
  return element;
}

function renderSegments(list: HTMLElement, view: PostcodeView): void {
  list.replaceChildren(
    ...view.segments.map((segment) => {
      const item = document.createElement('li');
      item.dataset['problem'] = String(segment.problem);
      const label = document.createElement('span');
      label.textContent = segment.label;
      const text = document.createElement('code');
      text.textContent = segment.text;
      item.append(label, text);
      if (segment.problem) {
        const problem = document.createElement('strong');
        problem.textContent = message('segment.problem');
        item.append(problem);
      }
      return item;
    }),
  );
}

function renderForms(list: HTMLElement, view: PostcodeView): void {
  list.replaceChildren(
    ...view.forms.flatMap(({ label, value }) => {
      const term = document.createElement('dt');
      term.textContent = label;
      const detail = document.createElement('dd');
      const code = document.createElement('code');
      code.textContent = value;
      detail.append(code);
      return [term, detail];
    }),
  );
}

/**
 * Starts the playground in its markup.
 *
 * @param root - The element that holds the parts of the playground.
 */
export function startPlayground(root: HTMLElement): void {
  const input = inputPart(root, 'postcode');
  const partial = inputPart(root, 'partial');
  const status = part(root, 'status');
  const suggestion = part(root, 'suggestion');
  const suggested = part(root, 'suggested');
  const accuracy = inputPart(root, 'accuracy');
  const accuracyStatus = part(root, 'accuracy-status');
  let timer: ReturnType<typeof setTimeout> | undefined;

  const render = (): void => {
    const view = describePostcode(input.value, partial.checked);
    root.dataset['status'] = view.status;
    renderSegments(part(root, 'segments'), view);
    renderForms(part(root, 'forms'), view);
    suggestion.hidden = view.suggestion === null;
    suggested.textContent = view.suggestion ?? '';
    clearTimeout(timer);
    timer = setTimeout(() => {
      status.textContent = view.message;
    }, STATUS_DELAY_MS);
  };

  input.addEventListener('input', render);
  partial.addEventListener('change', render);
  part(root, 'use-suggestion').addEventListener('click', () => {
    input.value = suggested.textContent;
    render();
    input.focus();
  });
  accuracy.addEventListener('input', () => {
    accuracyStatus.textContent = describeAccuracy(accuracy.value) ?? '';
  });
  render();
}
