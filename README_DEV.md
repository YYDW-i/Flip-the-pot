# 颠个锅 · PanToss 开发说明

## 1. 打开与运行

1. 用微信开发者工具打开当前目录 `E:\wechatcode\minigame-1`，项目类型为「小游戏」。
2. 原 AppID `wx41e18e76f0876f80` 已保留，`project.private.config.json` 保留原个人设置。使用有此 AppID 权限的微信账号登录工具。
3. 点击「编译」，进入首页，再点击「开始颠锅」。首次进入会进行三步实际操作练习。
4. 先验证核心玩法，再配置云环境。保持 `YOUR_CLOUD_ENV_ID` 占位值时，游戏使用本地存档，不发出云请求。

客户端不需要 npm install 或「构建 npm」。主入口是 `game.js`；仍使用原生小游戏、wx API 和 WebGL，不使用 WXML/WXSS、浏览器 DOM/BOM 或外部 CDN。测试网页单独放在 `tests/`，不会进入小游戏包。

当前模板实际是飞机示例，未发现 weapp-adapter、symbol 等适配文件；原生 wx Canvas 和触摸 API 已直接接入，没有删除必要适配层。原模板 `audio/`、`images/` 已保留，当前不使用并从打包中排除。

## 2. 操作与玩法

- 按住屏幕下半部分左右拖锅。锅以弹簧和阻尼跟随，快速拖动会倾斜并带动食材重新排列。
- 快速向上甩动颠锅，速度连续影响高度；横向手势、锅速、锅角、食材位置与质量共同影响轨迹。食材飞行期间仍可移锅接住。
- 同类型、同等级、未到 Lv5 的食材真实碰撞才合成。新食材保留质量中心与近似动量，用冷却防止重复合成。
- 双方离锅一段时间后的空中合成得分 ×2；1.2 秒窗口内连续合成增加连击，倍率从 ×1、×1.5、×2 逐步增加，上限 ×6。
- 连续空中合成显示「完美颠锅」，强化光圈、粒子与浮字；高连击可触发 0.1 秒短暂慢动作，锅按真实时间继续响应。
- 危险食材被玩家移锅接住后显示「救回来了！」并加 20 分。刚过锅沿不会立即扣机会，真正离开救援范围才计失误；三次后减速结算。
- 开局番茄 ×2、鸡蛋 ×2、蘑菇 ×1，三种食材各五级。高级食材更大、更重、更难颠。
- 新食材约每 4 秒落下，逐渐加快，最低 2.35 秒；显示下一食材与落点预告，上限 30 个。
- 点击暂停或进入后台会停止模拟，回到前台需点击「继续游戏」才恢复。
- 「再颠一锅」清空并重置本局，不重载小游戏、不重复注册触摸监听。
- 首页「玩法」可再次进行不扣机会、无新增压力的三步练习；「设置」保存音效和震动开关。

得分统一由 ScoreSystem 管理。普通合成按新等级基础分计分：Lv2 / Lv3 / Lv4 / Lv5 为 20 / 40 / 80 / 160，再乘空中与连击倍率。

| 当前订单 | 所需食材（达到或超过等级） | 基础分 |
| --- | --- | ---: |
| 番茄炒蛋 | 番茄 Lv3 + 鸡蛋 Lv3 | 300 |
| 蘑菇煎蛋 | 蘑菇 Lv3 + 鸡蛋 Lv3 | 500 |
| 番茄蘑菇锅 | 番茄 Lv4 + 蘑菇 Lv4 | 800 |

不同类型默认弹开；符合订单且相对接近速度达到 90 逻辑像素/秒的真实碰撞才完成料理。静止堆放不能交单。料理消耗两份食材、出锅清场，空中料理 ×1.5，再乘连击倍率；订单依次轮换。

## 3. 最终目录与模块职责

