import Link from 'next/link';

import PostForm from '@/components/PostForm';
import { requireRole } from '@/lib/auth';

export const metadata = { title: 'New post — LMS' };

export default async function NewPostPage() {
  await requireRole('admin', 'content-manager');

  return (
    <div className="max-w-2xl">
      <Link href="/manage/blog" className="text-sm text-slate-500 transition hover:text-slate-900">
        ← Blog
      </Link>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">New post</h1>
      <p className="mt-2 text-sm text-slate-600">
        It starts as a draft. Nothing appears on the public blog until you publish it.
      </p>

      <div className="mt-8">
        <PostForm />
      </div>
    </div>
  );
}
