/**
 * 🦁 荣耀系统 v12.6.0 - 配置模块
 * 包含：常量、默认任务数据、奖品数据、军衔系统
 * 🆕 任务/惩罚/商店现在支持管理员自定义
 */

// ========== 存储键名 ==========
const STORAGE = {
    USERS: 'users_v8',
    SESSION: 'session_user_v12',
    BOUNTY: 'bountyTasks_v8',
    CHILD_FILTER: 'child_filter_v12',
    // 🆕 可配置项存储
    CUSTOM_CORE_TASKS: 'custom_core_tasks_v1',
    CUSTOM_DAILY_TASKS: 'custom_daily_tasks_v1',
    CUSTOM_PENALTIES: 'custom_penalties_v1',
    CUSTOM_STORE: 'custom_store_v1'
};

// ========== 军衔系统 ==========
const RANK_SYSTEM = [
    { min: 0, icon: '🌑', name: '预备兵' },
    { min: 50, icon: '⭐️', name: '二等兵' },
    { min: 150, icon: '⭐️⭐️', name: '下士' },
    { min: 300, icon: '🌙', name: '中士' },
    { min: 600, icon: '🌙🌙', name: '上尉' },
    { min: 1000, icon: '☀️', name: '少校' },
    { min: 2000, icon: '👑', name: '五星上将' }
];

// ========== 默认核心任务 ==========
const DEFAULT_CORE_TASKS = [
    { id: 'c1', name: '📝 独立完成作业（不用催）', reward: 10, icon: '📝', enabled: true },
    { id: 'c2', name: '🎯 按时起床上学', reward: 5, icon: '🎯', enabled: true }
];

// ========== 默认每日任务 ==========
const DEFAULT_DAILY_TASKS = [
    { id: 'd1', name: '🎻 专注练琴 30分钟', reward: 5, icon: '🎻', enabled: true },
    { id: 'd2', name: '📖 晨读/背诵', reward: 3, icon: '📖', enabled: true },
    { id: 'd3', name: '🏃 户外运动 1小时', reward: 5, icon: '🏃', enabled: true }
];

// ========== 默认悬赏任务 ==========
const DEFAULT_BOUNTY_TASKS = [
    { id: 'b1', name: '👶 带弟弟沫沫玩耍', reward: 10, icon: '👶', enabled: true },
    { id: 'b2', name: '🔧 协助爸爸修理东西', reward: 15, icon: '🔧', enabled: true }
];

// ========== 默认惩罚项目 ==========
const DEFAULT_PENALTIES = [
    { id: 'p1', name: '😡 对长辈大吼大叫/顶嘴', cost: 20, icon: '😡', enabled: true },
    { id: 'p2', name: '🐢 磨磨蹭蹭，不守时间', cost: 10, icon: '🐢', enabled: true },
    { id: 'p3', name: '📱 未经允许玩电子产品', cost: 50, icon: '📱', enabled: true }
];

// ========== 默认商店物品 ==========
const DEFAULT_STORE_ITEMS = [
    { id: 's1', name: '🎮 玩手机 30分钟', cost: 50, icon: '🎮', enabled: true },
    { id: 's2', name: '🎬 看电影一部', cost: 100, icon: '🎬', enabled: true },
    { id: 's3', name: '👑 周末指挥官', cost: 300, icon: '👑', enabled: true },
    { id: 's4', name: '🛠️ 工具箱使用权', cost: 100, icon: '🛠️', enabled: true }
];

// ========== 可用图标列表 ==========
const AVAILABLE_ICONS = [
    '📝', '🎯', '🎻', '📖', '🏃', '👶', '🔧', '🎮', '🎬', '👑', '🛠️',
    '⭐', '🌟', '💪', '🏆', '🎁', '🎉', '💡', '📚', '🎨', '🎵', '🏅',
    '🚀', '💎', '🔥', '⚡', '🌈', '🎊', '✨', '🌻', '🍎', '🎈'
];

// ========== 默认用户 ==========
const DEFAULT_USERS = [
    { username: 'dad', password: '654321', nickname: '爸爸', role: 'admin' },
    { username: 'zaki', password: '123456', nickname: 'Zaki', role: 'executor' }
];

// ========== 版本信息 ==========
const APP_VERSION = 'v12.5.3';
const APP_NAME = '🦁 荣耀系统';

// 导出（如果使用 ES6 模块）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        STORAGE, RANK_SYSTEM, 
        DEFAULT_CORE_TASKS, DEFAULT_DAILY_TASKS, DEFAULT_BOUNTY_TASKS,
        DEFAULT_PENALTIES, DEFAULT_STORE_ITEMS, AVAILABLE_ICONS,
        DEFAULT_USERS, APP_VERSION, APP_NAME
    };
}
