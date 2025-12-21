const MachineControlService = require('../services/MachineControlService');
const HeartbeatService = require('../services/HeartbeatService');
const SmartPlugService = require('../services/SmartPlugService'); // 引入我们之前设计的排插服务
const { db } = require('../db/database');

// --- 面向前端管理员的操作 ---

exports.wakeup = async (req, res) => {
  try {
    await MachineControlService.wakeOnLan();
    res.status(200).send({ message: "网络唤醒包已发送" });
  } catch (error) {
    res.status(500).send({ message: "发送网络唤醒包失败" });
  }
};

exports.forceRestart = async (req, res) => {
  // 这个操作耗时很长，我们应该立即返回响应，让它在后台执行
  res.status(202).send({ message: "强制重启流程已启动，请稍后..." });
  MachineControlService.forceRestartSequence(); // 在后台执行，不等待它完成
};

// 新增正常关机函数
exports.shutdown = async (req, res) => {
  try {
    const success = await MachineControlService.shutdownSsh();
    if (success) {
      res.status(200).send({ message: "正常关机指令已发送" });
    } else {
      res.status(500).send({ message: "操作失败，SSH连接可能超时或目标主机不可达" });
    }
  } catch (error) {
    console.error('[AdminController] Failed to send shutdown command:', error.message);
    res.status(500).send({ message: "发送关机指令时发生内部错误" });
  }
};

exports.getSystemStatus = async (req, res) => { // <-- 将函数改为 async
  const computerStatus = HeartbeatService.getStatus();
  let plugStatus = { power: 'N/A', isOn: false };

  try {
    // 并行获取功率和开关状态，速度更快
    const [power, isOn] = await Promise.all([
      SmartPlugService.getPower(),
      SmartPlugService.getSwitchState()
    ]);
    plugStatus = { power: `${power.toFixed(2)} W`, isOn };
  } catch (error) {
    console.error('[AdminController] Failed to get plug status:', error.message);
    // 如果获取失败，返回一个明确的错误状态
    plugStatus = { power: '通信失败', isOn: false };
  }

  // 将两部分状态组合成一个对象返回
  res.json({
    computer: computerStatus,
    plug: plugStatus
  });
};

exports.togglePlug = async (req, res) => {
  try {
    const currentState = await SmartPlugService.getSwitchState();
    if (currentState) {
      await SmartPlugService.turnOff();
      res.status(200).send({ message: "排插已关闭", newState: false });
    } else {
      await SmartPlugService.turnOn();
      res.status(200).send({ message: "排插已开启", newState: true });
    }
  } catch (error) {
    console.error('[AdminController] Failed to toggle plug:', error.message);
    res.status(500).send({ message: "操作排插失败" });
  }
};exports.togglePlug = async (req, res) => {
  try {
    const currentState = await SmartPlugService.getSwitchState();
    if (currentState) {
      await SmartPlugService.turnOff();
      res.status(200).send({ message: "排插已关闭", newState: false });
    } else {
      await SmartPlugService.turnOn();
      res.status(200).send({ message: "排插已开启", newState: true });
    }
  } catch (error) {
    console.error('[AdminController] Failed to toggle plug:', error.message);
    res.status(500).send({ message: "操作排插失败" });
  }
};

// --- 面向 BGI-Agent 的操作 ---

exports.receiveHeartbeat = (req, res) => {
  // req.body 就是 BGI-Agent 发送过来的 JSON 数据
  HeartbeatService.updateStatus(req.body);
  res.status(200).send({ message: "Heartbeat received" });
};

// --- 字段元数据管理 ---

// 获取所有字段配置
exports.getFieldOptions = (req, res) => {
  const stmt = db.prepare('SELECT * FROM FieldMetadata ORDER BY field_key, display_order');
  const options = stmt.all();
  res.json(options);
};

// 添加一个选项
exports.addFieldOption = (req, res) => {
  const { field_key, option_label, option_value } = req.body;
  if (!field_key || !option_label || !option_value) {
    return res.status(400).send({ message: "所有字段都是必填的" });
  }

  const stmt = db.prepare('INSERT INTO FieldMetadata (field_key, option_label, option_value) VALUES (?, ?, ?)');
  stmt.run(field_key, option_label, option_value);
  
  res.json({ message: "选项添加成功" });
};

