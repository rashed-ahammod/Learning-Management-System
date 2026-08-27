module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  // Railway injects PORT and expects the app to bind to it.
  port: env.int('PORT', 1337),

  /**
   * The public address of this API.
   *
   * Strapi builds absolute URLs from this - the admin panel's own asset paths
   * among them. Left unset behind a proxy it guesses from the request and gets
   * http:// where the browser expects https://, which shows up as an admin panel
   * that loads a blank page and complains about mixed content.
   */
  url: env('PUBLIC_URL', undefined),

  /**
   * Trust the proxy in front of us.
   *
   * Railway terminates TLS and forwards over plain HTTP, saying so in
   * X-Forwarded-Proto. Without this Koa judges the connection by the hop it can
   * see, decides it is insecure, and then refuses to send the refresh-token
   * cookie that users-permissions marks `secure` on login - which surfaces as
   * every sign-in returning a 500 in production and working perfectly locally.
   *
   * Note the shape: Strapi reads `server.proxy.koa`, so a bare boolean here is
   * accepted without complaint and quietly does nothing.
   */
  proxy: { koa: env.bool('IS_PROXIED', false) },

  app: {
    keys: env.array('APP_KEYS'),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});
