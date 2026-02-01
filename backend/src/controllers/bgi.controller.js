const { db } = require('../db/database');
const { decrypt } = require('../utils/crypto'); // 引入解密工具

exports.getNextTask = (req, res) => {
  const { type } = req.query;

  try {
    let task = null;

    const transaction = db.transaction(() => {
      // 优先级策略：
      // 1. 优先找 'RUNNING' 的任务 (假设是崩溃后重启，或者超时任务)
      //    为了防止抢走正在正常运行的任务，我们可以加一个时间判断：started_at -- 只有运行超过5分钟未完成的才会被重新接取
      //    或者如果您确定只有单一 BmHY 实例，可以直接取 RUNNING
      // 2. 其次找 'PENDING' 且 retry_count = 0 (新任务)
      // 3. 最后找 'PENDING' 且 retry_count > 0 (重试任务)

      // 我们用 CASE WHEN 语句来定义自定义排序权重
      let query = `
        SELECT T.* 
        FROM DailyTasks T 
        JOIN GameAccounts G ON T.game_account_id = G.id 
        WHERE (
          (T.status = 'RUNNING' AND T.started_at < datetime('now', '-5 minutes', 'localtime'))
          OR T.status = 'PENDING'
        )
      `;

      const params = [];

      if (type) {
        query += " AND G.game_type = ?";
        params.push(type);
      }

      // 排序逻辑：
      // 优先级 1: RUNNING (超时捡漏) -> 权重 1
      // 优先级 2: PENDING & retry=0 (新任务) -> 权重 2
      // 优先级 3: PENDING & retry>0 (重试任务) -> 权重 3
      // 同权重下按 ID 顺序
      query += `
        ORDER BY 
          CASE 
            WHEN T.status = 'RUNNING' THEN 1
            WHEN T.status = 'PENDING' AND T.retry_count = 0 THEN 2
            ELSE 3
          END ASC,
          T.id ASC
        LIMIT 1
      `;

      const stmtFind = db.prepare(query);
      const foundTask = stmtFind.get(...params);

      if (!foundTask) {
        return;
      }

      // 锁定/更新任务
      // 不管之前是 RUNNING 还是 PENDING，现在重新标记开始时间
      const stmtUpdate = db.prepare("UPDATE DailyTasks SET status = 'RUNNING', started_at = CURRENT_TIMESTAMP WHERE id = ?");
      stmtUpdate.run(foundTask.id);

      task = foundTask;
    });

    transaction();

    if (!task) {
      // 如果没有任务，返回 204 No Content，BGI 客户端收到后就知道可以关机了
      return res.status(204).send({ message: 'No tasks available at the moment.' });
    }

    // 3. 任务找到了，现在需要关联查询游戏账号的详细信息
    // 【修改点】：我们不再只查特定几个字段，而是查所有字段 (*)
    const stmtGetAccount = db.prepare(`SELECT * FROM GameAccounts WHERE id = ?`);
    const accountInfo = stmtGetAccount.get(task.game_account_id);

    if (!accountInfo) {
      return res.status(404).send({ message: 'Associated game account not found.' });
    }

    // 4. 解密游戏密码
    let plainPassword = '';
    if (accountInfo.game_password_encrypted) {
      plainPassword = decrypt(accountInfo.game_password_encrypted);
    }

    // 5. 组合最终数据
    // 我们把 accountInfo 里的所有字段都作为 settings 返回
    // 但要剔除敏感信息和系统字段
    const settings = { ...accountInfo };
    delete settings.id;
    delete settings.user_id;
    delete settings.game_password_encrypted; // 删掉加密串，只给明文
    delete settings.settings_json; // 即使有旧数据也不需要了

    // 处理布尔值：SQLite 返回 0/1，如果您软件喜欢 true/false，可以在这里转
    // 或者您的软件直接处理 0/1 也可以。这里保持原样 (0/1) 给您，方便 C++/C# 处理。

    const taskForBgi = {
      taskId: task.id,

      // 核心三要素，单独提出来方便取用
      gameType: accountInfo.game_type,
      gameUsername: accountInfo.game_username,
      gamePassword: plainPassword, // 明文密码

      // 所有的配置项（包括您动态添加的 server_region, is_xxx 等）都在这里
      settings: settings
    };

    res.json(taskForBgi);

  } catch (error) {
    console.error('[BGI Controller] Error in getNextTask:', error);
    res.status(500).send({ message: 'Internal server error while fetching next task.' });
  }
};

