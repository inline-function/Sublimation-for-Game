// game-runtime.js —— Sublimation for Game 桥运行时
//
// 把 app/*.subl 里 @game @host 声明的游戏内建函数一一实现到 KAPLAY（v3001）。
//
// 【宿主桥 ABI（t38 定案）】唯一入口 globalThis.__subl.call(op, args)：
//   op = 操作名（= @game @host 声明的函数名），args = Sublimation 实参数组。
//   宿主侧用 __SG_OPS 注册表（单一真源）实现各 op。
//   编译器（t43 落定）对用户 @host 无体声明也统一生成 __subl.call ——
//   本文件整体包在闭包里，不向页面暴露任何桥全局名（t40 时期的裸名通道已回撤）。
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
//   <script src="app.js"></script>             ← Sublimation 产物（S-1：导出 __subl.main，
//                                                 由 index.html 的末段 script 调用）
(function () {
"use strict";

var __sgCtx = null;
// 指针世界坐标（t66）：KAPLAY 的 mousePos 对 CSS rotate(90deg) 竖屏画布（元素盒与缓冲
// 转置）与对触屏（用 rect 直减偏移）都不正确，且 mousedown/mouseup 不更新——
// 桥改用 DOM 监听自维护 __sgPointer。
var __sgPointer = null;
var __sgView = { w: 960, h: 540 };
var __sgLetterbox = false;

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
    __sgCtx = init({ pixelDensity: ((typeof window !== "undefined" && window.devicePixelRatio) || 1), width: width, height: height, global: false });
    __sgViewInit(width, height, false);
}

// 自适配窗口：stretch 恒开（画布跟随窗口尺寸），letterbox 保持宽高比（留黑边不变形），
// crisp 关闭平滑插值（image-rendering: pixelated，像素风锐利）。
// 俄罗斯方块这类 2D 网格游戏：gameStartFit(w, h, true, true)。
function gameStartFit(width, height, letterbox, crisp) {
    if (__sgCtx) throw new Error("[SfG] gameStart 只能调用一次");
    var init = (typeof kaplay === "function") ? kaplay : (kaplay && kaplay.default);
    if (typeof init !== "function") throw new Error("[SfG] 未找到 KAPLAY：页面需先引入 vendor/kaplay.js");
    // pixelDensity：画布物理分辨率 = CSS 尺寸 × devicePixelRatio（手机 ~3）。
    // jn() 的视口用 drawingBufferWidth/pixelDensity 折算回 CSS 等效值，offset→世界映射不变。
    __sgCtx = init({ pixelDensity: ((typeof window !== "undefined" && window.devicePixelRatio) || 1), width: width, height: height, global: false, stretch: true, letterbox: !!letterbox, crisp: !!crisp });
    __sgViewInit(width, height, letterbox);
}

function gameGravity(g) { __sgK().setGravity(g); }
function sceneAdd(name, body) { __sgK().scene(name, function () { return body(null); }); }
function sceneGo(name) { __sgK().go(name); }
function viewWidth() { return __sgK().width(); }
function viewHeight() { return __sgK().height(); }
// 真实窗口尺寸（CSS 像素；viewWidth/viewHeight 是逻辑画布尺寸）。
// 无窗口环境（Node 桩）回落为画布逻辑尺寸，便于测试。
function winWidth() {
    if (typeof window !== "undefined" && typeof window.innerWidth === "number") return window.innerWidth;
    return __sgK().width();
}
function winHeight() {
    if (typeof window !== "undefined" && typeof window.innerHeight === "number") return window.innerHeight;
    return __sgK().height();
}

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
// 松开鼠标键：松手这一刻触发一次（点击/拖拽分离的关键——不然拖拽态永远退不出）。
function onMouseRelease(btn, body) { __sgK().onMouseRelease(btn, function (b) { return body(b); }); }
// 鼠标移动（按住与否均触发；KAPLAY 回调参数为 (pos, delta)，取 pos 给回调体）。
function onMouseMove(body) { __sgK().onMouseMove(function (m) { return body(m); }); }
/** 画布元素局部偏移 -> 世界坐标。横屏元素盒=窗口=缓冲；竖屏 CSS rotate(90deg) 使
 *  元素盒（100vh×100vw）与缓冲（窗口尺寸）转置，需先把 (offsetX,offsetY) 换算到缓冲
 *  空间。letterbox 仅横屏启用（竖屏需拉伸铺满）。 */
function __sgWorldFromOffset(ox, oy) {
    var e = __sgView.w, n = __sgView.h;
    var W = (typeof window !== "undefined" && typeof window.innerWidth === "number") ? window.innerWidth : e;
    var H = (typeof window !== "undefined" && typeof window.innerHeight === "number") ? window.innerHeight : n;
    var bx = ox, by = oy;
    if (W < H) { bx = ox * W / H; by = oy * H / W; }
    var s = W, i = H, m = 0, u = 0, c = s, p = i;
    if (__sgLetterbox && !(W < H)) {
        var b = s / i, l = e / n, hb;
        if (b > l) { hb = i * l; m = (s - hb) / 2; c = hb; }
        else { hb = s / l; p = hb; u = (i - hb) / 2; }
    }
    return { x: (bx - m) * e / c, y: (by - u) * n / p };
}

/** 屏幕客户坐标 -> 世界坐标（触屏：KAPLAY 用 rect 直减，先回到元素局部语义）。 */
function __sgWorldFromClient(cx, cy) {
    var W = (typeof window !== "undefined" && typeof window.innerWidth === "number") ? window.innerWidth : 0;
    var H = (typeof window !== "undefined" && typeof window.innerHeight === "number") ? window.innerHeight : 0;
    if (W && W < H) return __sgWorldFromOffset(cy, W - cx);
    return __sgWorldFromOffset(cx, cy);
}

/** 记录画布尺寸/letterbox；注册 DOM 指针监听（鼠标 offsetX 语义 + 触屏客户坐标）。 */
function __sgViewInit(w, h, letterbox) {
    __sgView = { w: w, h: h };
    __sgLetterbox = !!letterbox;
    if (typeof document === "undefined" || !document.addEventListener) return;
    var cv = (__sgCtx && __sgCtx.canvas) || document.querySelector("canvas");
    if (!cv) return;
    var trackOff = function (e2) {
        if (typeof e2.offsetX === "number") __sgPointer = __sgWorldFromOffset(e2.offsetX, e2.offsetY);
    };
    var trackTouch = function (e2) {
        var tch = e2.changedTouches && e2.changedTouches[0];
        if (tch) __sgPointer = __sgWorldFromClient(tch.clientX, tch.clientY);
    };
    ["mousemove", "mousedown"].forEach(function (ev) { cv.addEventListener(ev, trackOff); });
    ["touchstart", "touchmove", "touchend"].forEach(function (ev) { cv.addEventListener(ev, trackTouch, { passive: true }); });
}

function mousePosX() {
    if (__sgPointer) return __sgPointer.x;
    return __sgK().mousePos().x;
}
function mousePosY() {
    if (__sgPointer) return __sgPointer.y;
    return __sgK().mousePos().y;
}

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
    gameStart: gameStart, gameStartFit: gameStartFit, gameGravity: gameGravity,
    sceneAdd: sceneAdd, sceneGo: sceneGo, viewWidth: viewWidth, viewHeight: viewHeight,
    winWidth: winWidth, winHeight: winHeight,
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
    onMouseDown: onMouseDown, onMouseRelease: onMouseRelease, onMouseMove: onMouseMove,
    mousePosX: mousePosX, mousePosY: mousePosY,
    // 循环与计时（loop.subl）
    onUpdate: onUpdate, frameDt: frameDt, every: every, after: after,
    // 碰撞（collision.subl）
    objOnCollide: objOnCollide, objIsColliding: objIsColliding,
    objsByTag: objsByTag, objsDestroyTag: objsDestroyTag,
};

// 安装 __subl.call（不覆盖宿主/产物可能已有的 __subl.main 等字段）
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
})();
