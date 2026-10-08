// 云环境需与小游戏 AppID 对应；保留当前已配置的环境。
export const CLOUD_ENV_ID = 'cloud1-d7gfufipz043e9ae9';
// 首次访问的云函数可能冷启动，避免五秒就把正常请求判为离线。
export const CLOUD_TIMEOUT_MS = 15000;