// 新增：BGI 主动上报游戏内数据（不涉及任务状态）
exports.updateGameData = (req, res) => {
  const { gameUsername, gameType, taskId, data } = req.body;

  if (!data) {
    return res.status(400).send({ message: "缺少 data 参数" });
  }

  const jsonData = JSON.stringify(data);
  let changes = 0;

  try {
    // 策略 1: 优先尝试通过 gameUsername + gameType 更新
    if (gameUsername && gameType) {
      const stmt = db.prepare(`
        UPDATE GameAccounts 
        SET game_data_json = ?, last_game_data_sync = datetime('now', 'localtime')
        WHERE game_username = ? AND game_type = ?
      `);
      const info = stmt.run(jsonData, gameUsername, gameType);
      changes = info.changes;
    }

    // 策略 2: 如果策略1没传参数，或者更新行数为0 (没找到)，尝试用 taskId 反查
    if (changes === 0 && taskId) {
      // 先查 DailyTasks 表找到对应的 game_account_id
      const taskStmt = db.prepare('SELECT game_account_id FROM DailyTasks WHERE id = ?');
      const task = taskStmt.get(taskId);

      if (task) {
        const accStmt = db.prepare(`
          UPDATE GameAccounts 
          SET game_data_json = ?, last_game_data_sync = datetime('now', 'localtime')
          WHERE id = ?
        `);
        const info = accStmt.run(jsonData, task.game_account_id);
        changes = info.changes;
      }
    }

    if (changes > 0) {
      res.json({ message: "数据更新成功" });
    } else {
      res.status(404).send({ message: "未找到匹配的账号，更新失败" });
    }

  } catch (error) {
    console.error('[BGI Update] Error:', error);
    res.status(500).send({ message: "服务器内部错误" });
  }
};
exports.reportTask = (req, res) => {
  const { taskId, status, logDetails, data } = req.body;

  if (!taskId || !status || !['SUCCESS', 'FAILED'].includes(status)) {
    return res.status(400).send({ message: 'Invalid request body. Requires taskId and status (SUCCESS/FAILED).' });
  }

  const transaction = db.transaction(() => {
    // 先查一下当前任务
    // 我们顺便查出 game_account_id，因为后面更新 data 需要用到
    const currentTask = db.prepare("SELECT game_account_id, retry_count FROM DailyTasks WHERE id = ?").get(taskId);

    if (!currentTask) {
      return; // 任务不存在
    }

    if (data) {
      try {
        const stmtUpdateAccount = db.prepare(`
          UPDATE GameAccounts 
          SET game_data_json = ?, last_game_data_sync = datetime('now', 'localtime')
          WHERE id = ?
        `);
        stmtUpdateAccount.run(JSON.stringify(data), currentTask.game_account_id);
      } catch (e) {
        console.error("Failed to update game data in reportTask:", e);
        // 数据更新失败不应该阻断任务状态更新，所以这里 catch 住不抛出
      }
    }

    const logToAppend = logDetails ? `\n${logDetails}` : '';

    if (status === 'SUCCESS') {
      // 成功：追加日志，标记完成
      db.prepare(`
        UPDATE DailyTasks 
        SET 
          status = 'SUCCESS', 
          log_details = COALESCE(log_details, '') || ?, 
          completed_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(logToAppend, taskId);

    } else if (status === 'FAILED') {
      const maxRetries = 3;

      if (currentTask.retry_count < maxRetries) {
        // 重试：追加系统提示
        const retryLog = logToAppend + `[System] 任务失败，进入重试队列 (${currentTask.retry_count + 1}/${maxRetries})...\n`;

        db.prepare(`
          UPDATE DailyTasks 
          SET 
            status = 'PENDING', 
            retry_count = retry_count + 1, 
            log_details = COALESCE(log_details, '') || ? 
          WHERE id = ?
        `).run(retryLog, taskId);

        console.log(`Task ${taskId} scheduled for retry.`);
      } else {
        // 彻底失败
        const failLog = logToAppend + `[System] 达到最大重试次数，任务彻底失败。\n`;

        db.prepare(`
          UPDATE DailyTasks 
          SET 
            status = 'FAILED', 
            log_details = COALESCE(log_details, '') || ?, 
            completed_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(failLog, taskId);

        console.log(`Task ${taskId} failed permanently.`);
      }
    }
  });

  try {
    transaction();
    console.log(`[BGI Controller] Task ${taskId} reported as ${status}.`);
    res.status(200).send({ message: 'Report received.' });

  } catch (error) {
    console.error('[BGI Controller] Error in reportTask:', error);
    res.status(500).send({ message: 'Internal server error while reporting task.' });
  }
};

