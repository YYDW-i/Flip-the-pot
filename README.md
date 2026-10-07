# 颠个锅 · PanToss

在现有微信小游戏工程中实现的竖屏物理合成游戏。单指拖锅、连续力度颠锅、移动接锅，通过真实碰撞完成升级、空中连击和三份料理订单。

客户端使用原生 JavaScript、wx API 和 WebGL，无第三方游戏引擎，无 npm 运行依赖。云服务未配置时也可以完整游玩。

直接用微信开发者工具打开本目录并编译。完整运行步骤、目录说明、调参、云部署和验收结果见 [README_DEV.md](README_DEV.md)，实际检查记录见 [验收记录](docs/验收记录.md)。当前云环境仍为占位值，在 `js/config/env.js` 中替换 `YOUR_CLOUD_ENV_ID` 后部署三个云函数。

本地 WebGL 实际画面（浏览器模拟 wx 接口，不代表微信真机验收）：

![首页](docs/previews/menu.png)
![空中合成和料理](docs/previews/gameplay.png)

开发检查使用 Node.js 18 或更新版本，无需安装依赖：

```powershell
node scripts/check.mjs
node --test tests/*.test.mjs
```

已按阶段 A—G、验收修复和文档分别提交中文 Git 版本，未推送 GitHub。
