import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getPublishedPost } from '@/lib/blog';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  return {
    title: post ? `${post.title} — LMS` : 'Post not found — LMS',
    description: post?.excerpt ?? undefined,
  };
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  // An unpublished post is simply not here. The backend pins non-staff readers
  // to the published version, so a draft looks exactly like a post that does
  // not exist - which is the right answer to give somebody guessing URLs.
  if (!post) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-2xl">
      <Link href="/blog" className="text-sm text-slate-500 transition hover:text-slate-900">
        ← Blog
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{post.title}</h1>

      <p className="mt-2 text-sm text-slate-500">
        {post.author ? `${post.author.username} · ` : null}
        {post.publishedAt
          ? new Date(post.publishedAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : null}
      </p>

      {post.coverImageUrl ? (
        // A plain img rather than next/image on purpose: the URL is typed in by
        // an author and could be any host, and next/image needs every host
        // listed in next.config up front. Optimising these is not worth a config
        // change every time somebody links a new image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt=""
          loading="lazy"
          className="mt-6 w-full rounded-lg border border-slate-200 object-cover"
        />
      ) : null}

      {post.body ? (
        <div className="mt-8 whitespace-pre-wrap leading-relaxed text-slate-700">{post.body}</div>
      ) : null}
    </article>
  );
}
