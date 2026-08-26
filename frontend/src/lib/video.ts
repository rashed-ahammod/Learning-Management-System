/**
 * Works out whether a lesson's video URL can be embedded, and how.
 *
 * The allow-list is the point. A videoUrl is typed in by an instructor, and
 * dropping whatever they wrote into an <iframe src> means letting them load an
 * arbitrary page inside ours - which, given instructors are only semi-trusted
 * here, is a foothold nobody needs. So only hosts we recognise are turned into
 * embeds; anything else is rendered as an ordinary link the reader can choose to
 * follow, where the browser's usual rules apply.
 */
export type VideoEmbed =
  | { kind: 'embed'; src: string; provider: 'YouTube' | 'Vimeo' }
  | { kind: 'link'; href: string }
  | null;

export function resolveVideo(rawUrl: string | null | undefined): VideoEmbed {
  if (!rawUrl || rawUrl.trim() === '') return null;

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    // Not a URL at all - nothing sensible to render.
    return null;
  }

  // Only ever http(s). Blocks javascript: and data: before they reach an href.
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.replace(/^www\./, '');

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = url.searchParams.get('v');
    if (id && isPlausibleId(id)) {
      return { kind: 'embed', src: `https://www.youtube.com/embed/${id}`, provider: 'YouTube' };
    }
  }

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1);
    if (isPlausibleId(id)) {
      return { kind: 'embed', src: `https://www.youtube.com/embed/${id}`, provider: 'YouTube' };
    }
  }

  if (host === 'vimeo.com') {
    const id = url.pathname.slice(1);
    if (/^\d+$/.test(id)) {
      return { kind: 'embed', src: `https://player.vimeo.com/video/${id}`, provider: 'Vimeo' };
    }
  }

  return { kind: 'link', href: url.toString() };
}

/** Video ids are short and alphanumeric; anything else is not one. */
function isPlausibleId(value: string): boolean {
  return /^[\w-]{5,20}$/.test(value);
}
