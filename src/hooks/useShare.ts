import { useState } from 'react';
import type { ListInput } from '../data/repositories';
import { listShareUrl } from '../lib/shareLink';
import { useJournalStore } from '../store/journalStore';
import { useRepositories } from './useRepositories';

export interface ShareState {
  busy: boolean;
  /** Screen-reader friendly result, e.g. "Link copied". */
  message: string | null;
  url: string | null;
  error: string | null;
}

/**
 * Turn a set of places into a shareable list link and hand it to the OS share sheet,
 * or copy it to the clipboard when sharing isn't available.
 */
export function useShare() {
  const repos = useRepositories();
  const invalidate = useJournalStore((s) => s.invalidate);
  const [state, setState] = useState<ShareState>({ busy: false, message: null, url: null, error: null });

  async function shareList(input: Omit<ListInput, 'shareEnabled' | 'visibility'>, text: string) {
    setState({ busy: true, message: null, url: null, error: null });
    try {
      const list = await repos.lists.create({ ...input, shareEnabled: true, visibility: 'friends' });
      invalidate();
      const url = listShareUrl(list.id);

      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: list.title, text, url });
          setState({ busy: false, message: 'Shared', url, error: null });
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            setState({ busy: false, message: null, url, error: null });
            return;
          }
          // Share sheet failed for another reason: fall through to copying.
        }
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setState({ busy: false, message: 'Link copied', url, error: null });
      } else {
        setState({ busy: false, message: 'Copy this link to share', url, error: null });
      }
    } catch (err) {
      setState({ busy: false, message: null, url: null, error: err instanceof Error ? err.message : 'Could not create a share link.' });
    }
  }

  return { ...state, shareList };
}
