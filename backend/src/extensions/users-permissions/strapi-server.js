'use strict';

/**
 * Extends Strapi's users-permissions plugin.
 *
 * Why this exists: the stock GET /api/users/me does not tell a user what role
 * they have. Strapi sanitises the response against the caller's permissions, and
 * since only admins may read the roles table, the `role` relation is stripped out
 * for everyone else - a student calling /me gets no role back at all.
 *
 * The frontend needs the role on every request to decide what to render, so
 * rather than granting all users read access to the roles table (which would
 * expose every role and its permissions), we replace `me` with a version that
 * returns the caller's own role only. A user reading their own role is not a
 * privileged lookup.
 *
 * The response shape is built explicitly rather than spreading the record, so
 * password hashes and reset tokens cannot leak by accident.
 */
module.exports = (plugin) => {
  plugin.controllers.user.me = async (ctx) => {
    const authUser = ctx.state.user;

    if (!authUser) {
      return ctx.unauthorized();
    }

    const user = await strapi.query('plugin::users-permissions.user').findOne({
      where: { id: authUser.id },
      populate: { role: true },
    });

    if (!user) {
      return ctx.notFound();
    }

    ctx.body = {
      id: user.id,
      documentId: user.documentId,
      username: user.username,
      email: user.email,
      confirmed: user.confirmed,
      blocked: user.blocked,
      createdAt: user.createdAt,
      role: user.role
        ? { id: user.role.id, name: user.role.name, type: user.role.type }
        : null,
    };
  };

  return plugin;
};
