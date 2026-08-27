module.exports = ({ env }) => [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    /**
     * Only the Next.js app may call this API from a browser.
     *
     * FRONTEND_URL takes a comma-separated list rather than a single value,
     * because Vercel gives every deployment its own hostname: the production
     * domain, plus a different one per preview branch. With one origin allowed,
     * previews look broken in a way that has nothing to do with the branch.
     */
    name: 'strapi::cors',
    config: {
      origin: env('FRONTEND_URL', 'http://localhost:3000')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
