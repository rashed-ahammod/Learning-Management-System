'use strict';

/**
 * The four application roles from the project spec.
 *
 * Strapi keeps roles in the *database*, not in code. That means a fresh deploy
 * (Railway hands us an empty Postgres) would come up with only Strapi's built-in
 * "public" and "authenticated" roles and none of ours. So instead of clicking
 * these together in the admin panel, we declare them here and recreate whatever
 * is missing on every boot - local and production stay identical.
 */
const APPLICATION_ROLES = [
  {
    type: 'admin',
    name: 'Admin',
    description: 'Full control of the platform. Manages users and assigns their roles.',
  },
  {
    type: 'content-manager',
    name: 'Content Manager',
    description:
      'Creates and manages courses, lessons and blog posts across the platform. Does not manage users.',
  },
  {
    type: 'instructor',
    name: 'Instructor',
    description:
      'Manages the lessons and quizzes of their own courses and sees the progress of their students.',
  },
  {
    type: 'student',
    name: 'Student',
    description:
      'Enrols in courses, views lessons, takes quizzes and tracks their own progress.',
  },
];

async function seedRoles(strapi) {
  const roles = strapi.query('plugin::users-permissions.role');
  const created = [];

  for (const role of APPLICATION_ROLES) {
    const existing = await roles.findOne({ where: { type: role.type } });

    if (!existing) {
      await roles.create({ data: role });
      created.push(role.type);
    }
  }

  if (created.length > 0) {
    strapi.log.info(`[bootstrap] created roles: ${created.join(', ')}`);
  }
}

module.exports = { APPLICATION_ROLES, seedRoles };
