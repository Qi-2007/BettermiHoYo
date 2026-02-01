const { db } = require('../db/database');

// 获取北京日期的辅助函数，和 scheduler 里的一样
function getBeijingDateString() {
  const beijingTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" });
  const date = new Date(beijingTime);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

exports.getCalendarData = (req, res) => {
  const userId = req.user.id;
  const month = req.query.month; // e.g., "2023-11"

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).send({ message: "月份格式不正确，应为 YYYY-MM" });
  }

  const startDate = `${month}-01`;
  const endDate = `${month}-31`; // 查询整个月，日期会自动处理

  // SQL 查询: 联合 DailyTasks 和 GameAccounts 表，找出属于当前用户且在指定月份内的所有任务记录
  const stmt = db.prepare(`
    SELECT
      T.task_date,
      T.status
    FROM DailyTasks AS T
    JOIN GameAccounts AS G ON T.game_account_id = G.id
    WHERE
      G.user_id = ? AND
      T.task_date >= ? AND
      T.task_date <= ?
    ORDER BY T.task_date
  `);
  
  const tasks = stmt.all(userId, startDate, endDate);

  // --- 数据处理：聚合每日状态 ---
  const dailyStatus = {};
  
  for (const task of tasks) {
    const date = task.task_date;
    const status = task.status;
    
    // 聚合规则：
    // 1. 如果某天还没有状态，直接记录当前状态。
    // 2. 如果某天的状态已经是 FAILED，则保持 FAILED (最高优先级)。
    // 3. 如果某天的状态是 PENDING 或 RUNNING，而新来的状态是 FAILED，则更新为 FAILED。
    // 4. 如果某天的状态是 SUCCESS，而新来的状态不是 SUCCESS，则更新为 PENDING (代表未全部完成)。
    if (!dailyStatus[date]) {
      dailyStatus[date] = status;
    } else {
      if (dailyStatus[date] === 'FAILED') continue; // 已经是失败，不再变化
      if (status === 'FAILED') {
        dailyStatus[date] = 'FAILED';
      } else if (status === 'PENDING' || status === 'RUNNING') {
        dailyStatus[date] = 'PENDING';
      } else if (dailyStatus[date] === 'SUCCESS' && status !== 'SUCCESS') {
        dailyStatus[date] = 'PENDING';
      }
    }
  }

  // 将聚合后的结果转换为前端需要的数组格式
  const result = Object.entries(dailyStatus).map(([date, status]) => ({ date, status }));
  
  // 补全过去未完成的日期
  const today = getBeijingDateString();
  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  for (let i = 1; i <= daysInMonth; i++) {
    const day = String(i).padStart(2, '0');
    const currentDate = `${month}-${day}`;
    if (currentDate < today && !dailyStatus[currentDate]) {
      result.push({ date: currentDate, status: 'FAILED' }); // 标记为失败/错过
    }
  }

  res.json(result);
};

exports.getTasksByDate = (req, res) => {
  const { id: userId, role } = req.user;
  const { date } = req.query; // e.g., "2023-11-20"

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).send({ message: "日期格式不正确，应为 YYYY-MM-DD" });
  }

  let query;
  let params;

  // 根据角色构建不同的 SQL 查询
  if (role === 'admin') {
    // 管理员：获取指定日期的所有任务
    query = `
      SELECT G.id as account_id, G.game_type, G.game_username, T.status, T.log_details, U.username as owner
      FROM DailyTasks AS T
      JOIN GameAccounts AS G ON T.game_account_id = G.id
      JOIN Users AS U ON G.user_id = U.id
      WHERE T.task_date = ?
    `;
    params = [date];
  } else {
    // 普通用户：只获取自己账号在指定日期的任务
    query = `
      SELECT G.id as account_id, G.game_type, G.game_username, T.status, T.log_details
      FROM DailyTasks AS T
      JOIN GameAccounts AS G ON T.game_account_id = G.id
      WHERE T.task_date = ? AND G.user_id = ?
    `;
    params = [date, userId];
  }

  try {
    const stmt = db.prepare(query);
    const tasks = stmt.all(params);
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks by date:", error);
    res.status(500).send({ message: "获取任务详情失败" });
  }
};

exports.getTasksByAccountId = (req, res) => {
  const userId = req.user.id; 
  const userRole = req.user.role; // 获取当前用户角色
  const accountId = req.params.accountId;

  // 1. 权限检查
  // 如果是 admin，直接跳过，拥有上帝权限
  if (userRole !== 'admin') {
    // 只有当不是管理员时，才去检查这个账号是不是属于当前用户
    const stmtCheck = db.prepare('SELECT id FROM GameAccounts WHERE id = ? AND user_id = ?');
    if (!stmtCheck.get(accountId, userId)) {
      return res.status(403).send({ message: "无权访问此账号的任务记录" });
    }
  }

  const stmt = db.prepare('SELECT * FROM DailyTasks WHERE game_account_id = ? ORDER BY task_date DESC');
  const tasks = stmt.all(accountId);
  res.json(tasks);
};