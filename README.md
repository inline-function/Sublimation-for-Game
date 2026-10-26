# Sublimation for Game

这个工程使得 Sublimation 获得编写网页游戏的能力。

Sublimation 语言（声明式、受 Rust/Kotlin 启发的设计验证语言）的游戏目标工程。
本仓库把游戏相关的标准库、注解处理器与网页壳工程集中在一处：
用 Sublimation 写游戏 → 编译器生成 JS → 在 KAPLAY（封装过的网页游戏引擎）上运行，
桥接机制**不需要改编译器**——靠 @game @host 无体桥接与 @postcompile 打包钩子实现。

## 目录结构

| 目录 | 内容 |
| --- | --- |
| game doc/ | 游戏目标文档：《游戏库》《注解处理器与打包》《壳工程与运行》《俄罗斯方块》 |
| annotation processer/ | 游戏注解处理器（@game op 白名单/态度校验 + @postcompile build 打包钩子） |
| app/ | 编译输入目录：演示游戏（main.subl 俄罗斯方块 + tetris-logic.subl 纯逻辑）、游戏标准库（*.subl）与 core/ 标准库副本 |
| game-app/ | 壳工程：index.html + js/game-runtime.js（桥接层，IIFE 封装）+ vendor/kaplay.js（KAPLAY v3001.0.19） |
| test/ | smoke-test.js：Node + KAPLAY 桩的冒烟测试（俄罗斯方块完整局，28 项）；tetris-logic-test.js：纯逻辑 node 断言（碰撞/消除/计分/升级/结局，38 项）；dispatch-abi-test.js：__subl.call 单入口 + S-1 + 裸名回撤 + 未知 op 拒绝契约（13 项） |
| scripts/ | sync-deps.ps1：从主仓同步 core/（真源=主仓；app 副本自动剪除 browser 不可用的 net） |
| core/ | 处理器脚本的 stdlib 本地副本（不入库；由 scripts/sync-deps.ps1 同步） |

## 运行环境

编译器按 **CWD 相对路径**装载处理器（annotation processer/）与处理器脚本的 stdlib（core/），
因此 **compile 从本仓根运行**。需要 JAVA_HOME（本机用 F:\jdk-17.0.13.11-hotspot）。
首次使用或主仓更新后先同步依赖：

    powershell -ExecutionPolicy Bypass -File scripts\sync-deps.ps1

约定与机制详见 [game doc/壳工程与运行.md](game%20doc/壳工程与运行.md)。

## 端到端流程

    cd F:\SublimationProject\sublimation for game
    # 主仓 fat jar（release/sublimation.jar）
    java -jar F:\KotlinProject\Sublimation\release\sublimation.jar compile app ^
        -o game-app\build\app.js --target=browser ^
        -A gameApp=game-app -A gameJs=game-app\build\app.js
    node test\smoke-test.js            # 冒烟回归（28 项）
    node test\tetris-logic-test.js    # 纯逻辑断言（38 项）
    node test\dispatch-abi-test.js     # ABI 契约回归（13 项）

1. **语义检查 + JS 生成**（`--target=browser`）：@game 无体桥接声明经 game.subs 的 op
   白名单校验；桥调用一律 `globalThis.__subl.call(op, args)`（编译器 t43 后内建桥与
   用户 `@host` 声明统一单入口；op 名 = 声明函数名）；`print`→`console.log`（browser
   内建直连）。产物导出 `globalThis.__subl.main`（S-1，不自执行，由 index.html 装载后调用）。
2. **编译后阶段**（@postcompile build）：把 app.js 与壳工程资源组装成
   game-app/build/game/（index.html + app.js + js/game-runtime.js + vendor/kaplay.js + assets/）。
3. **运行**：build/game/ 起一个静态服务器（python -m http.server 8080），
   浏览器打开即可玩（index.html 在脚本装载后调 `__subl.main()`——S-1 装载模型）；
   test/smoke-test.js 先行回归交互逻辑。

演示游戏「俄罗斯方块」（app/main.subl + app/tetris-logic.subl）：七种标准方块、
4 状态旋转、消行计分（100/300/500/800）、每 10 行提速、next 预览、暂停（P）、
Game Over + 空格重开；纯逻辑与渲染分层，详见
[game doc/俄罗斯方块.md](game%20doc/俄罗斯方块.md)。

## 架构要点

- **桥接全经宿主桥单入口**：游戏能力全部是 @game @host @impure 无体声明（45 个），
  函数体在壳工程 game-runtime.js 里用 KAPLAY 实现（闭包封装，仅暴露
  `globalThis.__subl.call`/`ops`，不污染页面全局——编译器 t43 统一单入口后已回撤裸名通道）。
  `__SG_OPS` 注册表为宿主单一真源，op 名与 game.subs 白名单一一对应。
- **桥的纪律靠处理器**：game.subs op 白名单在编译期拦截笔误的桥接名；@host 无体、
  @impure 副作用标注由处理器强制/提醒。
- **KAPLAY 封装**：选它的浏览器全局构建（global: false 初始化），桥接按主题分层：
  启动/场景、精灵与组件、输入、主循环、碰撞。objMove 用直接位置增量
  （非 KAPLAY 按秒速度），与「像素/帧」直觉一致且便于按 dt 缩放。
- **CWD 装载约定**：与 SfA 一致——处理器目录与脚本 stdlib 都按 CWD 相对路径找，
  scripts/sync-deps.ps1 从主仓同步 core/ 到仓根与 app/core/（app 副本剪除
  browser 目标不可用的 net 模块）。

## 编译器参数（-A）

| 键 | 说明 |
| --- | --- |
| gameApp | 壳工程目录（含 build/package-game.ps1） |
| gameJs | 编译器 JS 产物路径 |
| gameOut | 打包输出目录（默认 gameApp\build\game） |

（键名避开安卓处理器的 appDir/jsPath/outDir/sdkDir，可与其共存。）

## 相关仓库

- 编译器主仓：KotlinProject/Sublimation（词法/语法/语义/JS 代码生成/注解处理器框架）。
- 安卓同类工程：SublimationProject/sublimation for android（本仓库的桥接/打包分层沿用其布局）。