```text
minigame-1/
├── game.js                              启动与明确报错
├── game.json                            竖屏配置
├── project.config.json                  AppID、云函数目录、打包排除
├── project.private.config.json          保留的个人配置
├── package.json                         检查命令，无客户端依赖
├── .eslintrc.cjs / .gitattributes / .gitignore
├── README.md / README_DEV.md / LICENSE
├── js/
│   ├── main.js
│   ├── config/
│   │   ├── gameConfig.js                集中的手感、物理、等级、反馈参数
│   │   ├── recipes.js                   三份订单
│   │   ├── env.js                       云环境 ID、请求超时
│   │   └── remoteConfig.js              远程白名单与范围验证
│   ├── core/
│   │   ├── Game.js                      生命周期与系统协调
│   │   ├── GameLoop.js                  accumulator 固定时间步
│   │   └── GameState.js                 六种状态
│   ├── input/
│   │   ├── InputManager.js              原生触摸统一注册与分发
│   │   └── GestureDetector.js           手势速度、距离、触发锁定
│   ├── entities/
│   │   ├── Pot.js                       运动学锅、惯性、倾斜与颠锅
│   │   └── Ingredient.js                刚体和视觉属性
│   ├── physics/
│   │   ├── PhysicsWorld.js              重力、子步、圆与锅碰撞
│   │   └── Collision.js                 分离、摩擦与冲量
│   ├── systems/
│   │   ├── SpawnSystem.js               有种子的新食材、压力与预告
│   │   ├── MergeSystem.js               合成、空中判定、动量继承
│   │   ├── RecipeSystem.js              碰撞料理与订单轮换
│   │   ├── ScoreSystem.js               全部加分与菜品统计
│   │   ├── ComboSystem.js               连击窗口、倍率、空中连击
│   │   ├── SaveSystem.js                危险标记与移锅救援
│   │   └── ParticleSystem.js            有上限的粒子、光圈、浮字、菜盘
│   ├── rendering/
│   │   ├── RendererGL.js                厨房、锅、食材与 UI 的 WebGL 绘制
│   │   ├── ShaderProgram.js             shader 编译、链接与报错
│   │   ├── PrimitiveBatch.js            三角形批次、缓冲边界
│   │   ├── ParticleRenderer.js          特效绘制
│   │   ├── TextTextureCache.js          离屏文字、字形、LRU 缓存
│   │   └── Camera.js                    DPR、安全区、窗口与坐标转换
│   ├── ui/
│   │   ├── MenuScreen.js / HUD.js        中文首页、设置、局内信息
│   │   ├── TutorialOverlay.js           三步实际操作练习
│   │   ├── GameOverScreen.js            暂停、结算、重开
│   │   └── UIHelpers.js                 公共 UI 绘制
│   ├── services/
│   │   ├── LocalSaveService.js           本地档案校验、保存、合并
│   │   ├── CloudService.js              非阻塞云调用、超时降级
│   │   ├── AudioManager.js              七类音效接口
│   │   ├── HapticManager.js             限频的原生震动
│   │   └── AdService.js / LeaderboardService.js  扩展空接口
│   └── utils/
│       ├── Random.js                    可替换 seeded RNG
│       └── MathUtils.js                 数值工具
├── cloudfunctions/
│   ├── getPlayerProfile/               index.js + package.json
│   ├── saveRunResult/                  index.js + package.json
│   └── getGameConfig/                  index.js + package.json
├── scripts/
│   ├── check.mjs                       语法、JSON、引用检查
│   └── serve-qa.mjs                    仅本机的 WebGL 验收服务
├── tests/
│   ├── core.test.mjs / merge.test.mjs / feedback.test.mjs
│   ├── gameplay.test.mjs / recipes.test.mjs / runtime.test.mjs
│   ├── storage.test.mjs / cloud.test.mjs / stability.test.mjs
│   ├── helpers/wxMock.mjs
│   └── browser.html                    测试用 wx 适配与辅助按钮
├── docs/
│   ├── 验收记录.md
│   └── previews/menu.png / gameplay.png
└── audio/ / images/                    保留原素材，当前打包排除
```

## 4. 物理、渲染与性能

逻辑宽度 750，高度按设备比例计算，以 750×1334 为设计基准。优先 wx.getWindowInfo，兼容 wx.getSystemInfoSync，处理 safeArea、胶囊按钮、wx.onWindowResize；DPR 最大 2。

固定步长 1/60 秒，帧间隔上限 0.05 秒，每步使用 3 个物理子步和 3 次碰撞求解。锅为左右斜壁及锅底三条旋转线段，碰撞表面速度包含平移与转动；上一位置用于识别从内侧穿越锅边界的情况，锅外不会被吸附。食材采用 O(n²) 圆形碰撞并限制速度。

合成对象立即失效，新对象在求解结束后加入，避免同帧重复碰撞与数组索引错乱。锅接触与落地反馈回调分离，保证先碰壁再落底仍可获得救援分或完成接锅练习。

主场景用 WebGL 简单几何绘制，仅离屏 Canvas 绘制文字并上传纹理。文字 LRU 缓存上限 128，数字复用字形；粒子上限 180、浮字 14、光圈 12、菜盘 4，粒子复用对象；批次容量为完整三角形倍数。中端手机稳定 60 FPS 是目标，目前没有真机性能数据。

BOOT、MENU、TUTORIAL、PLAYING、PAUSED、GAME_OVER 由 GameState 定义。不可恢复的渲染/物理错误输出 console.error、停止循环并尝试弹窗；存储、云、声音、震动故障不能阻断核心游戏。

## 5. 调参

