# vendor/

KAPLAY 本体（浏览器全局构建 `dist/kaplay.js`）。

- 版本：**3001.0.19**（npm `kaplay`，MIT 许可，https://kaplayjs.com/ ）
- 更新方式：`curl -o game-app/vendor/kaplay.js https://unpkg.com/kaplay@<版本>/dist/kaplay.js`
  或从 npm 包 `kaplay-<版本>.tgz` 解压 `package/dist/kaplay.js`。
- 该构建会在页面定义全局 `kaplay()`（本仓桥运行时以 `global: false` 模式初始化，
  不污染 window，避免与编译产物的名字冲突）。
