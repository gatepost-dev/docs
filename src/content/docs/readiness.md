---
title: Readiness tracker
description: Common tools that reject or hide Nigeria's new postcode, and the state of the fix for each one.
---

On 1 October 2026, NIPOST launched a postcode of 11 letters and digits, as [its docs](https://docs.postcode.gov.ng) describe. Some common tools still accept only the old 6-digit postcode, or hide the postcode field for Nigeria. Gatepost has sent a fix to three of the five tools below and has not sent a fix to the other two. This page shows the state on 3 October 2026.

<div class="table-scroll" role="region" tabindex="0" aria-label="Table: Readiness of common tools">

| Tool                                                                      | What fails                                              | Fix          | Status                                                                                |
| ------------------------------------------------------------------------- | ------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------- |
| [postcode-validator](https://github.com/melwynfurtado/postcode-validator) | The rule for NG accepts only 6 digits.                  | pull request | [sent, open](https://github.com/melwynfurtado/postcode-validator/pull/302)            |
| [faker-js](https://github.com/faker-js/faker)                             | The `en_NG` locale makes 4-digit and 5-digit postcodes. | pull request | [sent, open, approved by one maintainer](https://github.com/faker-js/faker/pull/4124) |
| [Shopify worldwide](https://github.com/Shopify/worldwide)                 | The rule for NG accepts only 6 digits.                  | pull request | [sent, open](https://github.com/Shopify/worldwide/pull/622)                           |
| [WooCommerce](https://github.com/woocommerce/woocommerce)                 | The checkout hides the postcode field for NG.           | pull request | not sent                                                                              |
| [Google libaddressinput](https://github.com/google/libaddressinput)       | The rule for NG accepts only 6 digits.                  | issue        | not sent                                                                              |

</div>

The fixes for postcode-validator and Shopify worldwide accept both the old 6-digit postcode and the new 11-character postcode. They reject `00` in the LGA and the unit, as NIPOST's format does. The fix for faker-js makes postcodes in the new form only, and it never makes `00` in the LGA or the unit.

When a fix is sent, the row links the pull request or the issue.
