---
title: Choose a tool
description: Find the Gatepost package that fits your app, and learn what each one needs.
---

Each Gatepost tool follows the same spec, so each one reads a postcode in the same way. Choose by the language of your app and by what it must know.

<div class="table-scroll" role="region" tabindex="0" aria-label="Table: Gatepost tools">

| You want to                                              | Use                                                | Needs a key      |
| -------------------------------------------------------- | -------------------------------------------------- | ---------------- |
| Check the form of a postcode in TypeScript or JavaScript | [`@gatepost/core`](../guides/typescript/)          | no               |
| Look up a postcode from a TypeScript server              | [`@gatepost/client`](../guides/typescript-client/) | yes              |
| Check or look up a postcode in PHP                       | [`gatepost/postcode`](../guides/php/)              | only for lookups |

</div>

## What a check of the form tells you

The core packages read the text that a user typed. They tell you whether the text has the form of a postcode, and what is wrong when it does not. They work offline, so they cost nothing and send nothing.

A postcode with the right form can still be wrong. Only NIPOST's gateway knows which postcodes exist. Check the form first, and then ask the gateway when your app needs to know more.

## Get a key

The gateway refuses every call without a key. Register on [NIPOST's dashboard](https://dashboard.postcode.gov.ng/register) to get one. NIPOST gives two kinds of key.

- A secret key starts with `nipost_test_` or `nipost_live_`. Keep it on a server.
- A publishable key starts with `nipost_pk_test_` or `nipost_pk_live_`. A web page can hold it, but it works only from the addresses that you allow in the dashboard.

Test keys work only on NIPOST's staging gateway. NIPOST's docs explain the levels, the credits and the limits: [docs.postcode.gov.ng](https://docs.postcode.gov.ng).
