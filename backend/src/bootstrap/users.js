'use strict';

/**
 * New signups always become students.
 *
 * Deliberate: the signup endpoint is public, so if the client could pick a role
 * then anyone could register as an admin. Everything above student is granted by
 * an admin afterwards, which is what the spec means by "Admin assigns roles".
 */
async function setDefaultSignupRole(strapi, roleType = 'student') {
  const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
  const advanced = await store.get({ key: 'advanced' });

  if (advanced?.default_role === roleType) return;

  await store.set({ key: 'advanced', value: { ...advanced, default_role: roleType } });
  strapi.log.info(`[bootstrap] default signup role set to "${roleType}"`);
}

/**
 * Creates the first admin account from environment variables, if it does not
 * exist yet.
 *
 * Without this a fresh deploy has no admin, and no way to promote anyone into
 * one - the endpoint that assigns roles is itself admin-only. Skipped entirely
 * when the variables are unset, so local development is unaffected.
 */
async function seedAdminUser(strapi) {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) return;

  const users = strapi.query('plugin::users-permissions.user');
  const existing = await users.findOne({ where: { email: email.toLowerCase() } });

  if (existing) return;

  const role = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'admin' } });

  if (!role) {
    strapi.log.warn('[bootstrap] admin role missing, cannot seed the admin user');
    return;
  }

  // add() goes through the users-permissions service so the password is hashed.
  await strapi.plugin('users-permissions').service('user').add({
    username: process.env.SEED_ADMIN_USERNAME || 'admin',
    email: email.toLowerCase(),
    password,
    provider: 'local',
    confirmed: true,
    blocked: false,
    role: role.id,
  });

  strapi.log.info(`[bootstrap] seeded admin account for ${email}`);
}

module.exports = { setDefaultSignupRole, seedAdminUser };
