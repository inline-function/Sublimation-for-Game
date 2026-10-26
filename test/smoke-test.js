// smoke-test.js —— SfG 冒烟测试（Node，无浏览器）
// 把 KAPLAY 桩 + 壳工程桥（game-runtime.js）+ 编译产物（app.js）放进同一作用域跑一遍，
// 产物为 --target=browser 的 S-1 形态（main 不自执行），装载后由宿主调 __subl.main()。
// 断言「豆豆躲方块」演示的核心交互全部成立。用法：node test/smoke-test.js
"use strict";
const fs = require("fs");
const path = require("path");
const G = __dirname + "/..";
const gameDir = path.join(G, "game-app", "build", "game");

// ---- KAPLAY 桩（仅冒烟测试用：记录调用、提供最小可执行语义） ----
var __kaplayCalls = [];
var __sgKeyHandlers = { down: {}, press: {}, release: [], mousedown: [] };
var __sgUpdateHandlers = [];
var __sgTimers = [];
var __objSeq = 0;
function __mkObj() {
    return {
        id: ++__objSeq,
        pos: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        text: "",
        comps: [],
        tags: [],
        destroyed: false,
        collideHandlers: [],
        use: function (c) {
            this.comps.push(c);
            if (typeof c === "string") { this.tags.push(c); return; }
            // KAPLAY 语义：pos/text/scale 组件会写回对象字段
            if (c && c.comp === "pos") { this.pos = { x: c.x, y: c.y }; }
            if (c && c.comp === "text") { this.text = c.t; }
            if (c && c.comp === "scale") { this.scale = { x: c.s, y: c.s }; }
        },
        move: function (dx, dy) { this.pos.x += dx; this.pos.y += dy; },
        destroy: function () { this.destroyed = true; },
        exists: function () { return !this.destroyed; },
        onCollide: function (tag, f) { this.collideHandlers.push({ tag: tag, f: f }); },
        isColliding: function (o) { return false; },
        onUpdate: function (f) { __sgUpdateHandlers.push(f); },
    };
}
globalThis.kaplay = function (opts) {
    __kaplayCalls.push({ fn: "kaplay", opts: opts });
    return {
        width: function () { return (opts && opts.width) || 640; },
        height: function () { return (opts && opts.height) || 480; },
        setGravity: function (g) { __kaplayCalls.push({ fn: "setGravity", g: g }); },
        scene: function (n, f) { __kaplayCalls.push({ fn: "scene", name: n }); },
        go: function (n) { __kaplayCalls.push({ fn: "go", name: n }); },
        loadSprite: function (n, s) { __kaplayCalls.push({ fn: "loadSprite", name: n, src: s }); },
        sprite: function (n) { return { comp: "sprite", name: n }; },
        pos: function (x, y) { return { comp: "pos", x: x, y: y }; },
        scale: function (s) { return { comp: "scale", s: s }; },
        rect: function (w, h) { return { comp: "rect", w: w, h: h }; },
        circle: function (r) { return { comp: "circle", r: r }; },
        text: function (t, o) { return { comp: "text", t: t, size: o && o.size }; },
        color: function (r, g, b) { return { comp: "color", r: r, g: g, b: b }; },
        area: function () { return { comp: "area" }; },
        body: function () { return { comp: "body" }; },
        solid: function () { return { comp: "solid" }; },
        anchor: function (a) { return { comp: "anchor", a: a }; },
        add: function (cs) { var o = __mkObj(); __kaplayCalls.push({ fn: "add", obj: o, comps: cs }); return o; },
        vec2: function (x, y) { return { x: x, y: y }; },
        dt: function () { return 0.016; },
        loop: function (t, f) { __sgTimers.push({ every: t, f: f }); __kaplayCalls.push({ fn: "loop", t: t }); },
        wait: function (t, f) { __sgTimers.push({ after: t, f: f }); __kaplayCalls.push({ fn: "wait", t: t }); },
        onUpdate: function (f) { __sgUpdateHandlers.push(f); },
        onKeyDown: function (k, f) { (__sgKeyHandlers.down[k] = __sgKeyHandlers.down[k] || []).push(f); },
        onKeyPress: function (k, f) { (__sgKeyHandlers.press[k] = __sgKeyHandlers.press[k] || []).push(f); },
        onKeyRelease: function (k, f) { __sgKeyHandlers.release.push({ k: k, f: f }); },
        onMouseDown: function (b, f) { __sgKeyHandlers.mousedown.push({ b: b, f: f }); },
        mousePos: function () { return { x: 0, y: 0 }; },
        get: function (t) { __kaplayCalls.push({ fn: "get", tag: t }); return []; },
        destroyAll: function (t) { __kaplayCalls.push({ fn: "destroyAll", tag: t }); },
    };
};

// ---- 装载被测代码 ----
const rt = fs.readFileSync(path.join(gameDir, "js", "game-runtime.js"), "utf8");
const app = fs.readFileSync(path.join(gameDir, "app.js"), "utf8");
// 装载（__subl 安装于 globalThis；app 把导出 main 合并进同一对象）
new Function(rt + "\n" + app)();
// S-1 装载模型：宿主在脚本装载完成后调用导出的 main
if (!globalThis.__subl || typeof globalThis.__subl.main !== "function") {
    console.log("  FAIL 装载：产物未导出 __subl.main（S-1 形态期望）");
    process.exit(1);
}
globalThis.__subl.main();

