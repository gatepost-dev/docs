---
title: Add a postcode field to a React form
description: Use the PostcodeField component of @gatepost/react in React 18 or 19, and in Next.js.
sidebar:
  label: React
  order: 5
---

`@gatepost/react` wraps the field of `@gatepost/field` in a React component. It works with React 18 and React 19. It renders on the server, and a plain form sends the postcode in its canonical form.

## Install

The first alpha is not published yet. This page will say when it is.

```sh
pnpm add @gatepost/react
```

The package installs `@gatepost/field`, the custom element that does the work.

## Add the field

```tsx
'use client';
import { useState, type ReactElement } from 'react';
import { PostcodeField } from '@gatepost/react';

export function AddressForm(): ReactElement {
  const [postcode, setPostcode] = useState('');
  return (
    <form action="/address">
      <PostcodeField
        name="postcode"
        required
        onChange={(detail) => {
          setPostcode(detail.value);
        }}
      />
      <p>{postcode}</p>
      <button>Continue</button>
    </form>
  );
}
```

A user who types `fc 01 z99 zz 01` sees `FC-01-Z99-ZZ-01`, and the form sends `postcode=FC-01-Z99-ZZ-01`.

The module starts with `'use client'`, so the component works in the App Router of Next.js. The HTML of a server render already holds the settings of the field.

## Choose the props

<div class="table-scroll" role="region" tabindex="0" aria-label="Table: Props of PostcodeField">

| Prop                                           | Meaning                                                               |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| `name`, `defaultValue`, `required`, `disabled` | as for a native input                                                 |
| `label`                                        | the visible label. The default is `Postcode`                          |
| `apiKey`                                       | a publishable key. Without one, the field sends no request            |
| `baseUrl`                                      | the gateway's address                                                 |
| `confirm`                                      | `none`, `level1` or `level2`. The default is `level1`                 |
| `gps`                                          | true shows the location button, when the field has a key              |
| `legacy`                                       | `accept` or `reject` an old 6-digit postcode. The default is `accept` |
| `messages`                                     | text that replaces the English messages, by key                       |

</div>

`onChange`, `onConfirm` and `onError` receive the detail of each event of the field. The `ref` gives the element, for `checkValidity()` and the other members of a form control.

## Read the value

The field keeps its own text, as an uncontrolled input does. `defaultValue` sets the text at first, and a form reset returns to it. A new `defaultValue` later changes that first text, and never the text that the user typed.

Read each new value in `onChange`, or read the form when it submits. On React 19, a field that the browser rendered, not hydrated, keeps its first `defaultValue` after a later change of the prop. Set a `key` on the component if you need a new first text.

The [HTML field guide](../html/) explains the key, the events, the messages and the theme tokens.

## Requirements

React 18 or 19. The browser needs are those of `@gatepost/field`. The package is ESM only, and it implements Gatepost spec 0.3.0.

## Next steps

- [Use the field without React](../html/).
- [Read the API reference of `@gatepost/react`](../../reference/js/react/).
