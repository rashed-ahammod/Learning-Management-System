module.exports = ({ env }) => [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    // Only the Next.js app is allowed to call this API from a browser.
    // Locally that is localhost:3000; in production it is the Vercel URL,
    // which Railway supplies through FRONTEND_URL.
    name: 'strapi::cors',
    config: {
      origin: [env('FRONTEND_URL', 'http://localhost:3000')],
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