// ---- 断言 ----
let fails = 0;
function ok(name, cond, extra) {
    if (cond) console.log("  PASS " + name);
    else { fails++; console.log("  FAIL " + name + (extra ? " :: " + extra : "")); }
}

const init = __kaplayCalls.find(c => c.fn === "kaplay");
ok("kaplay 以 640x480 初始化", init && init.opts.width === 640 && init.opts.height === 480 && init.opts.global === false, JSON.stringify(init && init.opts));
const sl = __kaplayCalls.find(c => c.fn === "loadSprite");
ok("精灵载入 bean@assets/bean.png", sl && sl.name === "bean" && sl.src === "assets/bean.png", JSON.stringify(sl));

const player = __kaplayCalls.filter(c => c.fn === "add")[0];
ok("玩家对象被创建", !!player, "");
ok("玩家挂 sprite(bean) 组件", player.obj.comps.some(c => c.comp === "sprite" && c.name === "bean"), JSON.stringify(player.obj.comps));
ok("玩家位置 (300,400)", player.obj.comps.some(c => c.comp === "pos" && c.x === 300 && c.y === 400), "");
ok("玩家补挂 area（objAddArea）", player.obj.comps.some(c => c.comp === "area"), "");

const textObjs = __kaplayCalls.filter(c => c.fn === "add").map(c => c.obj).filter(o => o.comps.some(c => c.comp === "text"));
ok("分数文本对象创建（label）", textObjs.length >= 1, "");
ok("label 文本内容=score: 0、字号 24", textObjs[0] && textObjs[0].comps.some(c => c.comp === "text" && c.t === "score: 0" && c.size === 24), JSON.stringify(textObjs[0] && textObjs[0].comps));

ok("left/right 按键已注册", !!__sgKeyHandlers.down["left"] && !!__sgKeyHandlers.down["right"], "");
const before = player.obj.pos.x;
__sgKeyHandlers.down["left"].forEach(f => f("left"));
ok("按住 left → 玩家左移 6px", player.obj.pos.x === before - 6, "x=" + player.obj.pos.x);
__sgKeyHandlers.down["right"].forEach(f => f("right"));
ok("按住 right → 玩家右移回原位", player.obj.pos.x === before, "x=" + player.obj.pos.x);

ok("注册了两个 every(1s) 定时器", __sgTimers.filter(t => t.every === 1).length === 2, "n=" + __sgTimers.length);

const nAdds = __kaplayCalls.filter(c => c.fn === "add").length;
__sgTimers.filter(t => t.every === 1)[1].f(null);
const enemy = __kaplayCalls.filter(c => c.fn === "add")[nAdds];
ok("敌人色块创建", !!enemy, "");
ok("敌人 28x28 红色矩形 (#ff4444)", enemy.obj.comps.some(c => c.comp === "rect" && c.w === 28 && c.h === 28) && enemy.obj.comps.some(c => c.comp === "color" && c.r === 255 && c.g === 68 && c.b === 68), JSON.stringify(enemy.obj.comps));
ok("敌人带 area + enemy 标签", enemy.obj.comps.some(c => c.comp === "area") && enemy.obj.tags.indexOf("enemy") >= 0, "");
ok("敌人起始 y=-30（屏外上方）", enemy.obj.comps.some(c => c.comp === "pos" && c.y === -30), "");

const y0 = enemy.obj.pos.y;
__sgUpdateHandlers.slice(-2)[0](0.016);
ok("敌人下落 180*dt 像素", Math.abs(enemy.obj.pos.y - (y0 + 180 * 0.016)) < 1e-9, "y=" + enemy.obj.pos.y);

__sgTimers.filter(t => t.every === 1)[0].f(null);
__sgUpdateHandlers[0](0.016); // 一帧 onUpdate：label 刷新为最新分数
ok("每秒计分后 label 文本刷新", textObjs[0].text === "score: 1", "text=" + textObjs[0].text);

let collideFired = false;
player.obj.collideHandlers.filter(h => h.tag === "enemy").forEach(h => { h.f(enemy.obj); collideFired = true; });
const goText = __kaplayCalls.filter(c => c.fn === "add").map(c => c.obj).filter(o => o.comps.some(c => c.comp === "text" && c.t.indexOf("Game Over") === 0));
ok("碰撞处理器已触发", collideFired, "");
ok("碰撞后玩家被销毁", player.obj.destroyed === true, "");
ok("出现 Game Over 文本", goText.length >= 1, "");
ok("空格重开按键已注册", !!__sgKeyHandlers.press["space"], "");
const goBefore = __kaplayCalls.filter(c => c.fn === "go").length;
__sgKeyHandlers.press["space"].forEach(f => f("space"));
const goAfter = __kaplayCalls.filter(c => c.fn === "go");
ok("按空格 → sceneGo(\"main\") 重开", goAfter.length === goBefore + 1 && goAfter[goAfter.length - 1].name === "main", "");

console.log(fails === 0 ? "SMOKE-TEST: ALL PASSED" : "SMOKE-TEST: " + fails + " FAILED");
if (fails > 0) process.exitCode = 1;
