// Firebase 配置文件
// 注意：需要替换为你自己的 Firebase 项目配置

// 将下面的占位符替换为你的项目配置（控制台 → 项目设置 → 常规 → "SDK setup and configuration" 里的 Web 配置）
// 提供本地覆盖能力：如果 localStorage 里保存了键 `firebase_config_v8`，会优先使用该配置。
// 使用你提供的正式配置（Compat SDK 适配 <script> 标签）
const defaultFirebaseConfig = {
  apiKey: "AIzaSyD7-w94Zm2wLHTvAvdmDUEmW2FwF_B5vH0",
  authDomain: "rongyaoxitong.firebaseapp.com",
  databaseURL: "https://rongyaoxitong-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rongyaoxitong",
  storageBucket: "rongyaoxitong.firebasestorage.app",
  messagingSenderId: "426231322792",
  appId: "1:426231322792:web:7c2c5cc3dcf451543eca9d",
  measurementId: "G-V935HHFCQ4"
};

function getStoredFirebaseConfig() {
  try {
    const text = localStorage.getItem('firebase_config_v8');
    if (!text) return null;
    const cfg = JSON.parse(text);
    // 简单校验
    if (cfg && cfg.apiKey && cfg.projectId && cfg.appId) return cfg;
    return null;
  } catch (_) {
    return null;
  }
}

const firebaseConfig = Object.assign({}, defaultFirebaseConfig, getStoredFirebaseConfig() || {});

// 初始化 Firebase（避免重复初始化）
try {
  console.log('🧩 Firebase 配置来源:', getStoredFirebaseConfig() ? 'localStorage覆盖' : '默认配置');
  console.log('🌐 databaseURL:', firebaseConfig.databaseURL || '(未设置)');
  if (firebase && firebase.apps && firebase.apps.length > 0) {
    firebase.app();
  } else {
    firebase.initializeApp(firebaseConfig);
  }
  window.firebaseInitOk = true;
} catch (e) {
  console.error('❌ Firebase 初始化失败:', e);
  window.firebaseInitOk = false;
}
const database = firebase.database();

// 房间ID配置（用于多设备共享同一通道）
function getFamilyRoom() {
  // 使用固定的默认房间ID,所有设备自动共享
  return 'my_family';
}

function setFamilyRoom(name) {
  // 已移除房间设置功能
  console.log('房间设置功能已禁用,使用固定房间ID');
}

// 获取当前家庭/房间的引用
function getFamilyRef() {
  return database.ref('families/' + getFamilyRoom());
}

// 监听待审批任务变化
function listenForPendingTasks() {
  if (!currentUser || currentUser.role !== 'admin') return;
  
  getFamilyRef().child('pendingTasks').on('child_added', (snapshot) => {
    const task = snapshot.val();
    if (task && task.status === 'pending') {
      // 显示桌面通知
      showDesktopNotification('📋 有新任务待审批', `${task.submitterName}提交了：${task.name}`);
      // 刷新UI
      refreshUI();
    }
  });
}

// 监听审批结果变化
function listenForApprovalResults() {
  if (!currentUser || currentUser.role !== 'executor') return;
  
  getFamilyRef().child('approvalResults').on('child_added', (snapshot) => {
    const result = snapshot.val();
    if (result && result.username === currentUser.username) {
      const message = result.approved 
        ? `✅ 你的"${result.taskName}"已被通过！获得 ${result.points} 颗星` 
        : `❌ 你的"${result.taskName}"被驳回了`;
      showDesktopNotification('📲 审批结果', message);
      refreshUI();
    }
  });
}

// 显示桌面通知
function showDesktopNotification(title, message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: message,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%23667eea" width="192" height="192"/><text x="50%" y="50%" font-size="100" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="white">🦁</text></svg>',
      tag: 'honor-system'
    });
  }
}

// 请求通知权限
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// 通过弹窗快速配置 Firebase（将 Web 配置 JSON 粘贴即可）
function promptFirebaseConfig() {
  try {
    const example = '{\n  "apiKey": "...",\n  "authDomain": "your-project.firebaseapp.com",\n  "databaseURL": "https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app",\n  "projectId": "your-project",\n  "storageBucket": "your-project.appspot.com",\n  "messagingSenderId": "...",\n  "appId": "..."\n}';
    const input = prompt('请粘贴 Firebase Web 配置 JSON（来自 Firebase 控制台）', example);
    if (!input) return;
    const cfg = JSON.parse(input);
    if (!cfg.apiKey || !cfg.projectId || !cfg.appId) {
      if (typeof showMessage === 'function') {
        showMessage('⚠️ 配置不完整，请粘贴完整 JSON', 'error');
      }
      return;
    }
    localStorage.setItem('firebase_config_v8', JSON.stringify(cfg));
    if (typeof showMessage === 'function') {
      showMessage('✅ 配置已保存，请刷新页面后重试云连接', 'success');
    }
  } catch (e) {
    if (typeof showMessage === 'function') {
      showMessage('❌ 配置保存失败：' + e.message, 'error');
    }
  }
}

function clearFirebaseConfig() {
  localStorage.removeItem('firebase_config_v8');
  if (typeof showMessage === 'function') {
    showMessage('✅ 已清除本地云配置，如需使用请重新粘贴', 'success');
  }
}
