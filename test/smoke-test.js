// smoke-test.js —— SfG 冒烟测试（Node，无浏览器）
// 把 KAPLAY 桩 + 壳工程桥（game-runtime.js）+ 编译产物（app.js）放进同一作用域跑一遍，
// 产物为 --target=browser 的 S-1 形态（main 不自执行），装载后由宿主调 __subl.main()。
// 断言「俄罗斯方块」演示的核心交互全部成立。用法：node test/smoke-test.js
"use strict";
const fs = require("fs");
const path = require("path");
const G = __dirname + "/..";
const gameDir = path.join(G, "game-app", "build", "game");

// ---- KAPLAY 桩（仅冒烟测试用：记录调用、提供最小可执行语义） ----
var __kaplayCalls = [];
var __sgKeyHandlers = { down: {}, press: {}, release: [] };
var __sgUpdateHandlers = [];
var __sgScenes = {};
var __sgDt = 0.016;
function __sgSetDt(v) { __sgDt = v; }
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
        scene: function (n, f) { __kaplayCalls.push({ fn: "scene", name: n }); __sgScenes[n] = f; },
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
        dt: function () { return __sgDt; },
        onUpdate: function (f) { __sgUpdateHandlers.push(f); },
        onKeyDown: function (k, f) { (__sgKeyHandlers.down[k] = __sgKeyHandlers.down[k] || []).push(f); },
        onKeyPress: function (k, f) { (__sgKeyHandlers.press[k] = __sgKeyHandlers.press[k] || []).push(f); },
        onKeyRelease: function (k, f) { __sgKeyHandlers.release.push({ k: k, f: f }); },
        onMouseDown: function (b, f) { __sgKeyHandlers.mousedown.push({ b: b, f: f }); },
        mousePos: function () { return { x: 0, y: 0 }; },
        get: function (t) { return []; },
        destroyAll: function (t) { __kaplayCalls.push({ fn: "destroyAll", tag: t }); },
    };
};

// ---- 装载被测代码 ----
const rt = fs.readFileSync(path.join(gameDir, "js", "game-runtime.js"), "utf8");
const app = fs.readFileSync(path.join(gameDir, "app.js"), "utf8");
new Function(rt + "\n" + app)();
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
function adds() { return __kaplayCalls.filter(c => c.fn === "add").map(c => c.obj); }
function objsWithComp(comp) { return adds().filter(o => o.comps.some(c => c.comp === comp)); }
function textsOf(t) { return adds().filter(o => o.comps.some(c => c.comp === "text" && c.t === t)); }
function pieceObjs() { return adds().filter(o => o.tags.indexOf("piece") >= 0); }
function fire(key, kind) {
    const tbl = kind === "press" ? __sgKeyHandlers.press : (kind === "release" ? null : __sgKeyHandlers.down);
    if (kind === "release") { __sgKeyHandlers.release.filter(x => x.k === key).forEach(x => x.f(key)); return; }
    (tbl[key] || []).forEach(f => f(key));
}
function update(dt) { __sgDt = dt; __sgUpdateHandlers.forEach(f => f(dt)); }
const BOARD_X = 16.0, BOARD_Y = 8.0, CELL = 22.0;

const init = __kaplayCalls.find(c => c.fn === "kaplay");
ok("kaplay 以 440x480 初始化（global=false）", init && init.opts.width === 440 && init.opts.height === 480 && init.opts.global === false, JSON.stringify(init && init.opts));
ok("场景 main 已注册（gameover 由首次锁定时注册）", !!__sgScenes["main"], "scenes=" + Object.keys(__sgScenes).join(","));
ok("main() 触发 sceneGo(main)", __kaplayCalls.some(c => c.fn === "go" && c.name === "main"), "");

// 触发 main 场景构建（等价 KAPLAY 的 go 回调）
__sgScenes["main"](null);

