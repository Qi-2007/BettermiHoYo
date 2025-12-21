// services/MachineControlService.js

const { exec } = require('child_process');
const wol = require('wake_on_lan');
const SmartPlugService = require('./SmartPlugService'); // 引入我们之前设计的排插服务
const CONFIG = require('../../config'); // 引入项目配置文件

// 一个简单的延时函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class MachineControlService {

  /**
   * 尝试通过 SSH 关闭 Windows 电脑
   * @returns {Promise<boolean>} - 返回一个 Promise，成功时 resolve(true)，失败或超时时 resolve(false)
   */
  async shutdownSsh() {
    console.log('[Control] Attempting SSH shutdown...');
    const command = `ssh ${CONFIG.WIN11_USER}@${CONFIG.WIN11_IP} 'shutdown /s /t 60'`; // 留60秒缓冲
    
    return new Promise((resolve) => {
      exec(command, { timeout: 15000 }, (error, stdout, stderr) => { // 15秒超时
        if (error) {
          console.error(`[Control] SSH shutdown failed or timed out: ${error.message}`);
          resolve(false);
        } else {
          console.log('[Control] SSH shutdown command sent successfully.');
          resolve(true);
        }
      });
    });
  }

  /**
   * 对排插进行一次完整的“断电-等待-通电”循环
   */
  async powerCycle() {
    try {
      console.log('[Control] Starting power cycle. Turning plug off...');
      await SmartPlugService.turnOff();
      
      console.log(`[Control] Plug is off. Waiting for ${CONFIG.POWER_CYCLE_WAIT_MIN} minutes...`);
      await delay(CONFIG.POWER_CYCLE_WAIT_MIN * 60 * 1000);
      
      console.log('[Control] Wait time finished. Turning plug on...');
      await SmartPlugService.turnOn();
      console.log('[Control] Power cycle completed. Plug is on.');
    } catch (error) {
      console.error('[Control] An error occurred during power cycle:', error);
      // 在这里可以添加失败后的通知逻辑，比如发邮件
    }
  }

  /**
   * 发送网络唤醒 (WOL) 包
   */
  async wakeOnLan() {
    console.log(`[Control] Sending Wake-on-LAN packet to ${CONFIG.WIN11_MAC_ADDRESS} via broadcast address ${CONFIG.WOL_BROADCAST_ADDRESS}...`);
    return new Promise((resolve, reject) => {
      // 为 wake 函数添加第二个参数：一个包含 broadcast address 的 options 对象
      wol.wake(CONFIG.WIN11_MAC_ADDRESS, { address: CONFIG.WOL_BROADCAST_ADDRESS }, (error) => {
        if (error) {
          console.error('[Control] Failed to send WOL packet:', error);
          reject(error);
        } else {
          console.log('[Control] WOL packet sent successfully.');
          resolve(true);
        }
      });
    });
  }

  /**
   * 执行完整的强制重启流程
   * 这是我们的核心业务逻辑组合
   */
  async forceRestartSequence() {
    console.log('====== [Control] Initiating Force Restart Sequence ======');
    
    const sshSuccess = await this.shutdownSsh();
    
    if (sshSuccess) {
      console.log(`[Control] SSH shutdown succeeded. Waiting for 5 minutes before power cycle...`);
      await delay(5 * 60 * 1000);
    } else {
      console.log(`[Control] SSH shutdown failed. Proceeding directly to power cycle.`);
    }
    
    await this.powerCycle();
    
    console.log('[Control] Waiting for 1 minute for machine to stabilize after power on...');
    await delay(1 * 60 * 1000);
    
    await this.wakeOnLan();
    
    console.log('====== [Control] Force Restart Sequence Finished ======');
  }
}

// 导出单例
module.exports = new MachineControlService();