// 删除一个选项
exports.deleteFieldOption = (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM FieldMetadata WHERE id = ?');
  stmt.run(id);
  res.json({ message: "选项删除成功" });
};


// --- 新增：字段基础配置管理 (FieldConfig) ---

// 获取所有字段显示配置
exports.getFieldConfigs = (req, res) => {
  const stmt = db.prepare('SELECT * FROM FieldConfig ORDER BY display_order');
  res.json(stmt.all());
};

// 保存或更新字段配置 (Upsert)
exports.saveFieldConfig = (req, res) => {
  const { field_key, label, input_type, display_order } = req.body;

  if (!field_key || !label) {
    return res.status(400).send({ message: "字段名和显示名必填" });
  }

  // 使用 REPLACE INTO 或者 ON CONFLICT 更新
  const stmt = db.prepare(`
    INSERT INTO FieldConfig (table_name, field_key, label, input_type, display_order)
    VALUES ('GameAccounts', ?, ?, ?, ?)
    ON CONFLICT(field_key) DO UPDATE SET
      label = excluded.label,
      input_type = excluded.input_type,
      display_order = excluded.display_order
  `);

  stmt.run(field_key, label, input_type || 'text', display_order || 0);
  res.json({ message: "配置保存成功" });
};

// 删除配置 (恢复默认显示)
exports.deleteFieldConfig = (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM FieldConfig WHERE id = ?');
  stmt.run(id);
  res.json({ message: "配置已删除" });
};

// 添加新列到 GameAccounts 表
exports.addDatabaseColumn = (req, res) => {
  const { column_name, data_type, default_value } = req.body;

  // 1. 严格校验 column_name，只允许字母、数字和下划线，防止 SQL 注入
  if (!/^[a-zA-Z0-9_]+$/.test(column_name)) {
    return res.status(400).send({ message: "字段名只能包含字母、数字和下划线" });
  }

  // 2. 校验数据类型 (SQLite 类型较少)
  const allowedTypes = ['TEXT', 'INTEGER', 'REAL', 'BOOLEAN']; // BOOLEAN 其实是 INTEGER
  const type = (data_type || 'TEXT').toUpperCase();
  if (!allowedTypes.includes(type)) {
    return res.status(400).send({ message: "不支持的数据类型" });
  }

  // 3. 构建 SQL 语句
  // 注意：ALTER TABLE 不支持参数化查询占位符 (?) 用于列名，所以必须拼接字符串
  // 但由于上面做了正则校验，这里是安全的。
  let sql = `ALTER TABLE GameAccounts ADD COLUMN ${column_name} ${type}`;

  // 处理默认值 (简单处理，只支持字符串和数字)
  if (default_value !== undefined && default_value !== '') {
    if (type === 'TEXT') {
      sql += ` DEFAULT '${default_value}'`;
    } else {
      sql += ` DEFAULT ${default_value}`;
    }
  }

  try {
    db.exec(sql);
    console.log(`[Schema Manager] Column added: ${column_name} (${type})`);

    // 可选：自动在 FieldConfig 表中添加一条默认记录，方便显示
    // 这样添加完字段后，列表中能立马看到
    try {
      const stmt = db.prepare(`
        INSERT INTO FieldConfig (table_name, field_key, label, input_type, display_order)
        VALUES ('GameAccounts', ?, ?, ?, 999)
      `);
      // 默认 input_type 推断
      let inputType = 'text';
      if (type === 'INTEGER' || type === 'BOOLEAN') inputType = 'text'; // 默认为text，用户可改为 boolean/select
      if (column_name.startsWith('is_')) inputType = 'boolean';

      stmt.run(column_name, column_name, inputType);
    } catch (e) {
      // 忽略配置插入错误（可能是已存在）
    }

    res.json({ message: `字段 ${column_name} 添加成功` });
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      return res.status(400).send({ message: "该字段已存在" });
    }
    console.error(error);
    res.status(500).send({ message: "添加字段失败: " + error.message });
  }
};