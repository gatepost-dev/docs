// SPDX-FileCopyrightText: 2026 The Gatepost authors
// SPDX-License-Identifier: Apache-2.0
// Copies the checkout screenshot of the WooCommerce plugin from its submodule, so that the guide
// shows the image that the plugin shows, from this site and from no other.
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/** The screenshot in the plugin submodule. It shows synthetic values. */
export const PLUGIN_IMAGE = 'assets/checkout-postcode-field.png';

const COPY = 'public/woocommerce-checkout-postcode-field.png';

/**
 * Copies the screenshot into the public folder of the site, which the build serves as it is.
 * The build calls it before it reads the pages.
 *
 * @param root - The root folder of the docs repo, which holds the `woocommerce` submodule.
 * @param out - The folder that receives the copy. It is the root folder by default.
 */
export function copyPluginImage(root: string, out: string = root): void {
  const target = join(out, COPY);
  mkdirSync(join(target, '..'), { recursive: true });
  copyFileSync(join(root, 'woocommerce', PLUGIN_IMAGE), target);
}
