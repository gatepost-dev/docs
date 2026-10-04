---
title: Add a postcode field to a web form
description: Use the gatepost-postcode-field element in any HTML form, with or without a framework.
sidebar:
  label: HTML field
  order: 4
---

`@gatepost/field` adds `<gatepost-postcode-field>`, a form field for Nigeria's digital postcode. It works in a plain HTML form. It checks the form of the postcode while the user types, and it can ask NIPOST's gateway about the postcode.

## Install

The first alpha is not published yet. This page will say when it is.

```sh
pnpm add @gatepost/field
```

Import `@gatepost/field` once in your app, and the page can use the element. A page with no build step can load the one-file build from a CDN instead, as the examples below do. Pin a version in the CDN address of a production page.

## Add the field

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@gatepost/field/dist/element.js"></script>
<form action="/address">
  <gatepost-postcode-field name="postcode" required></gatepost-postcode-field>
  <button>Continue</button>
</form>
```

The element is empty until the script runs, so the layout moves when it loads. A page with no JavaScript sends no postcode.

A `<label for>` outside the element cannot name the input inside it. Give the text with the `label` attribute.

A user who types `fc 01 z99 zz 01` sends `postcode=FC-01-Z99-ZZ-01`. With no key, the field checks the form offline and sends no request.

## Check postcodes with NIPOST

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@gatepost/field/dist/element.js"></script>
<form action="/address">
  <gatepost-postcode-field name="postcode" api-key="nipost_pk_live_your_key" confirm="level2" gps>
  </gatepost-postcode-field>
  <button>Continue</button>
</form>
```

Use a publishable key, which starts with `nipost_pk_`. Add your site to its allowed origins in NIPOST's dashboard. Anyone can read a key in a page, so the field refuses a secret key. It sends no request, and it writes one error to the console.

A key holds a lookup level, and a call above it fails. The field then says that it could not check the postcode. A postcode that the gateway does not know, or a failed request, never stops the form. The gateway's data is new, so check the postcode again on your server.

<div class="table-scroll" role="region" tabindex="0" aria-label="Table: Attributes of the field">

| Attribute                               | Values                       | Default                             |
| --------------------------------------- | ---------------------------- | ----------------------------------- |
| `name`, `value`, `required`, `disabled` | as for a native input        | none                                |
| `label`                                 | the visible label            | `Postcode`                          |
| `api-key`                               | a publishable key            | none, so the field sends no request |
| `base-url`                              | the gateway's address        | `https://api.postcode.gov.ng`       |
| `confirm`                               | `none`, `level1` or `level2` | `level1`                            |
| `gps`                                   | present or absent            | absent                              |
| `legacy`                                | `accept` or `reject`         | `accept`                            |

</div>

With `gps` and a key that the field accepts, a button puts the postcode of the user's location in the input. The field asks for the location only when the user presses the button. A location that is not precise enough gives a partial postcode, and the user types the rest. With `legacy="accept"`, the field also accepts an old 6-digit postcode.

## Listen for changes

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@gatepost/field/dist/element.js"></script>
<gatepost-postcode-field name="postcode"></gatepost-postcode-field>
<output id="chosen"></output>
<script type="module">
  const field = document.querySelector('gatepost-postcode-field');
  field.addEventListener('gatepost-change', (event) => {
    document.querySelector('#chosen').value = event.detail.value;
  });
</script>
```

The events bubble, so a page can listen on the form. At level 2, `gatepost-confirm` gives the recent house address of the postcode. The field never shows it, and your page should not show it to the person who typed the postcode. That person can have typed any postcode.

<div class="table-scroll" role="region" tabindex="0" aria-label="Table: Events of the field">

| Event              | `detail`                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `gatepost-change`  | `value`, `postcode`, `source` (`typed`, `pasted`, `suggestion` or `gps`) and `accuracyM`        |
| `gatepost-confirm` | `lookup`, the result of the lookup                                                              |
| `gatepost-error`   | `code`, an error code of `@gatepost/client`, or `secret_key`, `gps_denied` or `gps_unavailable` |

</div>

## Change the words and the look

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@gatepost/field/dist/element.js"></script>
<style>
  gatepost-postcode-field {
    --gatepost-accent: #5b2a86;
  }
</style>
<gatepost-postcode-field name="postcode" required></gatepost-postcode-field>
<script type="module">
  const field = document.querySelector('gatepost-postcode-field');
  field.messages = { label: 'Delivery postcode', empty: 'Enter the postcode of the delivery.' };
</script>
```

The `messages` property replaces messages by key. The field keeps the English text for each key that you leave out. The [field spec](../../spec/field/) lists each key.

The tokens are `--gatepost-text`, `--gatepost-muted`, `--gatepost-background`, `--gatepost-border`, `--gatepost-accent`, `--gatepost-error`, `--gatepost-warning`, `--gatepost-radius` and `--gatepost-font`. The parts `field`, `label`, `hint`, `input`, `message` and `button` take `::part()` rules.

The default colours are for a light page. They meet a contrast of 4.5:1 on white. On a dark page, set the seven colour tokens, and check your own colours on the background of your page.

```css
gatepost-postcode-field {
  --gatepost-text: #f2f5f4;
  --gatepost-muted: #b9c2be;
  --gatepost-background: #1c2321;
  --gatepost-border: #8f9b96;
  --gatepost-accent: #5ad1bf;
  --gatepost-error: #ff9d94;
  --gatepost-warning: #ffb95c;
}
```

## What the field does not do

- It stores nothing, sets no cookie and sends no telemetry.
- It sends a request only for a whole postcode, and only when it has a publishable key. It sends a location request only after the user presses the location button.
- It never shows a house address.

## Requirements

<div class="table-scroll" role="region" tabindex="0" aria-label="Table: Requirements of the field">

| Requirement   | Version                                                    |
| ------------- | ---------------------------------------------------------- |
| Browser       | a current Chrome, Edge or Firefox, or Safari 16.4 or later |
| Module format | ESM only                                                   |
| Gatepost spec | 0.3.0                                                      |

</div>

A server can import the package. It defines the element only in a browser.

## Next steps

- [Use the field in React](../react/).
- [Read the field spec](../../spec/field/), which defines the settings, the events and the states.
- [Read the API reference of `@gatepost/field`](../../reference/js/field/).
