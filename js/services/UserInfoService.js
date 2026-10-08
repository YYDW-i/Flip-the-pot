// 授权必须由用户点击发起。只保留公开昵称，不使用头像、地区等资料。
export default class UserInfoService {
  constructor(api = wx) { this.api = api; this.token = 0; this.phase = 'idle'; }
  prepare(rect, camera, status, identity) {
    this.clear(); const token = this.token;
    if (!this.api.createUserInfoButton) { status('当前客户端不支持昵称授权，可匿名查看排行'); return; }
    this.phase = 'privacy'; status('请确认微信隐私授权');
    const fail = () => { if (token !== this.token) return; this.clear(); status('授权未完成，可继续匿名游玩'); };
    const ready = () => {
      if (token !== this.token || this.phase !== 'privacy') return;
      clearTimeout(this.timer); this.timer = null;
      try {
        const s = camera.scale;
        this.button = this.api.createUserInfoButton({ type: 'text', text: '点击授权昵称', lang: 'zh_CN', withCredentials: false,
          style: { left: rect.x * s, top: rect.y * s, width: rect.w * s, height: rect.h * s,
            lineHeight: rect.h * s, fontSize: 26 * s, borderRadius: 20 * s, backgroundColor: '#f46638', color: '#ffffff', textAlign: 'center' } });
        this.tap = result => {
          if (token !== this.token) return;
          const user = result && result.userInfo;
          if (!user || typeof user.nickName !== 'string' || !user.nickName.trim()) { fail(); return; }
          const nickname = Array.from(user.nickName.replace(/[\u0000-\u001f\u007f]/g, '').trim()).slice(0, 20).join('');
          this.clear(); status('正在保存公开昵称…'); identity(nickname);
        };
        this.button.onTap(this.tap); this.button.show(); this.phase = 'ready'; status('再点按钮，授权昵称用于公开排行');
      } catch (e) { fail(); }
    };
    this.timer = setTimeout(fail, 30000);
    try {
      // 使用平台统一隐私弹窗，避免注册自定义隐私监听或自动替用户同意。
      if (this.api.requirePrivacyAuthorize) this.api.requirePrivacyAuthorize({ success: ready, fail });
      else ready();
    } catch (e) { fail(); }
  }
  clear() {
    this.token++; clearTimeout(this.timer); this.timer = null;
    if (this.button) {
      try { if (this.button.offTap) this.button.offTap(this.tap); this.button.destroy(); } catch (e) {}
    }
    this.button = null; this.tap = null; this.phase = 'idle';
  }
  destroy() { this.clear(); }
}