const bgRects = adds().filter(o => o.tags.indexOf("bg") >= 0 && o.comps.some(c => c.comp === "rect"));
ok("棋盘背景网格 200 格 + 面板（201 个 bg 矩形）", bgRects.length === 201, "n=" + bgRects.length);
ok("NEXT 标签文本", textsOf("NEXT").length >= 1, "");
ok("HUD 三个文本（score:0 / lines:0 / level:1）",
    textsOf("score: 0").length >= 1 && textsOf("lines: 0").length >= 1 && textsOf("level: 1").length >= 1, "");
ok("键位提示文本（←→ 移动 等）", textsOf("←→ 移动").length >= 1, "");

const pieces0 = pieceObjs();
ok("下落方块 = 4 个 piece 矩形", pieces0.length === 4, "n=" + pieces0.length);
ok("piece 矩形带颜色", pieces0.every(o => o.comps.some(c => c.comp === "color")), "");
const nexts0 = adds().filter(o => o.tags.indexOf("next") >= 0);
ok("next 预览 = 4 个矩形", nexts0.length === 4, "n=" + nexts0.length);

ok("键位注册：left/right/down（down+release）与 up/space/p（press）",
    !!(__sgKeyHandlers.down["left"] || []).length && !!(__sgKeyHandlers.down["right"] || []).length &&
    !!(__sgKeyHandlers.down["down"] || []).length && !!(__sgKeyHandlers.press["up"] || []).length &&
    !!(__sgKeyHandlers.press["space"] || []).length && !!(__sgKeyHandlers.press["p"] || []).length, "");
ok("onUpdate 注册（tick 驱动）", __sgUpdateHandlers.length >= 1, "n=" + __sgUpdateHandlers.length);

function pieceXs() { return pieceObjs().map(o => o.pos.x); }
function pieceYs() { return pieceObjs().map(o => o.pos.y); }
function lastPieces() { return pieceObjs().slice(-4); }
function lastPieceYs() { return lastPieces().map(o => o.pos.y); }
function lastPieceXs() { return lastPieces().map(o => o.pos.x); }
// 墙壁夹紧：连按 10 次 left（DAS 在 update 内推进），再 tick 一次强制渲染到夹紧位置
fire("left", "down");
for (let i = 0; i < 12; i++) { fire("left", "down"); update(0.02); }
update(0.81);
const xs = lastPieceXs();
ok("左墙夹紧：渲染位置最左 x=17(含1px内边距)、全部在界内",
    Math.min.apply(null, xs) === BOARD_X + 1 && xs.every(x => x >= BOARD_X) && xs.every(x => x <= BOARD_X + 9 * CELL), JSON.stringify(xs));
// 右移回并检查右墙
fire("right", "down");
for (let i = 0; i < 24; i++) { fire("right", "down"); update(0.02); }
update(0.81);
const xs2 = lastPieceXs();
ok("右墙夹紧：渲染位置全部在右界内（x <= 16+9*22-22）", xs2.every(x => x <= BOARD_X + 9 * CELL - CELL), JSON.stringify(xs2));

// 一次重力 tick：level1 interval=0.80（wall 测试期间已 tick 过一次，这里再来一次）
const y0 = lastPieceYs();
update(0.81);
const y1 = lastPieceYs();
ok("重力 tick：下落一格（22px）", y1.length === 4 && Math.min.apply(null, y1) >= Math.min.apply(null, y0) + CELL - 0.01, JSON.stringify(y0) + "→" + JSON.stringify(y1));

// 软降：按住 down，间隔 ×0.15 = 0.12s
fire("down", "down");
update(0.13);
const y2 = lastPieceYs();
ok("软降加速：按住 ↓ 后 0.13s 再下一格", y2.length === 4 && Math.min.apply(null, y2) >= Math.min.apply(null, y1) + CELL - 0.01, JSON.stringify(y1) + "→" + JSON.stringify(y2));
fire("down", "release");

