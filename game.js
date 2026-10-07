import Main from './js/main.js';

// 主画布只创建一次，不使用浏览器适配层或页面体系。
try { GameGlobal.panToss = new Main(); }
catch (error) {
  console.error('PanToss 启动失败', error);
  try { wx.showModal({ title: '启动异常', content: '请检查开发者工具控制台：' + error.message, showCancel: false }); } catch (e) {}
}
