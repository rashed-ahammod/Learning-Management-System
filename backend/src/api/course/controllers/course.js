'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

const UID = 'api::course.course';

/**
 * What a course response is built from.
 *
 * Lessons are fetched as a syllabus - title and order only. The lesson body and
 * video URL are deliberately absent, because those come from /api/lessons, which
 * checks enrolment first. The populate is fixed here rather than read from the
 * query string: if the client chose it, a plain ?populate=lessons would hand the
 * entire course content to anyone browsing the public catalogue.
 */
const COURSE_POPULATE = {
  owner: { fields: ['id', 'username'] },
  lessons: { fields: ['title', 'order'], sort: ['order:asc'] },
};

/**
 * Rebuilds the two relations that sanitizeOutput removes.
 *
 * sanitizeOutput drops any relation the caller has no permission to read. That
 * means the owner (only admins may read the users table) and the lessons (only
 * staff and enrolled students may read lessons) both vanish from a course
 * response - including for the logged-out visitor browsing the catalogue.
 *
 * Both are wanted there, so they are re-attached in a deliberately narrow shape
 * rather than by widening anyone's permissions. The syllabus is the one that
 * matters: title and order and nothing else, so the catalogue can show what a
 * course covers without leaking a single lesson body. Granting the public role
 * lesson.find instead would have exposed the content itself.
 */
function presentCourse(sanitized, raw) {
  const course = { ...sanitized };

  if (raw?.owner) {
    course.owner = { id: raw.owner.id, username: raw.owner.username };
  }

  if (Array.isArray(raw?.lessons)) {
    course.lessons = raw.lessons.map((lesson) => ({
      id: lesson.id,
      documentId: lesson.documentId,
      title: lesson.title,
      order: lesson.order,
    }));
  }

  return course;
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  async find(ctx) {
    await this.validateQuery(ctx);
    const query = await this.sanitizeQuery(ctx);

    const { results, pagination } = await strapi
      .service(UID)
      .find({ ...query, populate: COURSE_POPULATE });

    const sanitized = await this.sanitizeOutput(results, ctx);

    return this.transformResponse(
      sanitized.map((entry, index) => presentCourse(entry, results[index])),
      { pagination }
    );
  },

  async findOne(ctx) {
    await this.validateQuery(ctx);
    const query = await this.sanitizeQuery(ctx);

    const course = await strapi
      .service(UID)
      .findOne(ctx.params.id, { ...query, populate: COURSE_POPULATE });

    if (!course) {
      return ctx.notFound();
    }

    const sanitized = await this.sanitizeOutput(course, ctx);

    return this.transformResponse(presentCourse(sanitized, course));
  },

  async create(ctx) {
    const payload = ctx.request.body?.data;

    if (!payload || typeof payload !== 'object') {
      return ctx.badRequest('Missing "data" payload in the request body');
    }

    // The client does not get to name the owner, so it is dropped before
    // validation. Leaving it in would fail anyway - Strapi validates input
    // against the caller's field permissions, and an instructor has no
    // permission on the users table, so an `owner` key is rejected outright.
    const { owner: ignoredOwner, ...input } = payload;

    await this.validateInput(input, ctx);
    const data = await this.sanitizeInput(input, ctx);

    // The owner is attached afterwards, from the session. If it came from the
    // request body an instructor could create a course belonging to somebody
    // else, and every ownership check after that would be meaningless.
    const course = await strapi.documents(UID).create({
      data: { ...data, owner: ctx.state.user.id },
      populate: COURSE_POPULATE,
    });

    const sanitized = await this.sanitizeOutput(course, ctx);

    ctx.status = 201;
    return this.transformResponse(presentCourse(sanitized, course));
  },

  async update(ctx) {
    // Ownership is decided when the course is created. Dropping it here stops a
    // course being handed to somebody else - or quietly taken.
    if (ctx.request.body?.data) {
      delete ctx.request.body.data.owner;
    }

    return super.update(ctx);
  },
}));
