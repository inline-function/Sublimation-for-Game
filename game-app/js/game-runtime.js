// game-runtime.js —— Sublimation for Game 桥运行时
//
// 把 app/*.subl 里 @game @host 声明的游戏内建函数一一实现到 KAPLAY（v3001）。
//
// 【宿主桥 ABI（t38 定案）】唯一入口 globalThis.__subl.call(op, args)：
//   op = 操作名（= @game @host 声明的函数名），args = Sublimation 实参数组。
//   宿主侧用 __SG_OPS 注册表（单一真源）实现各 op；上面的具名函数既是实现，
//   也作为过渡期裸名别名保留（-A 路线/预 t37 编译器产物以裸名调用；t37 落定后移除）。
//   op 表与 game.subs 处理器白名单一一对应（笔误编译期报错）。
//
// 约定：
//   - 值层映射：Sublimation Num/Rat → JS number；Str → string；Any → 不透明句柄
//     （游戏对象 / 组件 / 向量都是 Any，只能经本层函数读写）；
//   - List[Any] → JS 数组（objsByTag 返回 KAPLAY 数组，二者同构）。
//
// 载入顺序（index.html）：
//   <script src="vendor/kaplay.js"></script>   ← 定义全局 kaplay()
//   <script src="js/game-runtime.js"></script> ← 本文件
//   <script src="app.js"></script>             ← Sublimation 编译产物，main() 自执行
"use strict";

var __sgCtx = null;

/** 取 KAPLAY 上下文；未初始化给出可读错误。 */
function __sgK() {
    if (!__sgCtx) throw new Error("[SfG] 游戏未初始化：请先调用 gameStart(width, height)");
    return __sgCtx;
}

/** 解析颜色：#rgb / #rrggbb 或颜色名 → KAPLAY ColorComp。 */
var __SG_COLORS = {
    red: [255, 68, 68], green: [68, 200, 68], blue: [68, 128, 255],
    yellow: [240, 220, 60], white: [255, 255, 255], black: [20, 20, 20],
    gray: [140, 140, 140], orange: [255, 150, 40], purple: [170, 90, 220], pink: [255, 130, 180],
};
function compColorHex(hex) {
    var k = __sgK();
    var rgb = null;
    if (typeof hex === "string" && hex.charAt(0) === "#") {
        var h = hex.slice(1);
        if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
        if (h.length === 6) rgb = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    } else if (__SG_COLORS[hex]) {
        rgb = __SG_COLORS[hex];
    }
    if (!rgb) throw new Error("[SfG] 无法解析颜色：" + hex + "（用 #rrggbb 或颜色名）");
    return k.color(rgb[0], rgb[1], rgb[2]);
}

// ---------- 引擎与场景（game.subl） ----------

function gameStart(width, height) {
    if (__sgCtx) throw new Error("[SfG] gameStart 只能调用一次");
    var init = (typeof kaplay === "function") ? kaplay : (kaplay && kaplay.default);
    if (typeof init !== "function") throw new Error("[SfG] 未找到 KAPLAY：页面需先引入 vendor/kaplay.js");
    __sgCtx = init({ width: width, height: height, global: false });
}

function gameGravity(g) { __sgK().setGravity(g); }
function sceneAdd(name, body) { __sgK().scene(name, function () { return body(null); }); }
function sceneGo(name) { __sgK().go(name); }
function viewWidth() { return __sgK().width(); }
function viewHeight() { return __sgK().height(); }

// ---------- 精灵与游戏对象（sprite.subl） ----------

function spriteLoad(name, src) { __sgK().loadSprite(name, src); }

// 组件构造：直接返回 KAPLAY 组件（不透明 Any）。
function compSprite(name) { return __sgK().sprite(name); }
function compPos(x, y) { return __sgK().pos(x, y); }
function compScale(s) { return __sgK().scale(s); }
function compRect(w, h) { return __sgK().rect(w, h); }
function compCircle(r) { return __sgK().circle(r); }
function compText(t, size) { return __sgK().text(t, { size: size }); }
function compArea() { return __sgK().area(); }
function compBody() { return __sgK().body(); }
function compSolid() { return __sgK().solid(); }
function compTag(t) { return t; }          // KAPLAY：标签就是字符串组件
function compAnchor(a) { return __sgK().anchor(a); }

function objAdd() { return __sgK().add([]); }
function objUse(o, c) { o.use(c); }
function objDestroy(o) { o.destroy(); }
function objExists(o) { return o.exists(); }

