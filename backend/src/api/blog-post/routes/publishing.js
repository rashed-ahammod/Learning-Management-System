'use strict';

/**
 * Strapi 5 has no REST endpoint for moving a document between draft and
 * published, so these two wrap the document service calls. They sit behind the
 * same authorship policy as editing, because publishing somebody else's draft
 * is every bit as much a change to their post as rewriting it.
 */
module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/blog-posts/:documentId/publish',
      handler: 'blog-post.publish',
      config: { policies: ['is-post-author'] },
    },
    {
      method: 'POST',
      path: '/blog-posts/:documentId/unpublish',
      handler: 'blog-post.unpublish',
      config: { policies: ['is-post-author'] },
    },
  ],
};
