/**
 * 🦁 荣耀系统 v12.2.0 - 认证模块
 * 处理登录、注册、密码管理、会话管理
 */

const Auth = {
    // 当前会话
    currentSession: null,

    // ========== 初始化 ==========
    init() {
        this.currentSession = Storage.getSession();
        return this.currentSession;
    },

    // ========== 登录 ==========
    async login(username, password, role) {
        username = (username || '').trim().toLowerCase();
        password = (password || '').trim();
        
        if (!username || !password) {
            throw new Error('请输入用户名和密码');
        }

        const user = Storage.findUser(username);
        
        // 新用户注册
        if (!user) {
            if (role === 'admin') {
                throw new Error('管理员账号不存在');
            }
            // 自动注册孩子账号
            return await this.register(username, password, role);
        }

        // 验证密码
        if (user.password !== password) {
            throw new Error('密码错误');
        }

        // 验证角色
        if (user.role !== role) {
            throw new Error(`该账号是${user.role === 'admin' ? '管理员' : '执行者'}账号`);
        }

        // 保存会话
        const session = {
            username: user.username,
            nickname: user.nickname || user.username,
            role: user.role,
            loginTime: Date.now()
        };
        
        Storage.saveSession(session);
        this.currentSession = session;

        // 孩子登录时从云端同步分数
        if (role === 'executor') {
            await this.syncCloudScore(user.username);
        }

        return session;
    },

    // ========== 注册 ==========
    async register(username, password, role) {
        username = (username || '').trim().toLowerCase();
        password = (password || '').trim();

        if (!username || !password) {
            throw new Error('请输入用户名和密码');
        }

        if (password.length < 4) {
            throw new Error('密码至少4位');
        }

        const existingUser = Storage.findUser(username);
        if (existingUser) {
            throw new Error('用户名已存在');
        }

        // 如果是管理员注册，需要特殊验证
        if (role === 'admin') {
            throw new Error('暂不支持注册管理员账号');
        }

        const users = Storage.getUsers();
        const newUser = {
            username: username,
            password: password,
            nickname: username,
            role: 'executor',
            score: 0,
            createdAt: Date.now()
        };

        users.push(newUser);
        Storage.saveUsers(users);

        // 保存会话
        const session = {
            username: newUser.username,
            nickname: newUser.nickname,
            role: newUser.role,
            loginTime: Date.now()
        };

        Storage.saveSession(session);
        this.currentSession = session;

        return session;
    },

    // ========== 登出 ==========
    logout() {
        Storage.clearSession();
        this.currentSession = null;
        
        // 停止 Firebase 监听
        if (typeof FirebaseSync !== 'undefined') {
            FirebaseSync.stopTasksListener();
        }
    },

    // ========== 修改密码 ==========
    changePassword(username, oldPassword, newPassword) {
        const users = Storage.getUsers();
        const userIndex = users.findIndex(u => u.username === username);

        if (userIndex === -1) {
            throw new Error('用户不存在');
        }

        if (users[userIndex].password !== oldPassword) {
            throw new Error('原密码错误');
        }

        if (newPassword.length < 4) {
            throw new Error('新密码至少4位');
        }

        users[userIndex].password = newPassword;
        Storage.saveUsers(users);

        return true;
    },

    // ========== 重置密码（找回密码）==========
    resetPassword(username, newPassword) {
        const users = Storage.getUsers();
        const userIndex = users.findIndex(u => 
            u.username.toLowerCase() === username.toLowerCase()
        );

        if (userIndex === -1) {
            throw new Error('用户名不存在');
        }

        if (newPassword.length < 4) {
            throw new Error('新密码至少4位');
        }

        users[userIndex].password = newPassword;
        Storage.saveUsers(users);

        return {
            nickname: users[userIndex].nickname || username
        };
    },

    // ========== 同步云端分数 ==========
    async syncCloudScore(username) {
        if (typeof FirebaseSync === 'undefined') return;

        try {
            const cloudScore = await FirebaseSync.syncScoreFromCloud(username);
            if (cloudScore !== null) {
                const localScore = Storage.getScore(username);
                // 使用较大的分数
                const finalScore = Math.max(cloudScore, localScore);
                Storage.saveScore(username, finalScore);
            }
        } catch (e) {
            console.warn('⚠️ 同步云端分数失败:', e);
        }
    },

    // ========== 获取当前用户 ==========
    getCurrentUser() {
        if (!this.currentSession) return null;
        return Storage.findUser(this.currentSession.username);
    },

    // ========== 检查是否已登录 ==========
    isLoggedIn() {
        return this.currentSession !== null;
    },

    // ========== 检查是否是管理员 ==========
    isAdmin() {
        return this.currentSession && this.currentSession.role === 'admin';
    },

    // ========== 获取所有孩子账号 ==========
    getChildren() {
        return Storage.getExecutorUsers();
    },

    // ========== 更新昵称 ==========
    updateNickname(username, newNickname) {
        const users = Storage.getUsers();
        const userIndex = users.findIndex(u => u.username === username);

        if (userIndex === -1) {
            throw new Error('用户不存在');
        }

        users[userIndex].nickname = newNickname;
        Storage.saveUsers(users);

        // 更新当前会话
        if (this.currentSession && this.currentSession.username === username) {
            this.currentSession.nickname = newNickname;
            Storage.saveSession(this.currentSession);
        }

        return true;
    }
};
