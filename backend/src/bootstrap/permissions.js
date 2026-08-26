'use strict';

const COURSE = 'api::course.course';
const LESSON = 'api::lesson.lesson';
const ENROLLMENT = 'api::enrollment.enrollment';
const PROGRESS = 'api::lesson-progress.lesson-progress';

/**
 * Progress has no generated CRUD - see its routes file. These are the three
 * custom handlers, and they are the only way into the table.
 */
const TRACK_OWN_PROGRESS = [`${PROGRESS}.set`, `${PROGRESS}.mine`];
const SEE_STUDENT_PROGRESS = [`${PROGRESS}.students`];

const readOnly = (uid) => [`${uid}.find`, `${uid}.findOne`];
const fullAccess = (uid) => [...readOnly(uid), `${uid}.create`, `${uid}.update`, `${uid}.delete`];

/** Reading your own account - every signed-in role needs this. */
const OWN_ACCOUNT = ['plugin::users-permissions.user.me'];

/**
 * Which endpoints each role is allowed to call.
 *
 * An important distinction, because it is easy to get wrong: what follows is
 * *endpoint-level* access - "may this role call PUT /api/courses/:id at all".
 * It cannot express "...but only for courses they own", because a permission is
 * just an action name with no knowledge of the row being touched.
 *
 * So the row-level rules live one layer down, in the controllers and policies:
 *   - an instructor may call course.update, but the policy rejects it unless
 *     they own that course
 *   - a student may call enrollment.find, but the controller narrows the query
 *     to their own enrollments
 *
 * Both layers are required. Granting the endpoint here is not the same as
 * granting the data.
 */
const PERMISSIONS = {
  // Logged out. Enough to sign in, sign up, and browse the catalogue.
  public: [
    'plugin::users-permissions.auth.callback', // POST /api/auth/local          -> login
    'plugin::users-permissions.auth.register', // POST /api/auth/local/register -> signup
    ...readOnly(COURSE),
  ],

  // Can do everything, including managing users and their roles.
  admin: [
    ...OWN_ACCOUNT,
    ...fullAccess(COURSE),
    ...fullAccess(LESSON),
    ...fullAccess(ENROLLMENT),
    ...SEE_STUDENT_PROGRESS,
    'plugin::users-permissions.user.find',
    'plugin::users-permissions.user.findOne',
    'plugin::users-permissions.user.create',
    'plugin::users-permissions.user.update', // this is how a role gets reassigned
    'plugin::users-permissions.user.destroy',
    'plugin::users-permissions.role.find',
    'plugin::users-permissions.role.findOne',
  ],

  // The content library across the whole platform - but no user management.
  'content-manager': [
    ...OWN_ACCOUNT,
    ...fullAccess(COURSE),
    ...fullAccess(LESSON),
    ...readOnly(ENROLLMENT), // to see who is enrolled and how far along they are
    ...SEE_STUDENT_PROGRESS,
  ],

  // Same endpoints as a content manager, but the policies limit every write
  // to courses this instructor owns.
  instructor: [
    ...OWN_ACCOUNT,
    ...fullAccess(COURSE),
    ...fullAccess(LESSON),
    ...readOnly(ENROLLMENT),
    ...SEE_STUDENT_PROGRESS,
  ],

  // Reads content and enrols. No write access to courses or lessons at all.
  student: [
    ...OWN_ACCOUNT,
    ...readOnly(COURSE),
    ...readOnly(LESSON),
    ...readOnly(ENROLLMENT),
    `${ENROLLMENT}.create`,
    ...TRACK_OWN_PROGRESS,
  ],
};

/**
 * Strapi only recognises actions that a controller actually exposes. Checking
 * against its registry turns a typo in the matrix above into a boot-time warning
 * instead of a permission that silently never matches anything.
 */
async function buildActionValidator(strapi) {
  const registry = await strapi
    .plugin('users-permissions')
    .service('users-permissions')
    .getActions();

  return (action) => {
    // e.g. "api::course.course.find" -> ["api::course", "course", "find"]
    const [uid, controller, handler] = action.split('.');
    return Boolean(registry?.[uid]?.controllers?.[controller]?.[handler]);
  };
}

/**
 * Makes the database match the matrix above: adds what is missing and removes
 * what is no longer listed. The removal half matters - it means this file is the
 * single source of truth, and a permission cannot be quietly widened by hand in
 * the admin panel without the next restart putting it back.
 */
async function applyPermissions(strapi) {
  const isValidAction = await buildActionValidator(strapi);
  const roles = strapi.query('plugin::users-permissions.role');
  const permissions = strapi.query('plugin::users-permissions.permission');

  for (const [roleType, actions] of Object.entries(PERMISSIONS)) {
    const role = await roles.findOne({ where: { type: roleType } });

    if (!role) {
      strapi.log.warn(`[bootstrap] role "${roleType}" not found, skipping its permissions`);
      continue;
    }

    const wanted = actions.filter((action) => {
      if (isValidAction(action)) return true;
      strapi.log.warn(`[bootstrap] unknown permission action "${action}" - skipped`);
      return false;
    });

    const existing = await permissions.findMany({ where: { role: role.id } });
    const existingActions = new Set(existing.map((p) => p.action));

    const missing = wanted.filter((action) => !existingActions.has(action));
    const stale = existing.filter((p) => !wanted.includes(p.action));

    for (const action of missing) {
      await permissions.create({ data: { action, role: role.id } });
    }

    for (const permission of stale) {
      await permissions.delete({ where: { id: permission.id } });
    }

    if (missing.length > 0 || stale.length > 0) {
      strapi.log.info(
        `[bootstrap] ${roleType}: +${missing.length} permission(s), -${stale.length}`
      );
    }
  }
}

module.exports = { PERMISSIONS, applyPermissions };
