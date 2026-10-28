---
title: Nigeria's digital postcode format
description: "The format of Nigeria's NIPOST postcode: five segments, three written forms, the characters of each segment and a regex for the format check."
sidebar:
  label: Postcode format
---

On 1 October 2026, NIPOST launched a digital postcode for addressable buildings and locations in Nigeria. A postcode has 11 letters and digits in five segments, such as `EK-01-A03-FK-01`. This page describes the format. The [postcode grammar](../spec/grammar/) holds the full rules that every Gatepost SDK follows.

## The five segments

From large to small, the segments are the state, the LGA, the district, the area and the unit. The unit names one building or delivery point.

<div class="table-scroll" role="region" tabindex="0" aria-label="Table: Segments of a postcode">

| Segment  | Example | Length | Characters        | Rule                                              |
| -------- | ------- | ------ | ----------------- | ------------------------------------------------- |
| State    | `EK`    | 2      | letters           | one of the 37 [state codes](../spec/state-codes/) |
| LGA      | `01`    | 2      | digits            | `01` to `99`                                      |
| District | `A03`   | 3      | letters or digits | any combination of letters and digits             |
| Area     | `FK`    | 2      | letters           | any two letters                                   |
| Unit     | `01`    | 2      | digits            | `01` to `99`                                      |

</div>

The letters are A to Z, and the digits are 0 to 9. The LGA is a local government area within the state. The district is within the LGA. The area is the smallest polygon in the system.

`00` is never a valid LGA or unit. Both segments run from `01` to `99`, so an area holds at most 99 units. `parse` rejects `EK-01-A03-FK-00` with the error `bad_segment`.

## Partial postcodes

A partial postcode stops after the state, the LGA, the district or the area. It has 2, 4, 7 or 9 letters and digits, such as `EK-01-A03` for a district. `parse` accepts a partial postcode only with the option `allowPartial`.

## Written forms

Gatepost writes a postcode in three forms. All three name the same postcode.

<div class="table-scroll" role="region" tabindex="0" aria-label="Table: Written forms">

| Form      | Example           | Use                    |
| --------- | ----------------- | ---------------------- |
| Canonical | `EK-01-A03-FK-01` | APIs and logs          |
| Display   | `EK 01 A03 FK 01` | screens and print      |
| Compact   | `EK01A03FK01`     | storage and comparison |

</div>

People type postcodes in many ways. Before Gatepost checks a postcode, it normalises the text in three steps:

1. It applies Unicode NFKC. This changes full-width letters and digits to ASCII.
2. It removes each separator: white space, hyphens and dashes, the full stop and zero-width characters.
3. It changes the letters a to z to upper case.

So `ek 01 a03 fk 01`, `EK.01.A03.FK.01` and `EK01A03FK01` are the same postcode.

## Old 6-digit postcodes

Before the digital postcode, NIPOST used postcodes of 6 digits. Many records still hold such a legacy postcode.

<div class="table-scroll" role="region" tabindex="0" aria-label="Table: Legacy and digital postcodes">

| Detail     | Legacy postcode | Digital postcode         |
| ---------- | --------------- | ------------------------ |
| Example    | `900108`        | `EK-01-A03-FK-01`        |
| Length     | 6               | 11                       |
| Characters | digits          | letters and digits       |
| Names      | an area         | one building or location |

</div>

`parse` gives the error `legacy_code` for exactly 6 digits, and `isLegacy` recognises a legacy postcode. Your form can then ask for the new postcode.

## A regex for the format check

`parse` is the full check. Use a regex where no Gatepost SDK runs, such as in a database rule. This regex accepts the three forms in upper case. It checks the state code and the range of the LGA and the unit.

```ts
const POSTCODE =
  /^(?:AB|AD|AK|AN|BA|BE|BR|BY|CR|DE|EB|ED|EK|EN|FC|GM|IM|JI|KD|KE|KG|KN|KT|KW|LA|NA|NI|OG|ON|OS|OY|PL|RI|SK|TA|YB|ZA)[ -]?(?:0[1-9]|[1-9][0-9])[ -]?[A-Z0-9]{3}[ -]?[A-Z]{2}[ -]?(?:0[1-9]|[1-9][0-9])$/;

POSTCODE.test('EK-01-A03-FK-01'); // true
POSTCODE.test('EK 01 A03 FK 01'); // true
POSTCODE.test('EK01A03FK01'); // true
POSTCODE.test('EK-01-A03-FK-00'); // false
POSTCODE.test('XX-01-A03-FK-01'); // false
POSTCODE.test('900108'); // false
```

The regex does less than `parse`. It does not normalise the text. Remove the white space at the start and the end, and change the letters to upper case first. The regex gives no reason for a failure and no suggestion for a typo.

:::note
A postcode in the right format can still be one that NIPOST did not assign. Only NIPOST's gateway can say whether a postcode exists. [Look up a postcode](../guides/typescript-client/) to ask it.
:::

## Next steps

- [Validate a postcode](../validate-postcode/) in TypeScript, PHP or an HTML form.
- [Find the code of a state](../spec/state-codes/).
- [Check a postcode in the playground](../playground/).
