/** @import { Core } from '@strapi/strapi' */

const fs = require('fs');
const path = require('path');
const { isDatabaseClientKind } = require('@strapi/database');

/**
 * Managed Postgres almost always requires TLS, and usually presents a
 * certificate signed by an internal authority - which is why
 * DATABASE_SSL_REJECT_UNAUTHORIZED exists as a separate switch. Turning it off
 * still encrypts the connection; it only stops the certificate chain being
 * verified, which is the trade Railway and similar hosts expect.
 */
function postgresSsl(env) {
  if (!env.bool('DATABASE_SSL', false)) return false;

  return {
    key: env('DATABASE_SSL_KEY', undefined),
    cert: env('DATABASE_SSL_CERT', undefined),
    ca: env('DATABASE_SSL_CA', undefined),
    capath: env('DATABASE_SSL_CAPATH', undefined),
    cipher: env('DATABASE_SSL_CIPHER', undefined),
    rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
  };
}

module.exports = ({ env }) => {
  const client = env('DATABASE_CLIENT', 'sqlite');

  if (!isDatabaseClientKind(client)) {
    throw new Error(
      `Unsupported DATABASE_CLIENT: ${client}. Use "postgres", "mysql", or "sqlite".`
    );
  }

  // Note: env() only falls back to the default when the variable is *undefined*.
  // An empty DATABASE_FILENAME= line in .env would resolve to the project folder
  // instead of a file, so treat a blank value as "not set".
  const sqliteFile = path.join(
    __dirname,
    '..',
    env('DATABASE_FILENAME') || '.tmp/data.db'
  );

  // better-sqlite3 refuses to create missing folders, so make sure the
  // directory is there before knex tries to open the file.
  if (client === 'sqlite') {
    fs.mkdirSync(path.dirname(sqliteFile), { recursive: true });
  }

  /** @type {Record<Core.Config.Database.ClientKind, Core.Config.Database['connection']>} */
  const connections = {
    mysql: {
      client: 'mysql',
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    postgres: {
      client: 'postgres',
      /**
       * Railway hands the whole connection over as one DATABASE_URL, so when it
       * is present that is used on its own.
       *
       * Sending both a connection string and separate host/port/user fields is
       * ambiguous - the driver has two answers to the same question, and which
       * one wins is not something to rely on. Spelling out one or the other
       * keeps a misconfiguration loud instead of connecting to the wrong place.
       */
      connection: env('DATABASE_URL')
        ? {
            connectionString: env('DATABASE_URL'),
            ssl: postgresSsl(env),
            schema: env('DATABASE_SCHEMA', 'public'),
          }
        : {
            host: env('DATABASE_HOST', 'localhost'),
            port: env.int('DATABASE_PORT', 5432),
            database: env('DATABASE_NAME', 'strapi'),
            user: env('DATABASE_USERNAME', 'strapi'),
            password: env('DATABASE_PASSWORD', 'strapi'),
            ssl: postgresSsl(env),
            schema: env('DATABASE_SCHEMA', 'public'),
          },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    sqlite: {
      client: 'sqlite',
      connection: {
        filename: sqliteFile,
      },
      useNullAsDefault: true,
    },
  };

  return {
    connection: {
      ...connections[client],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
};
