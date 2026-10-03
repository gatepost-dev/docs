---
title: Look up postcodes in TypeScript
description: Ask NIPOST's gateway about a postcode, a place or a typed code with @gatepost/client.
sidebar:
  label: TypeScript client
  order: 2
---

`@gatepost/client` calls NIPOST's postcode gateway with your own API key. It checks each postcode offline first, so a bad code sends no request. It retries a failed request when a retry can help.

## Install

```sh
pnpm add @gatepost/client
```

The package installs `@gatepost/core` too. Node 22 and current browsers have the `fetch` that the client uses.

## Keep the key on a server

The gateway refuses every call without a key. A key that starts with `nipost_test_` or `nipost_live_` is a secret. Keep it on a server, and read it from the environment. The client refuses a secret key in a web page.

```ts
import { PostcodeClient } from '@gatepost/client';

const client = new PostcodeClient({ apiKey: process.env['NIPOST_API_KEY'] });
const result = await client.lookup('fc 01 z99 zz 01');
result.postcode.canonical; // 'FC-01-Z99-ZZ-01'
result.valid; // true
```

The examples on this page use `FC-01-Z99-ZZ-01`, a synthetic postcode. They show the answers of Gatepost's mock gateway, which runs them in CI. The real gateway does not know this postcode.

## Look up a postcode

A postcode that the gateway does not know is a result with `valid` set to false. It is not an error.

```ts
import { PostcodeClient } from '@gatepost/client';

const client = new PostcodeClient({ apiKey: process.env['NIPOST_API_KEY'] });
const unknown = await client.lookup('FC-01-Z99-ZZ-02');
unknown.valid; // false
unknown.status; // 'not_found'
```

`lookup` asks for level 1 when you give no level. NIPOST's docs say that level 1 tells only whether a postcode exists. Level 2 adds the names of the places that hold it and a recent house address. Level 3 adds what the building is used for. Levels 2 and higher use credits, and your key must allow the level.

```ts
import { PostcodeClient } from '@gatepost/client';

const client = new PostcodeClient({ apiKey: process.env['NIPOST_API_KEY'] });
const result = await client.lookup('FC-01-Z99-ZZ-01', { level: 2 });
result.levelReceived; // 2
result.administrativeAddress?.lgaName; // 'SYNTHETIC LGA'
```

The gateway does not say which level it sent, so `levelReceived` comes from the fields of the response.

## Handle errors

Each call throws a `PostcodeError` when it cannot give a result. Its `code` tells you what to do.

<div class="table-scroll" role="region" tabindex="0" aria-label="Table: Error codes of the client">

| Code                   | What to do                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invalid_input`        | Ask the user to correct the postcode. The client sends no request for a bad postcode. The code also covers a 4xx response that no other code names. |
| `unauthorized`         | Check that the key is present and correct.                                                                                                          |
| `forbidden`            | Ask for a lower level, or get a key that allows the level.                                                                                          |
| `origin_not_allowed`   | Add the address of the page to the key in NIPOST's dashboard.                                                                                       |
| `insufficient_credits` | Use level 1, or ask NIPOST about credits for the level.                                                                                             |
| `rate_limited`         | Wait for `retryAfterMs` when it is not null, then try again. The client already retried a wait of 10 s or less.                                     |
| `server_error`         | Try again later. The client retries a 502, 503 or 504 only. Any other 5xx ends the call at once.                                                    |
| `network_error`        | Check the network, then try again later. The client has already retried.                                                                            |
| `timeout`              | Try again, or raise `timeoutMs`. The client retries `lookup` and `reverse`, but not `autocomplete`.                                                 |
| `unexpected_response`  | Report it. The gateway sent a body that the client cannot read. The client does not retry.                                                          |

</div>

```ts
import { PostcodeClient, PostcodeError } from '@gatepost/client';

const client = new PostcodeClient({ apiKey: process.env['NIPOST_API_KEY'] });
try {
  await client.lookup('900108');
} catch (error) {
  if (error instanceof PostcodeError) {
    error.code; // 'invalid_input'
  }
}
```

Show the user your own message for each code. The message of the error is for developers.

## Find the postcode of a place

`reverse` takes a latitude and a longitude in degrees. The gateway looks for a unit within 25 m, or within the radius that you give, up to 250 m.

```ts
import { PostcodeClient } from '@gatepost/client';

const client = new PostcodeClient({ apiKey: process.env['NIPOST_API_KEY'] });
const place = await client.reverse(9, 7, { maxDistanceM: 50 });
place.found; // true
place.unit?.postcode.canonical; // 'FC-01-Z99-ZZ-01'
```

`found` can be true while `unit` is null. The gateway then found an area, but no unit within the radius. Before you show a unit, check the accuracy of the GPS fix with `precisionForAccuracy` from `@gatepost/core`.

## Complete a postcode while the user types

`autocomplete` takes the text that a user typed. It names the segment that the user is typing, and returns the gateway's values for it. Cancel the last call at each keystroke, as the example does with `abort`.

```ts
import { PostcodeClient } from '@gatepost/client';

const client = new PostcodeClient({ apiKey: process.env['NIPOST_API_KEY'] });
const previous = new AbortController();
const stale = client.autocomplete('fc 01', { signal: previous.signal }).catch(() => null);
previous.abort();
const typing = await client.autocomplete('fc 01 z');
typing.segment; // 'district'
typing.suggestions[0]?.postcode?.canonical; // 'FC-01-Z99'
await stale; // null
```

A cancelled call ends with the reason of the signal, not with a `PostcodeError`.

## Choose the settings

<div class="table-scroll" role="region" tabindex="0" aria-label="Table: Client settings">

| Option       | Meaning                                  | Default                                  |
| ------------ | ---------------------------------------- | ---------------------------------------- |
| `apiKey`     | the key for the `X-API-Key` header       | none                                     |
| `baseUrl`    | the address of the gateway               | `https://api.postcode.gov.ng`            |
| `timeoutMs`  | the longest wait for one attempt         | 8000 ms, and 15000 ms for `autocomplete` |
| `maxRetries` | the most retries after the first attempt | 2                                        |
| `cacheTtlMs` | how long the client keeps a result       | 0, so it keeps none                      |

</div>

The client sends at most 4 requests at a time, and identical calls share one request. It never logs, and none of its error messages holds your key.

## Next steps

- [Read the client contract](../../spec/client/) that every Gatepost client follows.
- [Read the API reference of `@gatepost/client`](../../reference/js/client/).
