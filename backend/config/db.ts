import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

export interface SqlResult {
  insertId: number;
  affectedRows: number;
}

export interface DbExecutor {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  run(sql: string, params?: any[]): Promise<SqlResult>;
}

let sqliteInstance: Database.Database | null = null;
let mysqlPool: mysql.Pool | null = null;

function getSqliteDb(): Database.Database {
  if (!sqliteInstance) {
    const dbDir = path.join(projectRoot, 'database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'rural_health_connect.db');
    sqliteInstance = new Database(dbPath);
    sqliteInstance.pragma('foreign_keys = ON');
    sqliteInstance.pragma('journal_mode = WAL');
  }
  return sqliteInstance;
}

function getMysqlPool(): mysql.Pool {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      host: env.mysql.host,
      port: env.mysql.port,
      user: env.mysql.user,
      password: env.mysql.password,
      database: env.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: false,
    });
  }
  return mysqlPool;
}

function createSqliteExecutor(conn: Database.Database): DbExecutor {
  return {
    async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      const stmt = conn.prepare(sql);
      return stmt.all(...params) as T[];
    },
    async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
      const stmt = conn.prepare(sql);
      return stmt.get(...params) as T | undefined;
    },
    async run(sql: string, params: any[] = []): Promise<SqlResult> {
      const stmt = conn.prepare(sql);
      const info = stmt.run(...params);
      return {
        insertId: Number(info.lastInsertRowid || 0),
        affectedRows: Number(info.changes || 0),
      };
    },
  };
}

function createMysqlExecutor(conn: mysql.Pool | mysql.PoolConnection): DbExecutor {
  return {
    async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      const [rows] = await conn.execute(sql, params);
      return rows as T[];
    },
    async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
      const [rows] = await conn.execute(sql, params);
      const list = rows as T[];
      return list[0];
    },
    async run(sql: string, params: any[] = []): Promise<SqlResult> {
      const [result] = await conn.execute(sql, params);
      const res = result as mysql.ResultSetHeader;
      return {
        insertId: Number(res.insertId || 0),
        affectedRows: Number(res.affectedRows || 0),
      };
    },
  };
}

export const db = {
  driver: env.dbClient,

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (env.dbClient === 'mysql') {
      return createMysqlExecutor(getMysqlPool()).query<T>(sql, params);
    }
    return createSqliteExecutor(getSqliteDb()).query<T>(sql, params);
  },

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (env.dbClient === 'mysql') {
      return createMysqlExecutor(getMysqlPool()).get<T>(sql, params);
    }
    return createSqliteExecutor(getSqliteDb()).get<T>(sql, params);
  },

  async run(sql: string, params: any[] = []): Promise<SqlResult> {
    if (env.dbClient === 'mysql') {
      return createMysqlExecutor(getMysqlPool()).run(sql, params);
    }
    return createSqliteExecutor(getSqliteDb()).run(sql, params);
  },

  async transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
    if (env.dbClient === 'mysql') {
      const conn = await getMysqlPool().getConnection();
      try {
        await conn.beginTransaction();
        const result = await fn(createMysqlExecutor(conn));
        await conn.commit();
        return result;
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } else {
      const conn = getSqliteDb();
      const exec = createSqliteExecutor(conn);
      conn.exec('BEGIN IMMEDIATE');
      try {
        const result = await fn(exec);
        conn.exec('COMMIT');
        return result;
      } catch (err) {
        conn.exec('ROLLBACK');
        throw err;
      }
    }
  },

  getRawSqlite(): Database.Database {
    return getSqliteDb();
  },
};
