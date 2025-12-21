// SmartPlugService.js

// 依赖: npm install digest-fetch@v2 node-fetch@v2
const DigestClient = require('digest-fetch');

// --- 从配置文件读取这些值 ---
const PLUG_IP = '192.168.1.8';       // 您的排插 IP 地址
const PLUG_USERNAME = 'admin';
const PLUG_PASSWORD = 'admin888';
const POWER_SENSOR_ID = '24___';
const SWITCH_ID = '33_____';
// ------------------------------

const baseURL = `http://${PLUG_IP}`;
const client = new DigestClient(PLUG_USERNAME, PLUG_PASSWORD);

class SmartPlugService {
    #queue = Promise.resolve();

    #enqueue(operation) {
        const resultPromise = this.#queue.then(operation);
        this.#queue = resultPromise.catch(() => {});
        return resultPromise;
    }

    /**
     * 获取当前功率 (单位: W)
     * @returns {Promise<number>}
     */
    async getPower() {
        return this.#enqueue(async () => {
            console.log('[SmartPlugService] Starting "getPower" operation from queue...');
            const url = `${baseURL}/sensor/${POWER_SENSOR_ID}`;
            const response = await client.fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            console.log(`[SmartPlugService] "getPower" completed. Power: ${data.value} W`);
            return data.value;
        });
    }

    // --- NEW FUNCTION ADDED HERE ---
    /**
     * 获取开关的当前状态
     * @returns {Promise<boolean>} - true for ON, false for OFF
     */
    async getSwitchState() {
        return this.#enqueue(async () => {
            console.log('[SmartPlugService] Starting "getSwitchState" operation from queue...');
            const url = `${baseURL}/switch/${SWITCH_ID}`;
            const response = await client.fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            console.log(`[SmartPlugService] "getSwitchState" completed. State: ${data.value ? 'ON' : 'OFF'}`);
            // 根据您提供的文档, data.value 是一个布尔值
            return data.value;
        });
    }
    // -----------------------------

    /**
     * 打开排插开关
     */
    async turnOn() {
        return this.#enqueue(async () => {
            console.log('[SmartPlugService] Starting "turnOn" operation from queue...');
            const url = `${baseURL}/switch/${SWITCH_ID}/turn_on`;
            const response = await client.fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            console.log('[SmartPlugService] "turnOn" completed. Plug is ON.');
            return { success: true };
        });
    }

    /**
     * 关闭排插开关
     */
    async turnOff() {
        return this.#enqueue(async () => {
            console.log('[SmartPlugService] Starting "turnOff" operation from queue...');
            const url = `${baseURL}/switch/${SWITCH_ID}/turn_off`;
            const response = await client.fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            console.log('[SmartPlugService] "turnOff" completed. Plug is OFF.');
            return { success: true };
        });
    }
}

module.exports = new SmartPlugService();