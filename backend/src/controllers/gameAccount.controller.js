const { db } = require('../db/database');
const { encrypt, decrypt } = require('../utils/crypto');

// 获取北京日期的辅助函数 (如果在 taskScheduler.js 里没导出，这里再写一遍)
function getBeijingDateString() {
  const beijingTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" });
  const date = new Date(beijingTime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 获取当前用户的所有游戏账号
exports.getMyAccounts = (req, res) => {
  const userId = req.user.id;
  const today = getBeijingDateString(); // 获取今天的日期
  
  // 1. 获取账号数据 + 今天的任务状态
  // 使用 LEFT JOIN：即使今天没有生成任务，也能查出账号
  const stmt = db.prepare(`
    SELECT 
      G.id, G.game_type, G.game_username, G.is_enabled, 
      T.status as today_task_status
    FROM GameAccounts G
    LEFT JOIN DailyTasks T ON G.id = T.game_account_id AND T.task_date = ?
    WHERE G.user_id = ?
  `);
  
  const accountsFromDb = stmt.all(today, userId);

  // 2. 获取映射字典
  const metaStmt = db.prepare("SELECT option_label, option_value FROM FieldMetadata WHERE field_key = 'game_type'");
  const gameTypeOptions = metaStmt.all();

  // 3. 数据转换
  const accountsForClient = accountsFromDb.map(account => {
    const match = gameTypeOptions.find(opt => opt.option_value === account.game_type);
    const label = match ? match.option_label : account.game_type;

    return {
      ...account,
      is_enabled: !!account.is_enabled,
      game_type_label: label, // 带回中文名
      today_task_status: account.today_task_status || 'NONE' // 如果没有任务记录，返回 '无任务' 或 null，方便前端判断
    };
  });
  
  res.json(accountsForClient);
};

// 添加新账号
exports.addAccount = (req, res) => {
  const userId = req.user.id;
  const { game_type, game_username, game_password, settings_json } = req.body;

  if (!game_type || !game_username || !game_password) {
    return res.status(400).send({ message: "请填写完整信息" });
  }

  // 加密密码
  const encryptedPwd = encrypt(game_password);

  const stmt = db.prepare(`
    INSERT INTO GameAccounts (user_id, game_type, game_username, game_password_encrypted, settings_json)
    VALUES (?, ?, ?, ?, ?)
  `);

  try {
    const info = stmt.run(userId, game_type, game_username, encryptedPwd, JSON.stringify(settings_json || {}));
    res.status(201).json({ id: info.lastInsertRowid, message: "添加成功" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// 删除账号
exports.deleteAccount = (req, res) => {
  const userId = req.user.id;
  const accountId = req.params.id;

  // 确保只能删除自己的账号
  const stmt = db.prepare('DELETE FROM GameAccounts WHERE id = ? AND user_id = ?');
  const result = stmt.run(accountId, userId);

  if (result.changes === 0) {
    return res.status(404).send({ message: "账号不存在或无权删除" });
  }

  res.send({ message: "删除成功" });
};

// 更新账号设置 (例如启用/禁用)
exports.updateAccount = (req, res) => {
  const userId = req.user.id;
  const accountId = req.params.id;
  const { is_enabled } = req.body;

  const stmt = db.prepare('UPDATE GameAccounts SET is_enabled = ? WHERE id = ? AND user_id = ?');
  const result = stmt.run(is_enabled ? 1 : 0, accountId, userId);

  res.send({ message: "更新成功" });
};

// 获取单个账号详情
exports.getAccountById = (req, res) => {
  const userId = req.user.id;
  const accountId = req.params.id;

  // 1. 获取账号的当前数据
  const stmt = db.prepare('SELECT * FROM GameAccounts WHERE id = ? AND user_id = ?');
  const account = stmt.get(accountId, userId);

  if (!account) {
    return res.status(404).send({ message: "账号不存在" });
  }

  // 2. 获取表结构信息 (Pragma info)
  // 这是 SQLite 特有的命令，用于获取列名、类型等元数据
  const columnsInfo = db.pragma('table_info(GameAccounts)');

  // 3. 获取字段下拉选项 (之前的 FieldMetadata)
  const optionsStmt = db.prepare("SELECT * FROM FieldMetadata WHERE table_name = 'GameAccounts' ORDER BY display_order");
  const allOptions = optionsStmt.all();

  // 4. 获取字段显示配置 (新增的 FieldConfig)
  const configStmt = db.prepare("SELECT * FROM FieldConfig WHERE table_name = 'GameAccounts'");
  const allConfigs = configStmt.all();

  // 5. 动态构建返回的字段列表
  const ignoredFields = ['id', 'user_id', 'game_password_encrypted', 'settings_json','game_data_json', 'last_game_data_sync']; 
  let dynamicFields = [];

  for (const col of columnsInfo) {
    if (ignoredFields.includes(col.name)) continue;

    // 查找该字段是否有自定义配置
    const config = allConfigs.find(c => c.field_key === col.name);

    // --- 决定 Label ---
    // 有配置用配置，没配置用原始字段名
    const label = config ? config.label : col.name;

    // --- 决定 Type ---
    // 优先级: 
    // 1. 如果有下拉选项 -> select
    // 2. 如果配置表里指定了类型 -> use config.input_type
    // 3. 自动推断 (fallback) -> boolean/text

    let fieldType = 'text';
    const fieldOptions = allOptions.filter(m => m.field_key === col.name);
    let finalOptions = [];

    if (fieldOptions.length > 0) {
      fieldType = 'select';
      finalOptions = fieldOptions.map(o => ({ label: o.option_label, value: o.option_value }));
    } else if (config && config.input_type) {
      fieldType = config.input_type;
    } else {
      // 最后的自动推断防线
      if (col.name.startsWith('is_')) fieldType = 'boolean';
    }

    // 处理数据值
    let value = account[col.name];
    if (fieldType === 'boolean') value = !!value;

    // --- 决定 Order ---
    // 有配置用配置的 order，没配置默认 999 放到最后
    const order = config ? config.display_order : 999;

    dynamicFields.push({
      key: col.name,
      label: label,
      type: fieldType,
      value: value,
      options: finalOptions,
      order: order // 用于排序
    });
  }

  // 按照 display_order 排序
  dynamicFields.sort((a, b) => a.order - b.order);

  // 6. 获取所有元数据以便映射 game_type_label
  // --- 新增逻辑：计算 game_type_label ---
  // 在 allOptions 中找 game_type 的映射
  const typeMatch = allOptions.find(
    m => m.field_key === 'game_type' && m.option_value === account.game_type
  );
  const typeLabel = typeMatch ? typeMatch.option_label : account.game_type;

  res.json({
    baseInfo: {
      id: account.id,
      game_username: account.game_username,
      game_type: account.game_type,
      game_type_label: typeLabel,   // <--- 新增：用于显示
      game_data_json: account.game_data_json,
      last_game_data_sync: account.last_game_data_sync
    },
    fields: dynamicFields
  });
};

// 更新账号配置 (不仅仅是状态，还包括 settings_json)
exports.updateAccountSettings = (req, res) => {
  const userId = req.user.id;
  const accountId = req.params.id;
  const updates = req.body; // { game_username: '...', is_enabled: true, ... }

  // 过滤掉不可更新的字段
  const allowedColumns = db.pragma('table_info(GameAccounts)')
    .map(c => c.name)
    .filter(name => !['id', 'user_id', 'game_password_encrypted'].includes(name));

  const keysToUpdate = Object.keys(updates).filter(key => allowedColumns.includes(key));
  
  if (keysToUpdate.length === 0) {
    return res.status(400).send({ message: "没有可更新的字段" });
  }

  // 动态构建 SQL
  const setClause = keysToUpdate.map(key => `${key} = ?`).join(', ');
  const values = keysToUpdate.map(key => {
    // 如果是布尔值，转回 0/1
    if (typeof updates[key] === 'boolean') return updates[key] ? 1 : 0;
    return updates[key];
  });

  // 添加 password 处理逻辑 (特殊处理)
  if (updates.new_password) { // 前端传来 new_password
    // 这里需要引入 crypto 中的 encrypt
    const { encrypt } = require('../utils/crypto');
    const encrypted = encrypt(updates.new_password);
    // 重新构建 SQL 把密码加进去
    // (为了代码简单，建议把修改密码做成单独接口，或者在这里手动拼接到 setClause 中)
    // 简单起见，这里先只处理通用字段
  }

  const query = `UPDATE GameAccounts SET ${setClause} WHERE id = ? AND user_id = ?`;
  
  try {
    const stmt = db.prepare(query);
    stmt.run(...values, accountId, userId);
    res.json({ message: "更新成功" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "更新失败" });
  }
};

exports.resetPassword = (req, res) => {
  const userId = req.user.id;
  const accountId = req.params.id;
  const { password } = req.body;

  if (!password) return res.status(400).send({ message: "密码不能为空" });

  const { encrypt } = require('../utils/crypto');
  const encrypted = encrypt(password);

  const stmt = db.prepare('UPDATE GameAccounts SET game_password_encrypted = ? WHERE id = ? AND user_id = ?');
  stmt.run(encrypted, accountId, userId);
  
  res.json({ message: "密码已更新" });
};