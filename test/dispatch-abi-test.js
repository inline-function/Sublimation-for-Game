// dispatch-abi-test.js —— 宿主桥 ABI 统一验证（t38）：globalThis.__subl.call(op, args) 单入口
//
// 编译器侧 t37 尚未落定（安装版 cli 仍出 -A 裸名产物），此处按任务要求改用
// **注入 __subl.call 的桩**：合成一个「t37 后产物」——只经 __subl.call 调桥，
// 在 KAPLAY 桩 + game-runtime.js 的同一作用域内执行，验证单入口 ABI 端到端可用
// （op 分派、返回值、回调参数存活、未知 op 报错、裸名兼容别名）。
//
// 用法：node test/dispatch-abi-test.js
"use strict";
const fs = require("fs");
const path = require("path");
const runtimeJs = fs.readFileSync(path.join(__dirname, "..", "game-app", "js", "game-runtime.js"), "utf8");

let fails = 0, checks = 0;
function ok(name, cond, extra) {
    checks++;
    if (cond) console.log("  PASS " + name);
    else { fails++; console.log("  FAIL " + name + (extra ? " :: " + extra : "")); }
}

// ---- KAPLAY 桩（记录调用，最小可执行语义）----
var kaplayCalls = [];
globalThis.kaplay = function (opts) {
    kaplayCalls.push({ fn: "kaplay", opts: opts });
    return {
        width: function () { return (opts && opts.width) || 640; },
        height: function () { return (opts && opts.height) || 480; },
        setGravity: function (g) { kaplayCalls.push({ fn: "setGravity", g: g }); },
        loadSprite: function (n, s) { kaplayCalls.push({ fn: "loadSprite", name: n, src: s }); },
        sprite: function (n) { return { comp: "sprite", name: n }; },
        pos: function (x, y) { return { comp: "pos", x: x, y: y }; },
        onKeyPress: function (k, f) { kaplayCalls.push({ fn: "onKeyPress", key: k }); },
        onMouseRelease: function (b, f) { kaplayCalls.push({ fn: "onMouseRelease", btn: b }); if (f) f(b); },
        onMouseMove: function (f) { kaplayCalls.push({ fn: "onMouseMove" }); if (f) f({ x: 10, y: 10 }); },
        go: function (n) { kaplayCalls.push({ fn: "go", name: n }); },
    };
};

// ---- 桩产物：t37 后浏览器产物形态（只经 __subl.call 调桥）----
const stubApp = `
(function () {
    var s = globalThis.__subl;
    s.call("gameStart", [800, 600]);
    s.call("gameGravity", [9.8]);
    s.call("spriteLoad", ["bean", "assets/bean.png"]);
    var w = s.call("viewWidth", []);
    var h = s.call("viewHeight", []);
    globalThis.__sgResults = { width: w, height: h, comp: JSON.stringify(s.call("compSprite", ["bean"])), opsN: s.ops().length };
    var cb = function () { globalThis.__sgCbFired = true; };
    s.call("onKeyPress", ["space", cb]);
    // 新增输入事件（t65）：松手/移动经单入口分派到 KAPLAY
    var cb2 = function (m) { globalThis.__sgCb2Fired = true; globalThis.__sgCb2Arg = (m && m && m.x !== undefined) ? "pos" : String(m); };
    s.call("onMouseRelease", ["left", cb2]);
    s.call("onMouseMove", [cb2]);
    // @host 通道走单入口（t43 后生成器只出 __subl.call；裸名已回撤）
    try { s.call("gameGravity", [2.0]); s.call("sceneGo", ["aliasscene"]); globalThis.__sgAlias = "ok"; } catch (e) { globalThis.__sgAlias = String(e); }
    // 裸名不再以全局可见（闭包封装）：typeof 对未声明标识符安全
    globalThis.__sgBareGone = (typeof gameGravity === "undefined" && typeof sceneGo === "undefined");
}) ();
`;

// 装载：宿主运行时 + 桩产物（同一作用域——与 index.html 的 script 顺序同构）
new Function(runtimeJs + "\n" + stubApp)();

