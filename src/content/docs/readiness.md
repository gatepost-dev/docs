---
title: Readiness tracker
description: Common tools that reject or hide Nigeria's new postcode, and the fix that Gatepost sent to each one.
---

On 1 October 2026, NIPOST launched a postcode of 11 letters and digits. Some common tools still accept only the old 6-digit postcode, or hide the postcode field for Nigeria. Gatepost sends a fix to each tool, and this page tracks each fix.

<div class="table-scroll" role="region" tabindex="0" aria-label="Table: Readiness of common tools">

| Tool                                                                      | What fails                                              | Fix          | Status                                                                     |
| ------------------------------------------------------------------------- | ------------------------------------------------------- | ------------ | -------------------------------------------------------------------------- |
| [postcode-validator](https://github.com/melwynfurtado/postcode-validator) | The rule for NG accepts only 6 digits.                  | pull request | [sent, open](https://github.com/melwynfurtado/postcode-validator/pull/302) |
| [faker-js](https://github.com/faker-js/faker)                             | The `en_NG` locale makes 4-digit and 5-digit postcodes. | pull request | [sent, open](https://github.com/faker-js/faker/pull/4124)                  |
| [Shopify worldwide](https://github.com/Shopify/worldwide)                 | The rule for NG accepts only 6 digits.                  | pull request | [sent, open](https://github.com/Shopify/worldwide/pull/622)                |
| [WooCommerce](https://github.com/woocommerce/woocommerce)                 | The checkout hides the postcode field for NG.           | pull request | not sent                                                                   |
| [Google libaddressinput](https://github.com/google/libaddressinput)       | The rule for NG accepts only 6 digits.                  | issue        | not sent                                                                   |

</div>

Each fix accepts both the old 6-digit postcode and the new 11-character postcode. Each fix also rejects `00` in the LGA and the unit, as NIPOST's format does.

When a status changes, the row links the pull request or the issue.
