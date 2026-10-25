# Sublimation for Game

这个工程使得 Sublimation 获得编写网页游戏的能力。

Sublimation 语言（声明式、受 Rust/Kotlin 启发的设计验证语言）的游戏目标工程。
本仓库把游戏相关的标准库、注解处理器与网页壳工程集中在一处：
用 Sublimation 写游戏 → 编译器生成 JS → 在 KAPLAY（封装过的网页游戏引擎）上运行，
全程**不需要改编译器**——靠 @game @host 无体桥接与 @postcompile 打包钩子实现。

## 目录结构

| 目录 | 内容 |
| --- | --- |
| game doc/ | 游戏目标文档：《游戏库》《注解处理器与打包》《壳工程与运行》 |
| annotation processer/ | 游戏注解处理器（@game 白名单/态度校验 + @postcompile build 打包钩子） |
| app/ | 编译输入目录：演示游戏（main.subl）、游戏标准库（*.subl）与 core/ 标准库副本 |
| game-app/ | 壳工程：index.html + js/game-runtime.js（桥接层）+ vendor/kaplay.js（KAPLAY v3001.0.19） |
| test/ | smoke-test.js：Node + KAPLAY 桩的冒烟测试（23 项断言） |
| scripts/ | sync-deps.ps1：从主仓同步 core/（真源=主仓） |
| core/ | 处理器脚本的 stdlib 本地副本（不入库；由 scripts/sync-deps.ps1 同步） |

## 运行环境

编译器按 **CWD 相对路径**装载处理器（annotation processer/）与处理器脚本的 stdlib（core/），
因此 **compile 从本仓根运行**。首次使用或主仓更新后先同步依赖：

    powershell -ExecutionPolicy Bypass -File scriptssync-deps.ps1

约定与机制详见 [game doc/壳工程与运行.md](game%20doc/壳工程与运行.md)。

## 端到端流程

    cd F:SublimationProjectsublimation for game
    F:KotlinProjectSublimationcliuildinstallcliincli.bat compile app ^
        -o game-appuildapp.js ^
        -A gameApp=game-app -A gameJs=game-appuildapp.js
    node testsmoke-test.js

1. **语义检查 + JS 生成**：@game 无体桥接声明经 game.subs 校验后，
   调用点翻成裸名全局 JS 调用（onKeyDown(...) → JS onKeyDown(...)）。
2. **编译后阶段**（@postcompile build）：把 app.js 与壳工程资源组装成
   game-app/build/game/（index.html + app.js + js/game-runtime.js + vendor/kaplay.js + assets/）。
3. **运行**：build/game/ 起一个静态服务器（python -m http.server 8080），
   浏览器打开即可玩；test/smoke-test.js 先行回归交互逻辑。

演示游戏「豆豆躲方块」（app/main.subl）：← → 移动、每秒刷一个红色方块下落、
计分、碰撞结束、空格重开。

## 架构要点

- **零编译器改动**：游戏能力全部是 @game @host @impure 无体声明（45 个），
  函数体在壳工程 game-runtime.js 里用 KAPLAY 实现；编译器的 @host 无体机制
  把调用点翻成裸名 JS 调用，与 SfA 的 __dshAndroid 桥同构但更直接（无需桥分发函数）。
- **桥的纪律靠处理器**：game.subs 白名单在编译期拦截笔误的桥接名；@host 无体、
  @impure 副作用标注由处理器强制/提醒。
- **KAPLAY 封装**：选它的浏览器全局构建（global: false 初始化），桥接按主题分层：
  启动/场景、精灵与组件、输入、主循环、碰撞。objMove 用直接位置增量
  （非 KAPLAY 按秒速度），与「像素/帧」直觉一致且便于按 dt 缩放。
- **CWD 装载约定**：与 SfA 一致——处理器目录与脚本 stdlib 都按 CWD 相对路径找，
  scripts/sync-deps.ps1 从主仓同步 core/ 到仓根与 app/core/。

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