const init = kaplayCalls.find((c) => c.fn === "kaplay");
ok("__subl.call(gameStart) 分派到 KAPLAY（800x600, global=false）", init && init.opts.width === 800 && init.opts.height === 600 && init.opts.global === false, JSON.stringify(init && init.opts));
ok("__subl.call(gameGravity) 到达 KAPLAY", kaplayCalls.some((c) => c.fn === "setGravity" && c.g === 9.8), "");
ok("__subl.call(spriteLoad) 到达 KAPLAY", kaplayCalls.some((c) => c.fn === "loadSprite" && c.name === "bean"), "");
ok("返回值：viewWidth=800", globalThis.__sgResults.width === 800, JSON.stringify(globalThis.__sgResults));
ok("返回值：viewHeight=600", globalThis.__sgResults.height === 600, "");
ok("返回值：compSprite 组件原样回传", globalThis.__sgResults.comp === '{"comp":"sprite","name":"bean"}', globalThis.__sgResults.comp);
ok("回调实参（lambda）经桥存活", kaplayCalls.some((c) => c.fn === "onKeyPress" && c.key === "space"), "");
ok("__subl.call(onMouseRelease) 分派到 KAPLAY（btn=left）", kaplayCalls.some((c) => c.fn === "onMouseRelease" && c.btn === "left"), "");
ok("__subl.call(onMouseMove) 分派到 KAPLAY", kaplayCalls.some((c) => c.fn === "onMouseMove"), "");
ok("onMouseRelease/onMouseMove 回调经桥存活", globalThis.__sgCb2Fired === true, String(globalThis.__sgCb2Fired));
ok("ops() 枚举 55 个 op（t65 onMouseRelease/onMouseMove + t68 地图 map*，与 game.subs 白名单一致）", globalThis.__sgResults.opsN === 55, String(globalThis.__sgResults.opsN));


// ---- 桩产物 2（隔离作用域）：gameStartFit + winWidth/winWidth ----
const stubApp2 = `
(function () {
    var s = globalThis.__subl;
    s.call("gameStartFit", [640, 480, true, true]);
    var ww = s.call("winWidth", []);
    var wh = s.call("winHeight", []);
    globalThis.__sgFit = { width: ww, height: wh };
}) ();
`;
new Function(runtimeJs + "\n" + stubApp2)();
const fitInit = kaplayCalls.filter((c) => c.fn === "kaplay")[1];
ok("__subl.call(gameStartFit) 分派到 KAPLAY（stretch+letterbox+crisp）", fitInit && fitInit.opts.width === 640 && fitInit.opts.height === 480 && fitInit.opts.global === false
    && fitInit.opts.stretch === true && fitInit.opts.letterbox === true && fitInit.opts.crisp === true, JSON.stringify(fitInit && fitInit.opts));
ok("winWidth/winHeight 无窗口回落为画布逻辑尺寸", globalThis.__sgFit.width === 640 && globalThis.__sgFit.height === 480, JSON.stringify(globalThis.__sgFit));

// 未知 op 必须抛明确错误
var unknownErr = null;
try { globalThis.__subl.call("nopeOp", [1]); } catch (e) { unknownErr = String(e); }
ok("未知 op 抛出错误", !!unknownErr, unknownErr);
ok("错误信息标注 op 名与 op 表", unknownErr.indexOf("nopeOp") >= 0 && unknownErr.indexOf("op") >= 0, unknownErr);

// @host 通道（t43 后经单入口；与 __SG_OPS 注册表同源）：
ok("__subl.call(gameGravity) 分派到 KAPLAY", globalThis.__sgAlias === "ok" && kaplayCalls.some((c) => c.fn === "setGravity" && c.g === 2.0), globalThis.__sgAlias);
ok("__subl.call(sceneGo) 分派到 KAPLAY", kaplayCalls.some((c) => c.fn === "go" && c.name === "aliasscene"), "");
ok("裸名桥全局已回撤（闭包封装，不再污染页面全局）", globalThis.__sgBareGone === true, String(globalThis.__sgBareGone));

console.log(fails === 0
    ? "DISPATCH-ABI-TEST: ALL PASSED (" + checks + " 项：__subl.call 单入口 + S-1 装载 + 裸名回撤 + 错误契约)"
    : "DISPATCH-ABI-TEST: " + fails + " FAILED");
process.exitCode = fails === 0 ? 0 : 1;