// 旋转：up 后仍是 4 个 piece 矩形、位置合法
fire("up", "press");
const piecesR = lastPieces();
const xsR = piecesR.map(o => o.pos.x), ysR = piecesR.map(o => o.pos.y);
ok("旋转后仍是 4 个 piece 矩形", piecesR.length === 4, "n=" + piecesR.length);
ok("旋转后位置仍在棋盘内", xsR.length === 4 && xsR.every(x => x >= BOARD_X - 0.01 && x <= BOARD_X + 9 * CELL) && ysR.every(y => y >= BOARD_Y - 0.01), JSON.stringify([xsR, ysR]));

// 暂停：P 冻结 tick
fire("p", "press");
const yP = lastPieceYs().join(",");
const addsP = pieceObjs().length;
update(0.81);
ok("暂停后 update 不再推动方块（无新渲染、位置不变）", lastPieceYs().join(",") === yP && pieceObjs().length === addsP, yP + " | adds " + addsP + "→" + pieceObjs().length);
const pauseTxt = adds().filter(o => o.comps.some(c => c.comp === "text" && c.t.indexOf("暂停") >= 0));
ok("暂停文本出现", pauseTxt.length >= 1, "");
fire("p", "press");
ok("再按 P 销毁暂停文本", pauseTxt.length >= 1 && pauseTxt[pauseTxt.length - 1].destroyed === true, "");

// 硬降：锁定 → 4 个 cell 对象 + 新 piece + next 重建
const cellAddsBefore = adds().filter(o => o.tags.indexOf("cell") >= 0).length;
fire("space", "press");
const cellAddsAfter = adds().filter(o => o.tags.indexOf("cell") >= 0).length;
const pieceAfter = lastPieces();
ok("硬降锁定：新增锁定格对象", cellAddsAfter > cellAddsBefore, "before=" + cellAddsBefore + " after=" + cellAddsAfter);
ok("锁定后生成新下落方块（4 个 piece 矩形带颜色）", pieceAfter.length === 4 && pieceAfter.every(o => o.comps.some(c => c.comp === "color")), "n=" + pieceAfter.length);
ok("首次锁定后 gameover 场景注册（sceneAdd）", !!__sgScenes["gameover"], "scenes=" + Object.keys(__sgScenes).join(","));
const nextsAfter = adds().filter(o => o.tags.indexOf("next") >= 0);
ok("next 预览重建（新增 4 个）", nextsAfter.length >= 8, "n=" + nextsAfter.length);

// 游戏结局：连续硬降直到 Game Over（封顶 400 次防止误判）
let over = false;
for (let i = 0; i < 400 && !over; i++) {
    fire("space", "press");
    if (__kaplayCalls.some(c => c.fn === "go" && c.name === "gameover")) over = true;
}
ok("连续硬降触发 Game Over（sceneGo gameover）", over, "");

// gameover 场景：分数/消行展示 + 空格重开
__sgScenes["gameover"](null);
ok("Game Over 文本", textsOf("GAME OVER").length >= 1, "");
ok("gameover 场景展示 score/lines", adds().filter(o => o.comps.some(c => c.comp === "text" && /^score: /.test(c.t))).length >= 2, "");
ok("重开提示「按空格重新开始」", textsOf("按空格重新开始").length >= 1, "");
const goBefore = __kaplayCalls.filter(c => c.fn === "go").length;
fire("space", "press");
const goCalls = __kaplayCalls.filter(c => c.fn === "go");
ok("空格触发 sceneGo(main) 重开", goCalls.length === goBefore + 1 && goCalls[goCalls.length - 1].name === "main", "");
__sgScenes["main"](null);
const freshScore = adds().filter(o => o.comps.some(c => c.comp === "text" && c.t === "score: 0"));
ok("重开后状态重置（score: 0 文本重建）", freshScore.length >= 2, "n=" + freshScore.length);
ok("重开后新下落方块（最新一组 4 个）", lastPieces().length === 4 && lastPieces().every(o => o.comps.some(c => c.comp === "color")), "n=" + lastPieces().length);

console.log(fails === 0
    ? "SMOKE-TEST: ALL PASSED (28 项：俄罗斯方块完整局)"
    : "SMOKE-TEST: " + fails + " FAILED");
if (fails > 0) process.exitCode = 1;
