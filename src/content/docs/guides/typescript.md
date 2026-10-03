---
title: Check postcodes in TypeScript
description: Read, clean and format Nigeria's digital postcodes with @gatepost/core, with no network call.
sidebar:
  label: TypeScript
  order: 1
---

`@gatepost/core` reads the postcodes that users type or paste. It runs in Node 22 or later and in current browsers. It makes no network call, so it needs no API key.

## Install

The first alpha is not published yet. This page will say when it is.

```sh
pnpm add @gatepost/core
```

## Read a postcode

`parse` takes the text that a user typed, and returns a result. When `ok` is true, `value` holds the postcode in three forms.

```ts
import { parse } from '@gatepost/core';

const result = parse('ek 01 a03 fk 01');
if (result.ok) {
  result.value.canonical; // 'EK-01-A03-FK-01'
  result.value.display; // 'EK 01 A03 FK 01'
  result.value.compact; // 'EK01A03FK01'
}
```

Store the compact or the canonical form, and show the display form to people. `parse` accepts spaces, hyphens, dashes and any letter case. It also accepts the full-width characters that some phone keyboards type. It never throws.

## Tell the user what is wrong

When `ok` is false, `error.code` names the first problem that `parse` found.

<div class="table-scroll" role="region" tabindex="0" aria-label="Table: Error codes of parse">

| Code            | Meaning                                                  |
| --------------- | -------------------------------------------------------- |
| `empty`         | The text holds no letters or digits.                     |
| `legacy_code`   | The text is an old 6-digit postcode.                     |
| `bad_character` | The text holds a character that no postcode has.         |
| `bad_length`    | The text has too many or too few characters.             |
| `unknown_state` | The first two letters do not name a state.               |
| `bad_segment`   | One segment breaks its rule, for example a unit of `00`. |

</div>

For `unknown_state` and `bad_segment`, `error.segment` names the segment. When a look-alike character causes the problem, `error.suggestion` holds the fixed postcode.

```ts
import { parse } from '@gatepost/core';

const typo = parse('EK-O1-A03-FK-01');
if (!typo.ok) {
  typo.error.code; // 'bad_segment'
  typo.error.segment; // 'lga'
  typo.error.suggestion; // 'EK-01-A03-FK-01'
}
```

Show the suggestion as a question, and let the user accept it. `parse` never accepts the fixed code by itself.

## Recognise an old postcode

Many records still hold a legacy postcode of 6 digits. It names an area, not a building. `isLegacy` recognises one, so your form can ask for the new postcode.

```ts
import { isLegacy } from '@gatepost/core';

isLegacy('900 108'); // true
isLegacy('EK-01-A03-FK-01'); // false
```

## Work with part of a postcode

Set `allowPartial` to accept a postcode that stops after a segment. `precision` names the last segment that the postcode holds. `truncate`, `parent` and `contains` move between the segments.

```ts
import { contains, parent, parse, truncate } from '@gatepost/core';

const building = parse('EK-01-A03-FK-01');
const district = parse('EK 01 A03', { allowPartial: true });
if (building.ok && district.ok) {
  district.value.precision; // 'district'
  truncate(building.value, 'area').canonical; // 'EK-01-A03-FK'
  parent(building.value)?.canonical; // 'EK-01-A03-FK'
  contains(district.value, building.value); // true
}
```

## Use a GPS fix

A phone reports the accuracy of each GPS fix in metres. `precisionForAccuracy` gives the most precise segment that a fix of that accuracy supports. Do not show a unit for a fix that cannot tell two buildings apart.

```ts
import { precisionForAccuracy } from '@gatepost/core';

precisionForAccuracy(6); // 'unit'
precisionForAccuracy(35); // 'district'
precisionForAccuracy(null); // 'lga'
```

## Keep postcodes out of logs

A full postcode names one building. `redact` hides the unit, so a log shows the area and not the building.

```ts
import { parse, redact } from '@gatepost/core';

const result = parse('EK-01-A03-FK-01');
if (result.ok) {
  redact(result.value); // 'EK-01-A03-FK-**'
}
```

## Next steps

- [Look up a postcode with the gateway](../typescript-client/).
- [Try the parser in the playground](../../playground/).
- [Read the API reference of `@gatepost/core`](../../reference/js/core/).
