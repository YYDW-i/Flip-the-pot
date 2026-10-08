# 颠个锅 · PanToss

在现有微信小游戏工程中实现的竖屏物理合成游戏。单指拖锅、连续力度颠锅、移动接锅，通过真实碰撞完成升级、空中连击和三份料理订单。提供三次机会的「经典模式」与掉落扣分的「无尽模式」，两种模式各有独立的最高分排行榜。

客户端使用原生 JavaScript、wx API 和 WebGL，无第三方游戏引擎，无 npm 运行依赖。云服务未配置时也可以完整游玩。

直接用微信开发者工具打开本目录并编译。完整说明见 [README_DEV.md](README_DEV.md)，新增功能部署见 [模式与排行榜部署](docs/模式与排行榜部署.md)，实际检查见 [验收记录](docs/验收记录.md)。当前云环境仍为占位值，在 `js/config/env.js` 替换 `YOUR_CLOUD_ENV_ID` 后部署五个云函数。昵称授权由玩家主动点击，拒绝仍能匿名游玩与查看云排行。

本地 WebGL 实际画面（浏览器模拟 wx 接口，不代表微信真机验收）：

![双模式首页](docs/previews/modes-menu.png)
![空中合成和料理](docs/previews/gameplay.png)

开发检查使用 Node.js 18 或更新版本，无需安装依赖：

```powershell
node scripts/check.mjs
node --test tests/*.test.mjs
```

已按阶段 A—G、模式扩展、云排行榜、微信授权、验收文档分别提交中文 Git 版本，未推送 GitHub。
