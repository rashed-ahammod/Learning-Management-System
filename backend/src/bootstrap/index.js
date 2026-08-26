'use strict';

const { seedRoles } = require('./roles');
const { applyPermissions } = require('./permissions');
const { setDefaultSignupRole, seedAdminUser } = require('./users');

/**
 * Runs on every boot, in this order - each step depends on the one before it.
 * Every step is idempotent, so restarting is always safe.
 */
module.exports = async function bootstrapApplication(strapi) {
  await seedRoles(strapi);          // the four roles must exist first...
  await applyPermissions(strapi);   // ...before permissions can be attached to them
  await setDefaultSignupRole(strapi);
  await seedAdminUser(strapi);
};