// 获取指定任务对应账号的某个字段值
exports.getAccountKV = (req, res) => {
  const { taskId, key } = req.query;

  if (!taskId || !key) return res.status(400).send({ message: "taskId 和 key 必填" });

  // 为了安全，我们可以限制只允许读取某些特定的前缀字段，或者允许读取所有
  // 这里假设允许读取所有以 'reg_' 开头的字段，防止读取 password
  // if (!key.startsWith('reg_')) return res.status(403).send({ message: "禁止读取敏感字段" });

  try {
    // 1. 通过 taskId 找到 game_account_id
    const task = db.prepare('SELECT game_account_id FROM DailyTasks WHERE id = ?').get(taskId);
    if (!task) return res.status(404).send({ message: "任务不存在" });

    // 2. 动态构建 SQL 读取该列
    // 注意：column name 不能参数化，必须校验以防注入
    if (!/^[a-zA-Z0-9_]+$/.test(key)) return res.status(400).send({ message: "Key 格式非法" });

    // 检查列是否存在
    const columns = db.pragma(`table_info(GameAccounts)`).map(c => c.name);
    if (!columns.includes(key)) {
      return res.status(404).send({ message: `字段 ${key} 不存在` });
    }

    const stmt = db.prepare(`SELECT ${key} as val FROM GameAccounts WHERE id = ?`);
    const result = stmt.get(task.game_account_id);

    res.json({ key: key, value: result ? result.val : null });

  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "读取失败" });
  }
};

// 更新指定任务对应账号的某个字段值
exports.updateAccountKV = (req, res) => {
  const { taskId, key, value } = req.body;

  if (!taskId || !key) return res.status(400).send({ message: "taskId 和 key 必填" });

  // 同样的安全校验
  if (!/^[a-zA-Z0-9_]+$/.test(key)) return res.status(400).send({ message: "Key 格式非法" });

  try {
    const task = db.prepare('SELECT game_account_id FROM DailyTasks WHERE id = ?').get(taskId);
    if (!task) return res.status(404).send({ message: "任务不存在" });

    // 检查列是否存在，不存在则报错（或者您可以选择自动创建，但动态DDL有风险，建议报错让管理员先去后台加字段）
    const columns = db.pragma(`table_info(GameAccounts)`).map(c => c.name);
    if (!columns.includes(key)) {
      return res.status(404).send({ message: `字段 ${key} 在数据库中不存在，请先在管理员后台添加该字段。` });
    }

    const stmt = db.prepare(`UPDATE GameAccounts SET ${key} = ? WHERE id = ?`);
    stmt.run(value, task.game_account_id);

    res.json({ message: "更新成功" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "更新失败" });
  }
};

exports.appendLog = (req, res) => {
  const { taskId, logLine } = req.body;

  if (!taskId || !logLine) return res.status(400).send({ message: "taskId 和 logLine 必填" });

  try {
    // 使用 SQLite 的字符串连接操作符 || 来追加日志
    // 并加上时间戳和换行
    // const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" });
    const formattedLog = `${ logLine }\n`; // `[${timestamp}] ${logLine}\n`;

    const stmt = db.prepare(`
      UPDATE DailyTasks 
      SET log_details = COALESCE(log_details, '') || ? 
      WHERE id = ? AND status = 'RUNNING'
    `);

    const info = stmt.run(formattedLog, taskId);

    if (info.changes === 0) {
      // 任务可能已经结束或不存在
      return res.status(404).send({ message: "任务未找到或不在运行中" });
    }

    res.json({ message: "日志已追加" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "日志追加失败" });
  }
};