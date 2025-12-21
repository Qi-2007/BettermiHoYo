const cron = require('node-cron');
const { db } = require('../db/database');

/**
 * 获取当前北京时间的 YYYY-MM-DD 格式日期字符串
 * @returns {string}
 */
function getBeijingDateString() {
  // 使用 toLocaleString 获取特定时区的日期时间，然后重新构造 Date 对象以避免本地时区影响
  const beijingTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" });
  const date = new Date(beijingTime);
  const year = date.getFullYear();
  // 月份是从 0 开始的，所以要 +1
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * 这是核心的每日任务生成函数
 */
function generateDailyTasks() {
  console.log(`[Scheduler] Running job: generateDailyTasks at ${new Date().toISOString()}`);
  
  const today = getBeijingDateString();
  console.log(`[Scheduler] Today's date (Beijing Time) is: ${today}`);

  try {
    // 使用 better-sqlite3 的事务功能，确保操作的原子性
    // 如果中间有任何一步失败，所有操作都会回滚
    const transaction = db.transaction(() => {
      // 1. 找出所有启用的游戏账号
      const stmtGetEnabledAccounts = db.prepare('SELECT id FROM GameAccounts WHERE is_enabled = 1');
      const enabledAccounts = stmtGetEnabledAccounts.all();
      
      if (enabledAccounts.length === 0) {
        console.log('[Scheduler] No enabled accounts found. Job finished.');
        return;
      }
      
      console.log(`[Scheduler] Found ${enabledAccounts.length} enabled accounts.`);

      const stmtCheckTask = db.prepare('SELECT id FROM DailyTasks WHERE game_account_id = ? AND task_date = ?');
      const stmtInsertTask = db.prepare('INSERT INTO DailyTasks (game_account_id, task_date) VALUES (?, ?)');

      let createdCount = 0;
      for (const account of enabledAccounts) {
        // 2. 检查任务是否已存在
        const existingTask = stmtCheckTask.get(account.id, today);
        
        if (existingTask) {
          // 3. 如果存在，跳过
          console.log(`[Scheduler] Task for account ${account.id} on ${today} already exists. Skipping.`);
        } else {
          // 4. 如果不存在，创建新任务
          stmtInsertTask.run(account.id, today);
          console.log(`[Scheduler] CREATED task for account ${account.id} on ${today}.`);
          createdCount++;
        }
      }
      console.log(`[Scheduler] Job finished. Created ${createdCount} new tasks.`);
    });

    // 执行事务
    transaction();

  } catch (error) {
    console.error('[Scheduler] An error occurred during daily task generation:', error);
  }
}

/**
 * 启动调度器
 */
function startScheduler() {
  // Cron 表达式 '0 4 * * *' 表示每天的 4 点 0 分
  // timezone: "Asia/Shanghai" 确保了无论服务器在哪个时区，都以北京时间为准
  cron.schedule('0 4 * * *', generateDailyTasks, {
    scheduled: true,
    timezone: "Asia/Shanghai"
  });

  console.log('✅ [Scheduler] Daily task scheduler started. Will run every day at 4:00 AM Beijing Time.');
  
  // (可选) 为了方便测试，可以在服务器启动时立即执行一次
   console.log('[Scheduler] Running an initial task generation for testing...');
   generateDailyTasks();
}

module.exports = { startScheduler };