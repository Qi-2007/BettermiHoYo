const { db } = require('../db/database');
const { decrypt } = require('../utils/crypto'); // 引入解密工具

exports.getNextTask = (req, res) => {
  try {
    let task = null;

    // 使用事务来确保“查询”和“更新状态”的原子性
    // 防止多个 BGI 客户端（如果未来有的话）同时取到同一个任务
    const transaction = db.transaction(() => {
      // 1. 查找一个 PENDING 状态的任务，按 ID 排序确保顺序
      const stmtFind = db.prepare("SELECT * FROM DailyTasks WHERE status = 'PENDING' ORDER BY id LIMIT 1");
      const foundTask = stmtFind.get();

      if (!foundTask) {
        return; // 没有找到待处理任务
      }

      // 2. 立刻更新任务状态为 RUNNING
      const stmtUpdate = db.prepare("UPDATE DailyTasks SET status = 'RUNNING', started_at = CURRENT_TIMESTAMP WHERE id = ?");
      stmtUpdate.run(foundTask.id);

      task = foundTask;
    });

    transaction();

    if (!task) {
      // 如果没有任务，返回 204 No Content，BGI 客户端收到后就知道可以关机了
      return res.status(204).send();
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
  const { taskId, status, logDetails, gameData } = req.body; // <-- 增加 gameData 参数

  if (!taskId || !status || !['SUCCESS', 'FAILED'].includes(status)) {
    return res.status(400).send({ message: 'Invalid request body. Requires taskId and status (SUCCESS/FAILED).' });
  }

  try {
    // 1. 查找任务，并确认它当前是 RUNNING 状态
    const stmtFind = db.prepare("SELECT id FROM DailyTasks WHERE id = ? AND status = 'RUNNING'");
    const task = stmtFind.get(taskId);

    if (!task) {
      return res.status(404).send({ message: 'Task not found or its status is not RUNNING. Maybe it was already completed or timed out.' });
    }

    // 2. 更新任务状态和日志

    const transaction = db.transaction(() => {
      // 1. 更新任务状态
      const stmtUpdateTask = db.prepare(`
      UPDATE DailyTasks 
      SET status = ?, log_details = ?, completed_at = datetime('now', 'localtime') 
      WHERE id = ?
    `);
      stmtUpdateTask.run(status, logDetails || '', taskId);

      // 2. 如果请求里带了 gameData，顺便更新账号信息
      if (gameData) {
        // 先查出 accountId
        const task = db.prepare("SELECT game_account_id FROM DailyTasks WHERE id = ?").get(taskId);
        if (task) {
          const stmtUpdateAccount = db.prepare(`
          UPDATE GameAccounts 
          SET game_data_json = ?, last_game_data_sync = datetime('now', 'localtime')
          WHERE id = ?
        `);
          stmtUpdateAccount.run(JSON.stringify(gameData), task.game_account_id);
        }
      }
    });

    transaction();
    console.log(`[BGI Controller] Task ${taskId} reported as ${status}.`);
    res.status(200).send({ message: 'Report received.' });

  } catch (error) {
    console.error('[BGI Controller] Error in reportTask:', error);
    res.status(500).send({ message: 'Internal server error while reporting task.' });
  }
};