// 这个服务使用一个简单的对象在内存中存储最新状态
// 如果服务器重启，状态会丢失，但这对于心跳监控来说是可以接受的
const state = {
  lastHeartbeat: null,
  data: null,
};

const MAX_HEARTBEAT_AGE_MS = 2 * 60 * 1000; // 2分钟

class HeartbeatService {
  /**
   * 由 BGI-Agent 调用，用于更新心跳数据
   * @param {object} heartbeatData 从 Agent 发来的数据
   */
  updateStatus(heartbeatData) {
    state.lastHeartbeat = new Date();
    state.data = heartbeatData;
    console.log('[HeartbeatService] Heartbeat received:', heartbeatData);
  }

  /**
   * 由前端管理员面板调用，用于获取当前状态
   * @returns {object}
   */
  getStatus() {
    const now = new Date();
    const isConnected = state.lastHeartbeat && (now - state.lastHeartbeat < MAX_HEARTBEAT_AGE_MS);

    return {
      isConnected: isConnected,
      lastSeen: state.lastHeartbeat ? state.lastHeartbeat.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : null,
      data: isConnected ? state.data : null, // 如果断连，则不发送旧数据
    };
  }
}

// 导出单例
module.exports = new HeartbeatService();