修改 `js/config/gameConfig.js` 后重新编译，单位为逻辑像素、秒和弧度；菜谱在 `js/config/recipes.js`。

| 参数 | 默认值 | 影响 |
| --- | ---: | --- |
| GRAVITY | 2800 | 下落与滞空时间 |
| POT_WIDTH / POT_DEPTH | 430 / 100 | 接锅空间 |
| POT_FOLLOW_STIFFNESS / POT_DAMPING | 125 / 22 | 跟随与惯性收敛 |
| POT_MAX_TILT | 14°（存储为弧度） | 倾斜上限 |
| MIN_TOSS_SPEED / MAX_TOSS_SPEED | 260 / 2100 | 连续力度映射 |
| TOSS_POWER / TOSS_MIN_POWER_RATIO | 1630 / 0.47 | 最大冲量、轻颠比例 |
| TOSS_COOLDOWN | 0.4 | 两次颠锅间隔 |
| TOSS_CONVERGENCE / TOSS_MASS_PENALTY | 0.75 / 0.18 | 汇聚趋势、大食材重量影响 |
| INGREDIENT_RESTITUTION / INGREDIENT_FRICTION | 0.17 / 0.48 | 弹性与摩擦 |
| SPAWN_INTERVAL / MIN_SPAWN_INTERVAL | 4 / 2.35 | 食材压力 |
| COMBO_WINDOW | 1.2 | 连击窗口 |
| LOST_DEPTH / LOST_SIDE_MARGIN | 190 / 150 | 可救援区外丢失边界 |
| MISS_LIMIT / MAX_INGREDIENTS / MAX_PARTICLES | 3 / 30 / 180 | 失误与资源上限 |

| 等级 | 半径 | 质量 | 基础分 |
| --- | ---: | ---: | ---: |
| Lv1 | 23 | 1 | 10 |
| Lv2 | 31 | 1.85 | 20 |
| Lv3 | 40 | 3 | 40 |
| Lv4 | 51 | 4.5 | 80 |
| Lv5 | 64 | 6.6 | 160 |

一级食材大力颠锅的理想弹道约 450～500 逻辑像素、空中约 1.1 秒；实际受重量、锅角、碰撞和阻力影响。测试确认重甩明显高于轻甩。建议先调整力度、重力和阻尼，再调整刷新压力。

## 6. 存档与声音

本地键 `PanToss.save.v1` 使用 wx.getStorageSync / wx.setStorageSync，保存 tutorialCompleted、bestScore、bestCombo、totalGames、totalScore、recipesCompleted、soundEnabled、hapticEnabled。读取校验布尔值和非负安全整数；存储失败保留当前内存数据，但不能保证下次进入仍保存。

每局先保存本地再请求云端；云统计按各字段较大值合并，最高分不倒退。本版没有离线单局队列、自动补交历史局数，离线累计留在本地，所以本地与云累计统计可能不同。

AudioManager 提供 playToss、playLand、playMerge、playAirMerge、playLose、playRecipe、playGameOver；当前没有指定合适音效资源，接口安全 no-op，设置界面已说明音效预留。添加合法本地声音后给 Game 中的 AudioManager 传入来源映射；若用 audio/ 中的文件，需要同时移除该目录的打包排除项。震动使用 wx.vibrateShort，限频且可关闭。

## 7. 云开发：需要手动完成

尚未设置 CLOUD_ENV_ID，未上传部署云函数、未修改真实云数据库。客户端没有 AppSecret 或云函数密钥。

1. 在微信开发者工具「云开发」创建或选择当前 AppID 有权限的环境，复制环境 ID。
2. 修改唯一环境配置 `js/config/env.js`，把 `CLOUD_ENV_ID = 'YOUR_CLOUD_ENV_ID'` 中的占位字符串改为真实 ID。超时默认 5000ms。
3. 在该环境创建 **players** 和 **game_config** 两个数据库集合。客户端经云函数访问，将集合设为客户端不可读写，使用服务端管理权限维护。
4. 分别右键 **getPlayerProfile**、**saveRunResult**、**getGameConfig**，每个执行 **「上传并部署：云端安装依赖」**。项目已有 cloudfunctionRoot，三份函数各自固定依赖 wx-server-sdk 4.0.2，由云端安装。
5. 重新编译，检查档案和配置云调用日志；完整结束一局，检查 saveRunResult 日志及 players 统计。OPENID 来自真实微信调用上下文，不能用本地手填身份替代此验证。
6. 实测断网仍能开始、结算、重开；恢复网络后新的完整对局可正常提交。

