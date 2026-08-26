'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

/**
 * Reading is open to everyone - the controller decides which version of the
 * document comes back. Writing runs through the authorship policy.
 */
module.exports = createCoreRouter('api::blog-post.blog-post', {
  config: {
    update: { policies: ['is-post-author'] },
    delete: { policies: ['is-post-author'] },
  },
});
