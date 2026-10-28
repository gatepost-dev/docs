---
title: Validate a Nigerian postcode
description: Validate a Nigerian postcode in TypeScript, PHP or an HTML form. Check the format offline, then ask NIPOST's gateway whether it exists.
sidebar:
  label: Validate a postcode
---

A check of a postcode has two steps.

1. Check the format. Gatepost does this offline, with no API key and no network call. The check finds typos, old 6-digit postcodes and unknown state codes.
2. Ask NIPOST's gateway whether the postcode exists. Only the gateway knows, and it needs your own API key.

Each example below checks the format. It accepts spaces, hyphens and any letter case, so `ek 01 a03 fk 01` gives `EK-01-A03-FK-01`. The [postcode format](../postcode-format/) page explains the rules.

## TypeScript or JavaScript

`parse` from `@gatepost/core` takes the text that a user typed. It returns a result, and it never throws. The package runs in Node 22 or later and in current browsers.

```sh
pnpm add @gatepost/core
```

The first alpha is not published yet. This page will say when it is.

```ts
import { parse } from '@gatepost/core';

const result = parse('ek 01 a03 fk 01');
if (result.ok) {
  result.value.canonical; // 'EK-01-A03-FK-01'
}

const typo = parse('EK-O1-A03-FK-01');
if (!typo.ok) {
  typo.error.code; // 'bad_segment'
  typo.error.suggestion; // 'EK-01-A03-FK-01'
}
```

When `ok` is false, `error.code` names the first problem. The [TypeScript guide](../guides/typescript/#tell-the-user-what-is-wrong) lists each code. Show a suggestion as a question, and let the user accept it.

## PHP

`Postcode::parse` from `gatepost/postcode` works in the same way. It needs PHP 8.1 or later. The [PHP guide](../guides/php/#install) shows how to install it with Composer.

```php
<?php

use Gatepost\Postcode\Postcode;

$result = Postcode::parse('ek 01 a03 fk 01');
if ($result->isOk()) {
    echo $result->value->canonical, "\n"; // EK-01-A03-FK-01
}

$typo = Postcode::parse('EK-O1-A03-FK-01');
echo $typo->error?->code->value, "\n"; // bad_segment
echo $typo->error?->suggestion, "\n"; // EK-01-A03-FK-01
```

## An HTML form

`@gatepost/field` adds a postcode field to any HTML form. It checks the format while the user types. When the text is a postcode, the form sends its canonical form.

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@gatepost/field/dist/element.js"></script>
<form action="/address">
  <gatepost-postcode-field name="postcode" required></gatepost-postcode-field>
  <button>Continue</button>
</form>
```

A user who types `fc 01 z99 zz 01` sends `postcode=FC-01-Z99-ZZ-01`. With no key, the field checks the format offline and sends no request. The [HTML field guide](../guides/html/) shows how to install the field, and it explains each setting.

## Ask NIPOST whether a postcode exists

A postcode in the right format can still be one that NIPOST did not assign. A lookup asks NIPOST's gateway about the postcode. [Get a key](../start/#get-a-key) from NIPOST, and then follow the guide for your language.

- [Look up a postcode in TypeScript](../guides/typescript-client/).
- [Look up a postcode in PHP](../guides/php/#look-up-a-postcode).

With a publishable key, the HTML field also asks the gateway about each whole postcode.

## A WooCommerce shop

Gatepost Postcode for WooCommerce shows the postcode field for Nigerian addresses in the checkout, and it checks each postcode. Read the [WooCommerce guide](../guides/woocommerce/).
