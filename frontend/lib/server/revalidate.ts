import 'server-only';

import { revalidateTag } from 'next/cache';

/**
 * Server-only helper to revalidate a list of cache tags.
 * Kept isolated so client components can import higher-level utilities
 * without pulling server-only modules into the client bundle.
 */
export async function revalidateTags(tags: string[]): Promise<void> {
  for (const tag of tags) {
    await revalidateTag(tag);
  }
}