部署流程参考 [微信官方小游戏云开发示例](https://github.com/wechat-miniprogram/minigame-demo/blob/master/CLOUD_README.md)。真实平台部署需要有权限的账号环境。

players 以服务端取得的 OPENID 作为文档 ID，自动创建；字段有 openid、bestScore、bestCombo、totalGames、totalScore、recipesCompleted、createdAt、updatedAt、lastPlayedAt、recentRunIds。

game_config 可以先留空，使用本地默认值。远程调参时新增文档 ID 为 `current`，填写以下**平铺字段**（不要外套 config 对象）：

```json
{
  "_id": "current",
  "gravity": 2800,
  "spawnInterval": 4,
  "minimumSpawnInterval": 2.35,
  "tossPowerMultiplier": 1,
  "comboWindow": 1.2,
  "maxIngredientCount": 30
}
```

| 远程字段 | 客户端允许范围 |
| --- | --- |
| gravity | 1000～3200 |
| spawnInterval | 2～8 秒 |
| minimumSpawnInterval | 1.8～4 秒，且不大于 spawnInterval |
| tossPowerMultiplier | 0.6～1.3 |
| comboWindow | 0.6～1.8 秒 |
| maxIngredientCount | 10～30 的整数 |

未知字段、非有限数及无效值被忽略。配置在启动时读取、下一局重置时应用，不突然改变正在进行的局面。缺失、请求失败或超时使用本地默认值。

- getPlayerProfile：服务端取得 OPENID，事务读取或创建档案，返回五个统计字段。
- saveRunResult：每局结束调用一次。score 0～10000000 整数、maxCombo 0～1000 整数、duration 大于 0 且不超过 86400 秒、recipesCompleted 0～1000 整数；事务更新、最近 40 个 runId 去重。网络/权限故障不能当作不存在而覆盖旧档案。只做基础校验，预留 replay/hash 验证位置。
- getGameConfig：读取 game_config/current，仅返回六个白名单字段，客户端再次校验。

## 8. 检查与验收边界

本地使用 Node.js 18 或更新版本，无需安装依赖：

```powershell
node scripts/check.mjs
node --test --test-reporter=spec tests/*.test.mjs
git diff --check
```

已通过 26 项自动测试，包括固定步长、轻重颠锅、接锅、合成、Lv5、碰撞订单、三次失误、三步教程、100 次重开、后台暂停、存档容错、云超时、事务并发和去重、销毁后的迟到回调、30 个混合等级食材的 3600 步压力模拟、锅边界穿透修正、GL 批次边界。故障注入会刻意输出降级警告，属于预期。

运行本地真实 WebGL 验收网页：

```powershell
node scripts/serve-qa.mjs
```

打开 `http://127.0.0.1:4173/tests/browser.html`。辅助按钮建立确定的合成、料理和失误场景；鼠标按住画布下半部分走真实 InputManager。DOM 仅在 tests/ 中模拟 wx，生产入口不引用它。服务仅绑定 127.0.0.1，画面保存接受 PNG 并写入固定 `.qa/preview.png`；Ctrl+C 结束服务。

实际浏览器验证了 WebGL 首页、中文文字、水平拖动、上甩、教程、空中合成、订单、暂停、结算和点击画布「再颠一锅」重开；检查 375×667、390×844、320×568、768×1024 的逻辑窗口。观察到 GL 错误码 0、页面错误计数 0。截图在 docs/previews/，详情见 [验收记录](docs/验收记录.md)。

本机已安装微信开发者工具，但 CLI 自动打开/调试返回「TypeError: Failed to fetch」。未确认工具内实际编译、真实设备手感/性能和云部署；浏览器模拟不能视为微信真机通过。已修复本地检出的启动和语法错误，仍需手动平台验收。

建议验收顺序：编译首页 → 三步练习 → 轻/重甩与空中移锅 → 救球与接新食材 → 合成/订单 → 三次失误 → 重开 → 切后台/前台继续 → 关闭再进入检查最高分 → 云正常和断网各完整一局。

## 9. Git 版本

原始未提交内容先建立快照，之后严格按 A～G 顺序提交，信息全部中文，未推送 GitHub。

| 提交 | 阶段 |
| --- | --- |
| 248ad46 | 原始工程快照 |
| 718d404 | A：WebGL、颠锅接锅核心 |
| bf62898 | B：三种五级食材、碰撞和合成 |
| 3628719 | C：空中连击、救球、反馈 |
| 19a03fd | D：生成、生命、教程、暂停结算重开 |
| 0dcf684 | E：三份料理订单 |
| e2a5685 | F：本地存档与设置 |
| 276758b | G：云档案、事务结果、远程配置 |
| 8121a22 | 验收修复与实际 WebGL 验证 |

最后另有中文文档提交，以 git log --oneline 为准。后续调参或补充素材应继续使用中文提交记录改动。