/** 相对移动（像素/帧）：直接位移，不走 KAPLAY 的秒速度语义，保证按帧可控。 */
function objMove(o, dx, dy) { o.pos = __sgK().vec2(o.pos.x + dx, o.pos.y + dy); }
function objSetPos(o, x, y) { o.pos = __sgK().vec2(x, y); }
function objSetScale(o, s) { o.scale = __sgK().vec2(s, s); }
function objPos(o) { return o.pos; }
function objTextSet(o, t) { o.text = t; }
function objTag(o, t) { o.use(t); }         // use 接受 Comp | Tag：字符串即标签

function vecX(v) { return v.x; }
function vecY(v) { return v.y; }

// ---------- 输入（input.subl） ----------

function onKeyDown(key, body) { __sgK().onKeyDown(key, function (k) { return body(k); }); }
function onKeyPress(key, body) { __sgK().onKeyPress(key, function (k) { return body(k); }); }
function onKeyRelease(key, body) { __sgK().onKeyRelease(key, function (k) { return body(k); }); }
function onMouseDown(btn, body) { __sgK().onMouseDown(btn, function (b) { return body(b); }); }
function mousePosX() { return __sgK().mousePos().x; }
function mousePosY() { return __sgK().mousePos().y; }

// ---------- 循环与计时（loop.subl） ----------

function onUpdate(body) { __sgK().onUpdate(function () { return body(__sgK().dt()); }); }
function frameDt() { return __sgK().dt(); }
function every(secs, body) { __sgK().loop(secs, function () { return body(null); }); }
function after(secs, body) { __sgK().wait(secs, function () { return body(null); }); }

// ---------- 碰撞（collision.subl） ----------

function objOnCollide(o, tag, body) { o.onCollide(tag, function (other) { return body(other); }); }
function objIsColliding(a, b) { return a.isColliding(b); }
function objsByTag(t) { return __sgK().get(t); }
function objsDestroyTag(t) { __sgK().destroyAll(t); }

// ============================================================================
// 宿主桥单入口（t38 定案 ABI）：globalThis.__subl.call(op, args)
// ============================================================================
// 注册表 __SG_OPS 是宿主桥的单一真源：op 名 → 上方具名实现。
// op 表与 game.subs 处理器白名单（isGameOp）一一对应——两边漂移即笔误，
// 编译期由处理器拒绝，运行期由 dispatcher 抛「未知 op」。
var __SG_OPS = {
    // 引擎与场景（game.subl）
    gameStart: gameStart, gameGravity: gameGravity,
    sceneAdd: sceneAdd, sceneGo: sceneGo, viewWidth: viewWidth, viewHeight: viewHeight,
    // 资源（sprite.subl）
    spriteLoad: spriteLoad,
    // 组件（comp*.subl）
    compSprite: compSprite, compPos: compPos, compScale: compScale, compRect: compRect,
    compCircle: compCircle, compText: compText, compColorHex: compColorHex, compArea: compArea,
    compBody: compBody, compSolid: compSolid, compTag: compTag, compAnchor: compAnchor,
    // 对象（obj*.subl）
    objAdd: objAdd, objUse: objUse, objDestroy: objDestroy, objExists: objExists,
    objMove: objMove, objSetPos: objSetPos, objSetScale: objSetScale, objPos: objPos,
    objTextSet: objTextSet, objTag: objTag,
    // 向量（vector.subl）
    vecX: vecX, vecY: vecY,
    // 输入（input.subl）
    onKeyDown: onKeyDown, onKeyPress: onKeyPress, onKeyRelease: onKeyRelease,
    onMouseDown: onMouseDown, mousePosX: mousePosX, mousePosY: mousePosY,
    // 循环与计时（loop.subl）
    onUpdate: onUpdate, frameDt: frameDt, every: every, after: after,
    // 碰撞（collision.subl）
    objOnCollide: objOnCollide, objIsColliding: objIsColliding,
    objsByTag: objsByTag, objsDestroyTag: objsDestroyTag,
};

// 安装 __subl.call（不覆盖宿主/产物可能已有的 __sublmain 等字段）
globalThis.__subl = globalThis.__subl || {};
globalThis.__subl.call = function (op, args) {
    var impl = __SG_OPS[op];
    if (!impl) {
        throw new Error("[SfG] 未知宿主桥 op：" + op + "（op 表见 game doc/游戏库.md）");
    }
    return impl.apply(undefined, args || []);
};
// 列出全部 op（供测试/插件框架枚举能力用）
globalThis.__subl.ops = function () { return Object.keys(__SG_OPS); };
