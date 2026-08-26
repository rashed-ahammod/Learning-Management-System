'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { managesWholeLibrary } = require('../../../utils/access');

const UID = 'api::blog-post.blog-post';

const AUTHOR_POPULATE = { author: { fields: ['id', 'username'] } };

/**
 * Puts the author back on a sanitised post, in a narrow shape.
 *
 * Same reason as on a course: sanitizeOutput drops the relation for anyone who
 * cannot read the users table, but a byline is public information on a blog.
 */
function presentPost(sanitized, raw) {
  if (!raw?.author) return sanitized;

  return {
    ...sanitized,
    author: { id: raw.author.id, username: raw.author.username },
  };
}

module.exports = createCoreController(UID, ({ strapi }) => {
  /**
   * Which version of the document this caller is allowed to ask for.
   *
   * This is the whole draft/published rule, and it has to be forced rather than
   * defaulted. Strapi decides which version to return from the `status` query
   * parameter, and the permission system has no opinion on it - so if the client
   * were left in charge, a plain ?status=draft would hand every unpublished post
   * to anyone who can read the blog at all. Staff keep the choice; everybody
   * else is pinned to published, whatever they asked for.
   */
  function statusFor(user, requested) {
    if (!managesWholeLibrary(user)) return 'published';

    return requested === 'draft' ? 'draft' : 'published';
  }

  return {
    async find(ctx) {
      await this.validateQuery(ctx);
      const query = await this.sanitizeQuery(ctx);

      const { results, pagination } = await strapi.service(UID).find({
        ...query,
        status: statusFor(ctx.state.user, ctx.query.status),
        populate: AUTHOR_POPULATE,
      });

      const sanitized = await this.sanitizeOutput(results, ctx);

      return this.transformResponse(
        sanitized.map((entry, index) => presentPost(entry, results[index])),
        { pagination }
      );
    },

    async findOne(ctx) {
      await this.validateQuery(ctx);
      const query = await this.sanitizeQuery(ctx);

      const post = await strapi.service(UID).findOne(ctx.params.id, {
        ...query,
        status: statusFor(ctx.state.user, ctx.query.status),
        populate: AUTHOR_POPULATE,
      });

      // A draft asked for by its id looks exactly like a post that does not
      // exist, which is what we want - the response gives nothing away.
      if (!post) {
        return ctx.notFound();
      }

      const sanitized = await this.sanitizeOutput(post, ctx);

      return this.transformResponse(presentPost(sanitized, post));
    },

    /**
     * A new post is always a draft. Publishing is a separate, deliberate step,
     * which is the point of having the two states at all.
     */
    async create(ctx) {
      const payload = ctx.request.body?.data;

      if (!payload || typeof payload !== 'object') {
        return ctx.badRequest('Missing "data" payload in the request body');
      }

      // Same reason as on a course: the author is not the client's to choose,
      // and Strapi would reject the key anyway when a content manager has no
      // permission to write the users relation.
      const { author: ignoredAuthor, ...input } = payload;

      await this.validateInput(input, ctx);
      const data = await this.sanitizeInput(input, ctx);

      const post = await strapi.documents(UID).create({
        data: { ...data, author: ctx.state.user.id },
        status: 'draft',
        populate: AUTHOR_POPULATE,
      });

      const sanitized = await this.sanitizeOutput(post, ctx);

      ctx.status = 201;
      return this.transformResponse(presentPost(sanitized, post));
    },

    async update(ctx) {
      // Authorship is settled at creation - it decides who may edit the post,
      // so letting an update change it would let a post be handed away.
      if (ctx.request.body?.data) {
        delete ctx.request.body.data.author;
      }

      return super.update(ctx);
    },

    /**
     * POST /api/blog-posts/:documentId/publish
     *
     * Strapi has no REST route for this, so it is worth having an explicit one
     * rather than making the client fake it by writing a date field.
     */
    async publish(ctx) {
      const { documentId } = ctx.params;

      const draft = await strapi.documents(UID).findOne({ documentId, status: 'draft' });

      if (!draft) {
        return ctx.notFound();
      }

      // Nothing stops an empty post being saved as a draft - that is what drafts
      // are for - but publishing one puts a blank page on the public blog.
      if (!draft.body || draft.body.trim() === '') {
        return ctx.badRequest('Add some body text before publishing this post.');
      }

      await strapi.documents(UID).publish({ documentId });

      const published = await strapi.documents(UID).findOne({
        documentId,
        status: 'published',
        populate: AUTHOR_POPULATE,
      });

      const sanitized = await this.sanitizeOutput(published, ctx);

      return this.transformResponse(presentPost(sanitized, published));
    },

    /**
     * POST /api/blog-posts/:documentId/unpublish
     *
     * Takes the post off the public blog without deleting it - the draft stays
     * behind to be edited and published again.
     */
    async unpublish(ctx) {
      const { documentId } = ctx.params;

      const draft = await strapi.documents(UID).findOne({ documentId, status: 'draft' });

      if (!draft) {
        return ctx.notFound();
      }

      await strapi.documents(UID).unpublish({ documentId });

      return { data: { documentId, status: 'draft' } };
    },
  };
});
