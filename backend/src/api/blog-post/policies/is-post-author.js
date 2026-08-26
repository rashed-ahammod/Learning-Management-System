'use strict';

const { canManagePost } = require('../../../utils/access');

/**
 * Guards editing, deleting and publishing a post.
 *
 * The lookup asks for the draft on purpose. With draft and publish switched on,
 * a document has two versions, and findOne without a status returns the
 * published one - which does not exist yet for a post that has never been
 * published. Looking that up would come back empty and the author check would
 * fail for the very posts a content manager most needs to edit: their own
 * unpublished drafts.
 */
module.exports = async (policyContext, config, { strapi }) => {
  const documentId = policyContext.params.id ?? policyContext.params.documentId;

  if (!documentId) return false;

  const post = await strapi.documents('api::blog-post.blog-post').findOne({
    documentId,
    status: 'draft',
    populate: { author: { fields: ['id'] } },
  });

  return canManagePost(policyContext.state.user, post);
};
