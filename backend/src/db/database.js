const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database file. It will be created if it doesn't exist.
const db = new Database(path.join(__dirname, '../../bgi-panel.db'), { verbose: console.log });

function initDb() {
  console.log('Initializing database...');
  
  const createUsersTable = `
      CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',  -- 新增字段: user 或 admin
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  const createGameAccountsTable = `
    CREATE TABLE IF NOT EXISTS GameAccounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      game_type TEXT NOT NULL,
      game_username TEXT NOT NULL,
      game_password_encrypted TEXT,
      settings_json TEXT,
      is_enabled BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (user_id) REFERENCES Users (id)
    );
  `;
  
  const createDailyTasksTable = `
    CREATE TABLE IF NOT EXISTS DailyTasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_account_id INTEGER NOT NULL,
      task_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      log_details TEXT,
      started_at DATETIME,
      completed_at DATETIME,
      retry_count INTEGER DEFAULT 0,
      FOREIGN KEY (game_account_id) REFERENCES GameAccounts (id)
    );
  `;
  const createFieldMetadataTable = `
    CREATE TABLE IF NOT EXISTS FieldMetadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL DEFAULT 'GameAccounts', -- 预留给未来扩展
      field_key TEXT NOT NULL,       -- 对应数据库字段名，如 'game_type'
      option_label TEXT NOT NULL,    -- 显示给用户的文字，如 '原神'
      option_value TEXT NOT NULL,    -- 存入数据库的值，如 'Genshin'
      display_order INTEGER DEFAULT 0 -- 排序用
    );
  `;
  const createFieldConfigTable = `
  CREATE TABLE IF NOT EXISTS FieldConfig (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL DEFAULT 'GameAccounts',
    field_key TEXT NOT NULL UNIQUE,  -- 字段名，如 game_username
    label TEXT NOT NULL,             -- 显示名，如 "游戏账号"
    input_type TEXT DEFAULT 'text',  -- text, boolean, select, password
    display_order INTEGER DEFAULT 0  -- 排序
  );
  `;
  const createSystemCommandsTable = `
    CREATE TABLE IF NOT EXISTS SystemCommands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command_type TEXT NOT NULL,
      payload TEXT,
      status TEXT DEFAULT 'PENDING',
      progress INTEGER DEFAULT 0,
      log_details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_notified_at DATETIME
    );
  `;
  // Use db.exec to run multiple statements
  db.exec(`
    ${createUsersTable}
    ${createGameAccountsTable}
    ${createDailyTasksTable}
    ${createFieldMetadataTable}
    ${createFieldConfigTable}
    ${createSystemCommandsTable}
  `);

  console.log('Database initialized successfully.');
}

module.exports = { db, initDb };