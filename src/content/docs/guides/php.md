---
title: Check and look up postcodes in PHP
description: Read Nigeria's digital postcodes offline and query NIPOST's gateway with gatepost/postcode.
sidebar:
  label: PHP
  order: 3
---

`gatepost/postcode` reads the postcodes that users type or paste, with no network call. Its client queries NIPOST's gateway with your own API key. It needs PHP 8.1 or later, and it does not need the intl or mbstring extensions.

## Install

```sh
composer require gatepost/postcode
```

## Read a postcode

`Postcode::parse` takes the text that a user typed, and returns a result. It never throws.

```php
<?php

use Gatepost\Postcode\Postcode;

$result = Postcode::parse('ek 01 a03 fk 01');
if ($result->isOk()) {
    echo $result->value->canonical, "\n"; // EK-01-A03-FK-01
    echo $result->value->display, "\n"; // EK 01 A03 FK 01
}
```

When `isOk()` is false, `error->code` names the first problem that `parse` found. The codes are the same in every Gatepost SDK. The [TypeScript guide](../typescript/#tell-the-user-what-is-wrong) lists them. For a typo with a look-alike character, `error->suggestion` holds the fixed postcode.

```php
<?php

use Gatepost\Postcode\Postcode;

$typo = Postcode::parse('EK-O1-A03-FK-01');
echo $typo->error?->code->value, "\n"; // bad_segment
echo $typo->error?->suggestion, "\n"; // EK-01-A03-FK-01
```

Show the suggestion as a question, and let the user accept it.

## Look up a postcode

The client needs a PSR-18 HTTP client and a PSR-17 request factory, such as Guzzle 7.

```sh
composer require guzzlehttp/guzzle
```

Keep the key on a server, and read it from the environment. Set the timeout of your HTTP client, and pass the same value as `timeoutMs`. PSR-18 has no timeout of its own, so the client relies on the timeout of the HTTP client. One `timeoutMs` applies to every call. When you pass none, the client waits 8000 ms, and 15000 ms for `autocomplete`.

```php
<?php

use Gatepost\Postcode\Client\PostcodeClient;
use Gatepost\Postcode\Client\PostcodeException;
use GuzzleHttp\Client;
use GuzzleHttp\Psr7\HttpFactory;

$client = new PostcodeClient(
    new Client(['timeout' => 15]),
    new HttpFactory(),
    apiKey: getenv('NIPOST_API_KEY') ?: null,
    timeoutMs: 15000,
);

try {
    $result = $client->lookup('FC-01-Z99-ZZ-01');
    echo $result->valid ? 'valid' : 'not found', "\n"; // valid
} catch (PostcodeException $error) {
    echo $error->errorCode()->value, "\n";
}
```

An empty string for `apiKey` throws an `InvalidArgumentException`. With `null`, the client sends no key, and the gateway answers 401.

The examples on this page use `FC-01-Z99-ZZ-01`, a synthetic postcode. They show the answers of Gatepost's mock gateway, which runs them in CI. The real gateway does not know this postcode.

`lookup` checks the postcode with `Postcode::parse` first, and sends no request for a bad postcode. Pass `level: 2` for more data, when your key allows it. Each failed call throws a `PostcodeException`. Its `errorCode()` gives the same codes as the [TypeScript client](../typescript-client/#handle-errors).

## Find a place and complete a postcode

`reverse` finds the postcode at a latitude and a longitude. `autocomplete` names the segment that the user is typing, and returns the gateway's values for it.

```php
<?php

use Gatepost\Postcode\Client\PostcodeClient;
use GuzzleHttp\Client;
use GuzzleHttp\Psr7\HttpFactory;

$client = new PostcodeClient(
    new Client(['timeout' => 15]),
    new HttpFactory(),
    apiKey: getenv('NIPOST_API_KEY') ?: null,
    timeoutMs: 15000,
);

$place = $client->reverse(9.0, 7.0);
echo $place->unit?->postcode->canonical, "\n"; // FC-01-Z99-ZZ-01

$typing = $client->autocomplete('fc 01 z');
echo $typing->segment->value, "\n"; // district
```

The client is synchronous. Each call waits for its result, and the client sends one request at a time.

## Next steps

- [Read the API reference of `gatepost/postcode`](../../reference/php/).
- [Read the postcode grammar](../../spec/grammar/) that every SDK follows.
