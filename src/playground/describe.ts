// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
// Turns the text of the playground into what the page shows. It calls only @gatepost/core, so
// it needs no network, and each string comes from the message catalogue (UI-2).
import {
  parent,
  parse,
  precisionForAccuracy,
  redact,
  stateName,
  type ParseError,
  type Postcode,
  type Precision,
} from '@gatepost/core';
import messages from '../messages/en-GB.json';

/** The name of a string in the message catalogue. */
export type MessageKey = keyof typeof messages;

/** One segment box of the playground. */
export interface SegmentView {
  readonly name: Precision;
  readonly label: string;
  readonly text: string;
  readonly problem: boolean;
}

/** What the playground shows for the text in its field. */
export interface PostcodeView {
  readonly status: 'idle' | 'valid' | 'invalid';
  readonly message: string;
  readonly segments: readonly SegmentView[];
  readonly forms: readonly { readonly label: string; readonly value: string }[];
  readonly suggestion: string | null;
}

const SEGMENT_NAMES: readonly Precision[] = ['state', 'lga', 'district', 'area', 'unit'];

/**
 * Reads a string from the message catalogue.
 *
 * @param key - The name of the string.
 * @returns The string.
 */
export function message(key: MessageKey): string {
  return messages[key];
}

function isMessageKey(key: string): key is MessageKey {
  return Object.hasOwn(messages, key);
}

/**
 * Names the message for a parse error. A segment error has one message for each segment, so
 * no sentence is built from parts.
 *
 * @param error - The error that `parse` returned.
 * @param allowPartial - Whether the playground accepts a partial postcode.
 * @returns The name of the message.
 */
export function errorMessageKey(error: ParseError, allowPartial: boolean): MessageKey {
  const candidates = [
    allowPartial ? `error.${error.code}.partial` : '',
    `error.${error.code}.${error.segment ?? ''}`,
    `error.${error.code}`,
  ];
  const key = candidates.find(isMessageKey);
  if (key === undefined) throw new Error(`The catalogue has no message for ${error.code}.`);
  return key;
}

function segmentViews(postcode: Postcode | null, problem: Precision | null): SegmentView[] {
  return SEGMENT_NAMES.map((name) => ({
    name,
    label: message(`segment.${name}`),
    text: postcode?.segments[name] ?? '',
    problem: name === problem,
  }));
}

function formsOf(postcode: Postcode): PostcodeView['forms'] {
  const forms = [
    { label: message('form.canonical'), value: postcode.canonical },
    { label: message('form.display'), value: postcode.display },
    { label: message('form.compact'), value: postcode.compact },
    { label: message('form.stateName'), value: stateName(postcode.segments.state) ?? '' },
  ];
  const up = parent(postcode);
  if (up !== null) forms.push({ label: message('form.parent'), value: up.canonical });
  if (postcode.precision === 'unit') {
    forms.push({ label: message('form.redacted'), value: redact(postcode) });
  }
  return forms;
}

/**
 * Describes the text of the playground field.
 *
 * @param input - The text that the reader typed.
 * @param allowPartial - Whether to accept a partial postcode.
 * @returns What the page shows.
 */
export function describePostcode(input: string, allowPartial: boolean): PostcodeView {
  const result = parse(input, { allowPartial });
  if (result.ok) {
    const key = result.value.precision === 'unit' ? 'result.unit' : 'result.partial';
    return {
      status: 'valid',
      message: message(key),
      segments: segmentViews(result.value, null),
      forms: formsOf(result.value),
      suggestion: null,
    };
  }
  const { error } = result;
  return {
    status: error.code === 'empty' ? 'idle' : 'invalid',
    message: message(
      error.code === 'empty' ? 'playground.idle' : errorMessageKey(error, allowPartial),
    ),
    segments: segmentViews(null, error.segment),
    forms: [],
    suggestion: error.suggestion,
  };
}

/**
 * Describes what a GPS fix of a given accuracy can show.
 *
 * @param text - The accuracy in metres, as the reader typed it. Empty text gives null.
 * @returns The message, or null when the field is empty. A negative or invalid number gives the
 *   message for an invalid accuracy.
 */
export function describeAccuracy(text: string): string | null {
  if (text.trim() === '') return null;
  const metres = Number(text);
  if (!Number.isFinite(metres) || metres < 0) return message('accuracy.invalid');
  const key = `accuracy.${precisionForAccuracy(metres)}`;
  if (!isMessageKey(key)) throw new Error(`The catalogue has no message ${key}.`);
  return message(key);
}
