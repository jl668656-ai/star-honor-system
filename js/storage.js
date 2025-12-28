/**
 * 🦁 荣耀系统 v12.5.0 - 存储模块
 * 封装 localStorage 操作，提供统一的数据访问接口
 * 🆕 新增任务/惩罚/商店自定义配置存储
 */

const Storage = {
    // ========== 工具函数 ==========
    safeJsonParse(text, fallback) {
        try {
            if (!text) return fallback;
            return JSON.parse(text);
        } catch (_) {
            return fallback;
        }
    },

    // ========== 用户相关 ==========
    getUsers() {
        return this.safeJsonParse(localStorage.getItem(STORAGE.USERS), []);
    },

    saveUsers(users) {
        localStorage.setItem(STORAGE.USERS, JSON.stringify(users));
    },

    findUser(username) {
        const users = this.getUsers();
        return users.find(u => u && u.username === username);
    },

    findUserCaseInsensitive(username) {
        const users = this.getUsers();
        const lower = username.toLowerCase();
        return users.filter(u => u && u.username && u.username.toLowerCase() === lower);
    },

    addOrUpdateUser(user) {
        const users = this.getUsers();
        const idx = users.findIndex(u => u && u.username === user.username);
        if (idx === -1) {
            users.push(user);
        } else {
            users[idx] = { ...users[idx], ...user };
        }
        this.saveUsers(users);
        return users;
    },

    // ========== 会话相关 ==========
    getSession() {
        const raw = this.safeJsonParse(localStorage.getItem(STORAGE.SESSION), null);
        if (!raw || !raw.user) return null;
        return raw.user;
    },

    saveSession(user) {
        localStorage.setItem(STORAGE.SESSION, JSON.stringify({
            user,
            at: Date.now()
        }));
    },

    clearSession() {
        localStorage.removeItem(STORAGE.SESSION);
    },

    // ========== 分数相关 ==========
    getScore(username) {
        try {
            return parseInt(localStorage.getItem(`score_${username}_v8`), 10) || 0;
        } catch (_) {
            return 0;
        }
    },

    saveScore(username, score) {
        try {
            localStorage.setItem(`score_${username}_v8`, String(Math.max(0, score || 0)));
        } catch (_) {}
    },

    // ========== 🆕 核心任务配置 ==========
    getCoreTasks() {
        return this.safeJsonParse(localStorage.getItem(STORAGE.CUSTOM_CORE_TASKS), DEFAULT_CORE_TASKS);
    },

    saveCoreTasks(tasks) {
        localStorage.setItem(STORAGE.CUSTOM_CORE_TASKS, JSON.stringify(tasks));
    },

    // ========== 🆕 每日任务配置 ==========
    getDailyTasks() {
        return this.safeJsonParse(localStorage.getItem(STORAGE.CUSTOM_DAILY_TASKS), DEFAULT_DAILY_TASKS);
    },

    saveDailyTasks(tasks) {
        localStorage.setItem(STORAGE.CUSTOM_DAILY_TASKS, JSON.stringify(tasks));
    },

    // ========== 悬赏任务相关 ==========
    getBountyTasks() {
        return this.safeJsonParse(localStorage.getItem(STORAGE.BOUNTY), DEFAULT_BOUNTY_TASKS);
    },

    saveBountyTasks(tasks) {
        localStorage.setItem(STORAGE.BOUNTY, JSON.stringify(tasks));
    },

    // ========== 🆕 惩罚配置 ==========
    getPenalties() {
        return this.safeJsonParse(localStorage.getItem(STORAGE.CUSTOM_PENALTIES), DEFAULT_PENALTIES);
    },

    savePenalties(penalties) {
        localStorage.setItem(STORAGE.CUSTOM_PENALTIES, JSON.stringify(penalties));
    },

    // ========== 🆕 商店配置 ==========
    getStoreItems() {
        return this.safeJsonParse(localStorage.getItem(STORAGE.CUSTOM_STORE), DEFAULT_STORE_ITEMS);
    },

    saveStoreItems(items) {
        localStorage.setItem(STORAGE.CUSTOM_STORE, JSON.stringify(items));
    },

    // ========== 🆕 重置为默认配置 ==========
    resetToDefaults(type) {
        switch (type) {
            case 'core':
                localStorage.removeItem(STORAGE.CUSTOM_CORE_TASKS);
                break;
            case 'daily':
                localStorage.removeItem(STORAGE.CUSTOM_DAILY_TASKS);
                break;
            case 'bounty':
                localStorage.removeItem(STORAGE.BOUNTY);
                break;
            case 'penalties':
                localStorage.removeItem(STORAGE.CUSTOM_PENALTIES);
                break;
            case 'store':
                localStorage.removeItem(STORAGE.CUSTOM_STORE);
                break;
            case 'all':
                localStorage.removeItem(STORAGE.CUSTOM_CORE_TASKS);
                localStorage.removeItem(STORAGE.CUSTOM_DAILY_TASKS);
                localStorage.removeItem(STORAGE.BOUNTY);
                localStorage.removeItem(STORAGE.CUSTOM_PENALTIES);
                localStorage.removeItem(STORAGE.CUSTOM_STORE);
                break;
        }
    },

    // ========== 孩子筛选器相关 ==========
    getChildFilter() {
        try {
            return localStorage.getItem(STORAGE.CHILD_FILTER) || 'all';
        } catch (_) {
            return 'all';
        }
    },

    saveChildFilter(value) {
        try {
            localStorage.setItem(STORAGE.CHILD_FILTER, value || 'all');
        } catch (_) {}
    },

    // ========== 执行者用户列表 ==========
    getExecutorUsers() {
        const users = this.getUsers();
        return users.filter(u => u && u.username && u.role === 'executor');
    },

    // ========== 数据导出 ==========
    exportAllData() {
        const users = this.getUsers();
        const userScores = {};
        users.forEach(user => {
            userScores[user.username] = {
                score: this.getScore(user.username)
            };
        });

        return {
            users,
            bountyTasks: this.getBountyTasks(),
            coreTasks: this.getCoreTasks(),
            dailyTasks: this.getDailyTasks(),
            penalties: this.getPenalties(),
            storeItems: this.getStoreItems(),
            userScores,
            timestamp: new Date().toISOString(),
            version: APP_VERSION
        };
    },

    // ========== 数据导入 ==========
    importAllData(data) {
        if (!data.users || !data.userScores) {
            throw new Error('数据格式错误');
        }

        this.saveUsers(data.users);
        
        if (data.bountyTasks) this.saveBountyTasks(data.bountyTasks);
        if (data.coreTasks) this.saveCoreTasks(data.coreTasks);
        if (data.dailyTasks) this.saveDailyTasks(data.dailyTasks);
        if (data.penalties) this.savePenalties(data.penalties);
        if (data.storeItems) this.saveStoreItems(data.storeItems);

        Object.keys(data.userScores).forEach(username => {
            const userData = data.userScores[username];
            this.saveScore(username, userData.score || 0);
        });

        return true;
    },

    // ========== 清除所有数据 ==========
    clearAll() {
        localStorage.clear();
    }
};

// 检测 Safari 隐私模式
(function checkSafariPrivateMode() {
    try {
        localStorage.setItem('safari_test', '1');
        localStorage.removeItem('safari_test');
    } catch (e) {
        setTimeout(() => {
            alert('⚠️ 检测到Safari隐私保护阻止了应用\n\n请在Safari中：\n1. 点击地址栏左侧"aA"\n2. 选择"网站设置"\n3. 关闭"阻止跨站跟踪"\n4. 允许所有Cookie\n\n或使用Chrome浏览器访问');
        }, 300);
    }
})();
