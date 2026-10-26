"use strict";
(() => {
  const None = () => ({ tag: "None" });
  const Some = (a0) => ({ tag: "Some", 0: a0 });
  const __dshtoStr = (v) => {
    if (v === null || v === undefined) return String(v);
    if (Array.isArray(v)) return "[" + v.map(__dshtoStr).join(",") + "]";
    if (typeof v === "object" && Object.keys(v).length === 1 && "tag" in v) return String(v.tag);
    return String(v);
  };
  const __isa = (v, t) => {
    if (t === "Nat" || t === "Int" || t === "Rat") return typeof v === "number";
    if (t === "Str") return typeof v === "string";
    if (t === "Bool") return typeof v === "boolean";
    if (t === "Null") return v === null || (v && v.tag === "Null");
    if (t === "(fn)") return typeof v === "function";
    if (t === "List") return Array.isArray(v);
    return v !== null && typeof v === "object" && v.tag === t;
  };
  const __eq = (a, b) => {
    if (a === b) return true;
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
    if (a.tag !== undefined && a.tag !== b.tag) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every(k => __eq(a[k], b[k]));
  };
  function check(name, cond) {
    return (cond ? (() => {
  return console.log(__dshtoStr(("PASS " + name)));
})() : (() => {
  return console.log(__dshtoStr(("FAIL " + name)));
})());
  }
  function checkN(name, got, want) {
    return (__eq(got, want) ? (() => {
  return console.log(__dshtoStr(("PASS " + name)));
})() : (() => {
  return console.log(__dshtoStr((("FAIL " + name) + (" got=" + __dshtoStr(got)))));
})());
  }
  function checkS(name, got, want) {
    return (__eq(got, want) ? (() => {
  return console.log(__dshtoStr(("PASS " + name)));
})() : (() => {
  return console.log(__dshtoStr((("FAIL " + name) + (" got=" + got))));
})());
  }
  async function main() {
    const b = newBoard();
    checkS("空棋盘格为空", cellAt(b, 0, 0), "");
    checkS("空棋盘角格为空", cellAt(b, 19, 9), "");
    check("I 横放(3,0) 可放", canPlace(b, 0, 0, 3, 0));
    check("I 横放(7,0) 越右界不可放", (!canPlace(b, 0, 0, 7, 0)));
    check("I 横放(-1,0) 越左界不可放", (!canPlace(b, 0, 0, (-1), 0)));
    check("I 竖放(3,16) 可放", canPlace(b, 0, 1, 3, 16));
    check("I 竖放(3,17) 越底界不可放", (!canPlace(b, 0, 1, 3, 17)));
    const b2 = lockPiece(b, 0, 0, 3, 19, "#0ff");
    checkS("锁定后格染色", cellAt(b2, 19, 3), "#0ff");
    checkS("锁定旁格仍空", cellAt(b2, 19, 8), "");
    check("原位再放被占不可放", (!canPlace(b2, 0, 0, 3, 19)));
    const b3 = lockPiece(b, 1, 0, 8, 18, "#ff0");
    const b4 = lockPiece(b3, 0, 0, 0, 19, "#0ff");
    const b5 = lockPiece(b4, 0, 0, 4, 19, "#0ff");
    checkN("底行填满后满行数=1", countFullLines(b5), 1);
    const b6 = clearedBoard(b5);
    checkS("消行后底行已空", cellAt(b6, 19, 3), "");
    checkS("消行后 O 格从 18 顺延到 19", cellAt(b6, 19, 8), "#ff0");
    checkS("消行后 18 行的 O 位已空", cellAt(b6, 18, 8), "");
    checkN("消行后满行数=0", countFullLines(b6), 0);
    const b7 = lockPiece(b6, 0, 0, 3, 17, "#0ff");
    checkN("再锁一行后满行数=0", countFullLines(b7), 0);
    checkN("scoreFor(0)=0", scoreFor(0), 0);
    checkN("scoreFor(1)=100", scoreFor(1), 100);
    checkN("scoreFor(2)=300", scoreFor(2), 300);
    checkN("scoreFor(3)=500", scoreFor(3), 500);
    checkN("scoreFor(4)=800", scoreFor(4), 800);
    checkN("levelFor(0)=1", levelFor(0), 1);
    checkN("levelFor(9)=1", levelFor(9), 1);
    checkN("levelFor(10)=2", levelFor(10), 2);
    checkN("levelFor(19)=2", levelFor(19), 2);
    checkN("levelFor(20)=3", levelFor(20), 3);
    checkN("levelFor(30)=4", levelFor(30), 4);
    checkN("levelFor(100)=10 封顶", levelFor(100), 10);
    check("fallInterval(1)=0.80", __eq(fallInterval(1), 0.80));
    check("fallInterval(2)=0.72", __eq(fallInterval(2), 0.72));
    check("fallInterval(10)=0.08 封顶", __eq(fallInterval(10), 0.08));
    const b8 = lockPiece(b, 2, 0, 3, 0, "#a0f");
    check("出生位被压 → isGameOver", isGameOver(b8, 0));
    check("空盘 → 未结局", (!isGameOver(b, 0)));
    checkN("nextRot(0)=1", nextRot(0), 1);
    checkN("nextRot(3)=0", nextRot(3), 0);
    checkN("shapeCells I 横放=4 格", (shapeCells(shapeOf(0, 0), 3, 19, 0)).length, 4);
    checkN("boardCells 空盘=0 格", (boardCells(newBoard(), 0)).length, 0);
    checkN("boardCells 锁定 I=4 格", (boardCells(b2, 0)).length, 4);
    console.log(__dshtoStr("LOGIC-DONE"));
    null;
    return null;
  }
  function BOARD_W() {
    return 10;
  }
  function BOARD_H() {
    return 20;
  }
  function repeatRow(n) {
    return (__eq(n, 0) ? (() => {
  return [];
})() : (() => {
  return [emptyRow(), ...(repeatRow((n - 1)))];
})());
  }
  function repeatCell(n, s) {
    return (__eq(n, 0) ? (() => {
  return [];
})() : (() => {
  return [s, ...(repeatCell((n - 1), s))];
})());
  }
  function newBoard() {
    return repeatRow(BOARD_H());
  }
  function emptyRow() {
    return repeatCell(BOARD_W(), "");
  }
  function rowAt(board, r) {
    return (() => {
  const __s0 = board;
  if (((Array.isArray(__s0) && __s0.length === 0))) {  return emptyRow(); }
  if (((Array.isArray(__s0) && __s0.length >= 1))) { const h = __s0[0]; const t = __s0.slice(1);  return (__eq(r, 0) ? (() => {
  return h;
})() : (() => {
  return rowAt(t, (r - 1));
})()); }
   return emptyRow();
})();
  }
  function cellInRow(row, c) {
    return (() => {
  const __s1 = row;
  if (((Array.isArray(__s1) && __s1.length === 0))) {  return ""; }
  if (((Array.isArray(__s1) && __s1.length >= 1))) { const h = __s1[0]; const t = __s1.slice(1);  return (__eq(c, 0) ? (() => {
  return h;
})() : (() => {
  return cellInRow(t, (c - 1));
})()); }
   return "";
})();
  }
  function cellAt(board, r, c) {
    return cellInRow(rowAt(board, r), c);
  }
  function rowUpd(row, i, v) {
    return (() => {
  const __s2 = row;
  if (((Array.isArray(__s2) && __s2.length === 0))) {  return []; }
  if (((Array.isArray(__s2) && __s2.length >= 1))) { const h = __s2[0]; const t = __s2.slice(1);  return (__eq(i, 0) ? (() => {
  return [v, ...(t)];
})() : (() => {
  return [h, ...(rowUpd(t, (i - 1), v))];
})()); }
   return [];
})();
  }
  function boardUpd(board, i, v) {
    return (() => {
  const __s3 = board;
  if (((Array.isArray(__s3) && __s3.length === 0))) {  return []; }
  if (((Array.isArray(__s3) && __s3.length >= 1))) { const h = __s3[0]; const t = __s3.slice(1);  return (__eq(i, 0) ? (() => {
  return [v, ...(t)];
})() : (() => {
  return [h, ...(boardUpd(t, (i - 1), v))];
})()); }
   return [];
})();
  }
  function shapeI(rot) {
    return (() => {
  const __s4 = rot;
  if ((__s4 === 0)) {  return ["XXXX"]; }
  if ((__s4 === 1)) {  return ["X...", "X...", "X...", "X..."]; }
  if ((__s4 === 2)) {  return ["XXXX"]; }
   return ["X...", "X...", "X...", "X..."];
})();
  }
  function shapeO(_rot) {
    return ["XX..", "XX.."];
  }
  function shapeT(rot) {
    return (() => {
  const __s5 = rot;
  if ((__s5 === 0)) {  return ["XXX.", ".X.."]; }
  if ((__s5 === 1)) {  return ["..X.", ".XX.", "..X."]; }
  if ((__s5 === 2)) {  return [".X..", "XXX."]; }
   return ["X...", "XX..", "X..."];
})();
  }
  function shapeS(rot) {
    return (() => {
  const __s6 = rot;
  if ((__s6 === 0)) {  return [".XX.", "XX.."]; }
  if ((__s6 === 1)) {  return ["X...", "XX..", ".X.."]; }
  if ((__s6 === 2)) {  return [".XX.", "XX.."]; }
   return ["X...", "XX..", ".X.."];
})();
  }
  function shapeZ(rot) {
    return (() => {
  const __s7 = rot;
  if ((__s7 === 0)) {  return ["XX..", ".XX."]; }
  if ((__s7 === 1)) {  return [".X..", "XX..", "X..."]; }
  if ((__s7 === 2)) {  return ["XX..", ".XX."]; }
   return [".X..", "XX..", "X..."];
})();
  }
  function shapeJ(rot) {
    return (() => {
  const __s8 = rot;
  if ((__s8 === 0)) {  return ["X...", "XXX."]; }
  if ((__s8 === 1)) {  return [".XX.", ".X..", ".X.."]; }
  if ((__s8 === 2)) {  return ["XXX.", "..X."]; }
   return ["..X.", "..X.", ".XX."];
})();
  }
  function shapeL(rot) {
    return (() => {
  const __s9 = rot;
  if ((__s9 === 0)) {  return ["..X.", "XXX."]; }
  if ((__s9 === 1)) {  return [".X..", ".X..", ".XX."]; }
  if ((__s9 === 2)) {  return ["XXX.", "X..."]; }
   return [".X..", ".X..", "XX.."];
})();
  }
  function shapeOf(kind, rot) {
    return (() => {
  const __s10 = kind;
  if ((__s10 === 0)) {  return shapeI(rot); }
  if ((__s10 === 1)) {  return shapeO(rot); }
  if ((__s10 === 2)) {  return shapeT(rot); }
  if ((__s10 === 3)) {  return shapeS(rot); }
  if ((__s10 === 4)) {  return shapeZ(rot); }
  if ((__s10 === 5)) {  return shapeJ(rot); }
   return shapeL(rot);
})();
  }
  function nextRot(rot) {
    return ((rot >= 3) ? (() => {
  return 0;
})() : (() => {
  return (rot + 1);
})());
  }
  function kindColor(kind) {
    return (() => {
  const __s11 = kind;
  if ((__s11 === 0)) {  return "#0ff"; }
  if ((__s11 === 1)) {  return "#ff0"; }
  if ((__s11 === 2)) {  return "#a0f"; }
  if ((__s11 === 3)) {  return "#0f0"; }
  if ((__s11 === 4)) {  return "#f00"; }
  if ((__s11 === 5)) {  return "#00f"; }
   return "#f90";
})();
  }
  function cellOk(board, c, r) {
    return ((c < 0) ? (() => {
  return false;
})() : (() => {
  return ((r < 0) ? (() => {
  return false;
})() : (() => {
  return ((c >= BOARD_W()) ? (() => {
  return false;
})() : (() => {
  return ((r >= BOARD_H()) ? (() => {
  return false;
})() : (() => {
  return __eq(cellAt(board, r, c), "");
})());
})());
})());
})());
  }
  function rowFits(board, shapeRow, x, y, c) {
    return ((c < 0) ? (() => {
  return true;
})() : (() => {
  return (__eq(((shapeRow)[c] ?? ""), "X") ? (() => {
  return (rowFits(board, shapeRow, x, y, (c - 1)) && cellOk(board, (x + c), y));
})() : (() => {
  return rowFits(board, shapeRow, x, y, (c - 1));
})());
})());
  }
  function shapeFits(board, shape, x, y, r) {
    return (() => {
  const __s12 = shape;
  if (((Array.isArray(__s12) && __s12.length === 0))) {  return true; }
  if (((Array.isArray(__s12) && __s12.length >= 1))) { const h = __s12[0]; const t = __s12.slice(1);  return (rowFits(board, h, x, (y + r), 3) ? (() => {
  return shapeFits(board, t, x, y, (r + 1));
})() : (() => {
  return false;
})()); }
   return true;
})();
  }
  function canPlace(board, kind, rot, x, y) {
    return shapeFits(board, shapeOf(kind, rot), x, y, 0);
  }
  function paintRow(row, shapeRow, x, c, color) {
    return ((c < 0) ? (() => {
  return row;
})() : (() => {
  return (__eq(((shapeRow)[c] ?? ""), "X") ? (() => {
  return paintRow(rowUpd(row, (x + c), color), shapeRow, x, (c - 1), color);
})() : (() => {
  return paintRow(row, shapeRow, x, (c - 1), color);
})());
})());
  }
  function paintShape(board, shape, x, y, r, color) {
    return (() => {
  const __s13 = shape;
  if (((Array.isArray(__s13) && __s13.length === 0))) {  return board; }
  if (((Array.isArray(__s13) && __s13.length >= 1))) { const h = __s13[0]; const t = __s13.slice(1);  return paintShape(boardUpd(board, (y + r), paintRow(rowAt(board, (y + r)), h, x, 3, color)), t, x, y, (r + 1), color); }
   return board;
})();
  }
  function lockPiece(board, kind, rot, x, y, color) {
    return paintShape(board, shapeOf(kind, rot), x, y, 0, color);
  }
  function rowFull(row) {
    return (!(row).includes(""));
  }
  function countFullLines(board) {
    return countFullWalk(board, 0);
  }
  function countFullWalk(rows, acc) {
    return (() => {
  const __s14 = rows;
  if (((Array.isArray(__s14) && __s14.length === 0))) {  return acc; }
  if (((Array.isArray(__s14) && __s14.length >= 1))) { const h = __s14[0]; const t = __s14.slice(1);  return (rowFull(h) ? (() => {
  return countFullWalk(t, (acc + 1));
})() : (() => {
  return countFullWalk(t, acc);
})()); }
   return acc;
})();
  }
  function keepRows(rows) {
    return (() => {
  const __s15 = rows;
  if (((Array.isArray(__s15) && __s15.length === 0))) {  return []; }
  if (((Array.isArray(__s15) && __s15.length >= 1))) { const h = __s15[0]; const t = __s15.slice(1);  return (rowFull(h) ? (() => {
  return keepRows(t);
})() : (() => {
  return [h, ...(keepRows(t))];
})()); }
   return [];
})();
  }
  function clearedBoard(board) {
    return (repeatRow((BOARD_H() - (keepRows(board)).length))).concat(keepRows(board));
  }
  function scoreFor(lines) {
    return (() => {
  const __s16 = lines;
  if ((__s16 === 0)) {  return 0; }
  if ((__s16 === 1)) {  return 100; }
  if ((__s16 === 2)) {  return 300; }
  if ((__s16 === 3)) {  return 500; }
   return 800;
})();
  }
  function levelFor(lines) {
    return ((lines < 10) ? (() => {
  return 1;
})() : (() => {
  return ((lines < 20) ? (() => {
  return 2;
})() : (() => {
  return ((lines < 30) ? (() => {
  return 3;
})() : (() => {
  return ((lines < 40) ? (() => {
  return 4;
})() : (() => {
  return ((lines < 50) ? (() => {
  return 5;
})() : (() => {
  return ((lines < 60) ? (() => {
  return 6;
})() : (() => {
  return ((lines < 70) ? (() => {
  return 7;
})() : (() => {
  return ((lines < 80) ? (() => {
  return 8;
})() : (() => {
  return ((lines < 90) ? (() => {
  return 9;
})() : (() => {
  return 10;
})());
})());
})());
})());
})());
})());
})());
})());
})());
  }
  function fallInterval(level) {
    return (() => {
  const __s17 = level;
  if ((__s17 === 1)) {  return 0.80; }
  if ((__s17 === 2)) {  return 0.72; }
  if ((__s17 === 3)) {  return 0.63; }
  if ((__s17 === 4)) {  return 0.55; }
  if ((__s17 === 5)) {  return 0.47; }
  if ((__s17 === 6)) {  return 0.38; }
  if ((__s17 === 7)) {  return 0.30; }
  if ((__s17 === 8)) {  return 0.22; }
  if ((__s17 === 9)) {  return 0.13; }
   return 0.08;
})();
  }
  function isGameOver(board, kind) {
    return (!canPlace(board, kind, 0, 3, 0));
  }
  function rowCellList(shapeRow, x, y, c) {
    return ((c < 0) ? (() => {
  return [];
})() : (() => {
  return (__eq(((shapeRow)[c] ?? ""), "X") ? (() => {
  return [[(x + c), y], ...(rowCellList(shapeRow, x, y, (c - 1)))];
})() : (() => {
  return rowCellList(shapeRow, x, y, (c - 1));
})());
})());
  }
  function shapeCells(shape, x, y, r) {
    return (() => {
  const __s18 = shape;
  if (((Array.isArray(__s18) && __s18.length === 0))) {  return []; }
  if (((Array.isArray(__s18) && __s18.length >= 1))) { const h = __s18[0]; const t = __s18.slice(1);  return (rowCellList(h, x, (y + r), 3)).concat(shapeCells(t, x, y, (r + 1))); }
   return [];
})();
  }
  function boardCells(rows, r) {
    return (() => {
  const __s19 = rows;
  if (((Array.isArray(__s19) && __s19.length === 0))) {  return []; }
  if (((Array.isArray(__s19) && __s19.length >= 1))) { const h = __s19[0]; const t = __s19.slice(1);  return (rowCellsWalk(h, r, 9)).concat(boardCells(t, (r + 1))); }
   return [];
})();
  }
  function rowCellsWalk(row, r, c) {
    return ((c < 0) ? (() => {
  return [];
})() : (() => {
  return (__eq(cellInRow(row, c), "") ? (() => {
  return rowCellsWalk(row, r, (c - 1));
})() : (() => {
  return [[c, r], ...(rowCellsWalk(row, r, (c - 1)))];
})());
})());
  }
  const dict_core_collection_Functor_List = {
    map: (d, fa, f) => (() => {
  const __s20 = fa;
  if (((Array.isArray(__s20) && __s20.length === 0))) {  return []; }
  if (((Array.isArray(__s20) && __s20.length >= 1))) { const h = __s20[0]; const t = __s20.slice(1);  return [f(h), ...(dict_core_collection_Functor_List.map(dict_core_collection_Functor_List, t, f))]; }
  return null;
})()
  };
  const dict_core_collection_Foldable_List = {
    fold: (d, fa, init, f) => (() => {
  const __s21 = fa;
  if (((Array.isArray(__s21) && __s21.length === 0))) {  return init; }
  if (((Array.isArray(__s21) && __s21.length >= 1))) { const h = __s21[0]; const t = __s21.slice(1);  return dict_core_collection_Foldable_List.fold(dict_core_collection_Foldable_List, t, f(init, h), f); }
  return null;
})()
  };
  const dict_core_collection_Monad_List = {
    pure: (d, x) => [x, ...([])],
    flatMap: (d, fa, f) => (() => {
  const __s22 = fa;
  if (((Array.isArray(__s22) && __s22.length === 0))) {  return []; }
  if (((Array.isArray(__s22) && __s22.length >= 1))) { const h = __s22[0]; const t = __s22.slice(1);  return (f(h)).concat(dict_core_collection_Monad_List.flatMap(dict_core_collection_Monad_List, t, f)); }
  return null;
})()
  };
  function core_collection__emptyList() {
    return [];
  }
  function core_collection__cons(x, xs) {
    return [x, ...(xs)];
  }
  function core_collection__listOf(items) {
    return items;
  }
  function core_collection__range(a, b) {
    if ((a < b)) {
      // unchecked
      const rest = core_collection__range((a + 1), b);
      return [a, ...(rest)];
    }
    return [];
  }
  function core_collection__size$List(xs) {
    return (() => {
  const __s23 = xs;
  if (((Array.isArray(__s23) && __s23.length === 0))) {  return 0; }
  if (((Array.isArray(__s23) && __s23.length >= 1))) { const t = __s23.slice(1);  return ((t).length + 1); }
  return null;
})();
  }
  function core_collection__isEmpty$List(xs) {
    return (() => {
  const __s24 = xs;
  if (((Array.isArray(__s24) && __s24.length === 0))) {  return true; }
  if (((Array.isArray(__s24) && __s24.length >= 1))) {  return false; }
  return null;
})();
  }
  function core_collection__head(xs) {
    return (() => {
  const __s25 = xs;
  if (((Array.isArray(__s25) && __s25.length === 0))) {  return None(); }
  if (((Array.isArray(__s25) && __s25.length >= 1))) { const h = __s25[0];  return Some(h); }
  return null;
})();
  }
  function core_collection__last(xs) {
    return (() => {
  const __s26 = xs;
  if (((Array.isArray(__s26) && __s26.length === 0))) {  return None(); }
  if (((Array.isArray(__s26) && __s26.length >= 1)) && ((Array.isArray(__s26.slice(1)) && __s26.slice(1).length === 0))) { const h = __s26[0];  return Some(h); }
  if (((Array.isArray(__s26) && __s26.length >= 1))) { const t = __s26.slice(1);  return (() => { const a = t; return a.length ? Some(a[a.length - 1]) : None(); })(); }
  return null;
})();
  }
  function core_collection__elementAt(xs, i) {
    return (() => {
  const __s27 = xs;
  if (((Array.isArray(__s27) && __s27.length === 0))) {  return None(); }
  if (((Array.isArray(__s27) && __s27.length >= 1))) { const h = __s27[0]; const t = __s27.slice(1);  return (__eq(i, 0) ? (() => {
  return Some(h);
})() : (() => {
  return (() => { const a = t; const i = (i - 1); return i >= 0 && i < a.length ? Some(a[i]) : None(); })();
})()); }
  return null;
})();
  }
  function core_collection__get$List(xs, i) {
    return (() => {
  const __s28 = (() => { const a = xs; const i = i; return i >= 0 && i < a.length ? Some(a[i]) : None(); })();
  if ((__s28.tag === "Some")) { const v = __s28[0];  return v; }
  if ((__s28.tag === "None")) {  return (() => { throw new Error('panic: unreachable') })(); }
  return null;
})();
  }
  function core_collection__firstOr(xs, d) {
    return core_collection__getOrElse((() => { const a = xs; return a.length ? Some(a[0]) : None(); })(), d);
  }
  function core_collection__contains$List(xs, x) {
    return (() => {
  const __s29 = xs;
  if (((Array.isArray(__s29) && __s29.length === 0))) {  return false; }
  if (((Array.isArray(__s29) && __s29.length >= 1))) { const h = __s29[0]; const t = __s29.slice(1);  return (__eq(h, x) ? (() => {
  return true;
})() : (() => {
  return (t).includes(x);
})()); }
  return null;
})();
  }
  function core_collection__indexOf(xs, x) {
    return (() => {
  const __s30 = xs;
  if (((Array.isArray(__s30) && __s30.length === 0))) {  return None(); }
  if (((Array.isArray(__s30) && __s30.length >= 1))) { const h = __s30[0]; const t = __s30.slice(1);  return (__eq(h, x) ? (() => {
  return Some(0);
})() : (() => {
  return (() => {
  const __s31 = (() => { const i = (t).indexOf(x); return i === -1 ? None() : Some(i); })();
  if ((__s31.tag === "Some")) { const n = __s31[0];  return Some((n + 1)); }
  if ((__s31.tag === "None")) {  return None(); }
  return null;
})();
})()); }
  return null;
})();
  }
  function core_collection__count$List(xs, p) {
    return dict_core_collection_Foldable_List.fold(dict_core_collection_Foldable_List, xs, 0, (acc, x) => (p(x) ? (() => {
  return (acc + 1);
})() : (() => {
  return acc;
})()));
  }
  function core_collection__any(xs, p) {
    return dict_core_collection_Foldable_List.fold(dict_core_collection_Foldable_List, xs, false, (acc, x) => (acc || p(x)));
  }
  function core_collection__all(xs, p) {
    return dict_core_collection_Foldable_List.fold(dict_core_collection_Foldable_List, xs, true, (acc, x) => (acc && p(x)));
  }
  function core_collection__find(xs, p) {
    return (() => {
  const __s32 = xs;
  if (((Array.isArray(__s32) && __s32.length === 0))) {  return None(); }
  if (((Array.isArray(__s32) && __s32.length >= 1))) { const h = __s32[0]; const t = __s32.slice(1);  return (p(h) ? (() => {
  return Some(h);
})() : (() => {
  return core_collection__find(t, p);
})()); }
  return null;
})();
  }
  function core_collection__forEach$List(xs, f) {
    return (() => {
  const __s33 = xs;
  if (((Array.isArray(__s33) && __s33.length === 0))) {  return null; }
  if (((Array.isArray(__s33) && __s33.length >= 1))) { const h = __s33[0]; const t = __s33.slice(1);  return (() => {
  f(h);
  return (t).forEach(x => (f)(x));
})(); }
  return null;
})();
  }
  function core_collection__append(xs, ys) {
    return (() => {
  const __s34 = xs;
  if (((Array.isArray(__s34) && __s34.length === 0))) {  return ys; }
  if (((Array.isArray(__s34) && __s34.length >= 1))) { const h = __s34[0]; const t = __s34.slice(1);  return [h, ...((t).concat(ys))]; }
  return null;
})();
  }
  function core_collection__take(xs, n) {
    return (() => {
  const __s35 = xs;
  if (((Array.isArray(__s35) && __s35.length === 0))) {  return []; }
  if (((Array.isArray(__s35) && __s35.length >= 1))) { const h = __s35[0]; const t = __s35.slice(1);  return (__eq(n, 0) ? (() => {
  return [];
})() : (() => {
  const r = (t).slice(0, (n - 1));
  return [h, ...(r)];
})()); }
  return null;
})();
  }
  function core_collection__drop(xs, n) {
    return (() => {
  const __s36 = xs;
  if (((Array.isArray(__s36) && __s36.length === 0))) {  return []; }
  if (((Array.isArray(__s36) && __s36.length >= 1))) { const t = __s36.slice(1);  return (__eq(n, 0) ? (() => {
  return xs;
})() : (() => {
  const r = (t).slice((n - 1));
  return r;
})()); }
  return null;
})();
  }
  function core_collection__slice(xs, from, to) {
    return (() => {
  const __s37 = xs;
  if (((Array.isArray(__s37) && __s37.length === 0))) {  return []; }
  if (((Array.isArray(__s37) && __s37.length >= 1))) { const h = __s37[0]; const t = __s37.slice(1);  return ((to <= from) ? (() => {
  return [];
})() : (() => {
  return (__eq(from, 0) ? (() => {
  const r = (t).slice(0, (to - 1));
  return [h, ...(r)];
})() : (() => {
  return (t).slice((from - 1), (to - 1));
})());
})()); }
  return null;
})();
  }
  function core_collection__filter$List(xs, p) {
    return (() => {
  const __s38 = xs;
  if (((Array.isArray(__s38) && __s38.length === 0))) {  return []; }
  if (((Array.isArray(__s38) && __s38.length >= 1))) { const h = __s38[0]; const t = __s38.slice(1);  return (p(h) ? (() => {
  return [h, ...((t).filter(p))];
})() : (() => {
  return (t).filter(p);
})()); }
  return null;
})();
  }
  function core_collection__distinct(xs) {
    return (() => {
  const __s39 = xs;
  if (((Array.isArray(__s39) && __s39.length === 0))) {  return []; }
  if (((Array.isArray(__s39) && __s39.length >= 1))) { const h = __s39[0]; const t = __s39.slice(1);  return ((t).includes(h) ? (() => {
  return core_collection__distinct(t);
})() : (() => {
  return [h, ...(core_collection__distinct(t))];
})()); }
  return null;
})();
  }
  function core_collection__sortBy(xs, f) {
    return (() => {
  const __s40 = xs;
  if (((Array.isArray(__s40) && __s40.length === 0))) {  return []; }
  if (((Array.isArray(__s40) && __s40.length >= 1))) { const h = __s40[0]; const t = __s40.slice(1);  return core_collection__insertSort(h, (t).slice().sort((a, b) => (f)(a, b) ? -1 : 1), f); }
  return null;
})();
  }
  function core_collection__insertSort(x, xs, f) {
    return (() => {
  const __s41 = xs;
  if (((Array.isArray(__s41) && __s41.length === 0))) {  return [x, ...([])]; }
  if (((Array.isArray(__s41) && __s41.length >= 1))) { const h = __s41[0]; const t = __s41.slice(1);  return (f(x, h) ? (() => {
  return [x, ...([h, ...(t)])];
})() : (() => {
  return [h, ...(core_collection__insertSort(x, t, f))];
})()); }
  return null;
})();
  }
  function core_collection__reverse(xs) {
    return (() => {
  const __s42 = xs;
  if (((Array.isArray(__s42) && __s42.length === 0))) {  return []; }
  if (((Array.isArray(__s42) && __s42.length >= 1))) { const h = __s42[0]; const t = __s42.slice(1);  return ((t).slice().reverse()).concat([h, ...([])]); }
  return null;
})();
  }
  function core_collection__clear(xs) {
    return [];
  }
  function core_collection__sum(xs) {
    return dict_core_collection_Foldable_List.fold(dict_core_collection_Foldable_List, xs, 0, (acc, x) => (acc + x));
  }
  function core_collection__maxNat(xs) {
    return (() => {
  const __s43 = xs;
  if (((Array.isArray(__s43) && __s43.length === 0))) {  return None(); }
  if (((Array.isArray(__s43) && __s43.length >= 1))) { const h = __s43[0]; const t = __s43.slice(1);  return (() => {
  const __s44 = t;
  if (((Array.isArray(__s44) && __s44.length === 0))) {  return Some(h); }
  if (((Array.isArray(__s44) && __s44.length >= 1))) {  return (() => {
  const __s45 = core_collection__maxNat(t);
  if ((__s45.tag === "Some")) { const v = __s45[0];  return ((h > v) ? (() => {
  return Some(h);
})() : (() => {
  return Some(v);
})()); }
  if ((__s45.tag === "None")) {  return Some(h); }
  return null;
})(); }
  return null;
})(); }
  return null;
})();
  }
  function core_collection__minNat(xs) {
    return (() => {
  const __s46 = xs;
  if (((Array.isArray(__s46) && __s46.length === 0))) {  return None(); }
  if (((Array.isArray(__s46) && __s46.length >= 1))) { const h = __s46[0]; const t = __s46.slice(1);  return (() => {
  const __s47 = t;
  if (((Array.isArray(__s47) && __s47.length === 0))) {  return Some(h); }
  if (((Array.isArray(__s47) && __s47.length >= 1))) {  return (() => {
  const __s48 = core_collection__minNat(t);
  if ((__s48.tag === "Some")) { const v = __s48[0];  return ((h < v) ? (() => {
  return Some(h);
})() : (() => {
  return Some(v);
})()); }
  if ((__s48.tag === "None")) {  return Some(h); }
  return null;
})(); }
  return null;
})(); }
  return null;
})();
  }
  function core_collection__joinToString(xs, sep) {
    return dict_core_collection_Foldable_List.fold(dict_core_collection_Foldable_List, xs, "", (acc, x) => (__eq(acc, "") ? (() => {
  return __dshtoStr(x);
})() : (() => {
  return (acc + (sep + __dshtoStr(x)));
})()));
  }
  function core_collection__zip(xs, ys) {
    return (() => {
  const __s49 = xs;
  if (((Array.isArray(__s49) && __s49.length === 0))) {  return []; }
  if (((Array.isArray(__s49) && __s49.length >= 1))) { const h = __s49[0]; const t = __s49.slice(1);  return (() => {
  const __s50 = ys;
  if (((Array.isArray(__s50) && __s50.length === 0))) {  return []; }
  if (((Array.isArray(__s50) && __s50.length >= 1))) { const h2 = __s50[0]; const t2 = __s50.slice(1);  return [[h, h2], ...(core_collection__zip(t, t2))]; }
  return null;
})(); }
  return null;
})();
  }
  function core_collection__toSet(xs) {
    return (() => {
  const __s51 = xs;
  if (((Array.isArray(__s51) && __s51.length === 0))) {  return core_collection__SetNil(); }
  if (((Array.isArray(__s51) && __s51.length >= 1))) { const h = __s51[0]; const t = __s51.slice(1);  return core_collection__add(core_collection__toSet(t), h); }
  return null;
})();
  }
  function core_collection__toMap(xs) {
    return (() => {
  const __s52 = xs;
  if (((Array.isArray(__s52) && __s52.length === 0))) {  return core_collection__MapNil(); }
  if (((Array.isArray(__s52) && __s52.length >= 1))) { const pr = __s52[0]; const t = __s52.slice(1);  return (() => {
  const __s53 = pr;
  if (((Array.isArray(__s53) && __s53.length === 2))) { const k = __s53[0]; const v = __s53[1];  return core_collection__put(core_collection__toMap(t), k, v); }
  return null;
})(); }
  return null;
})();
  }
  function core_collection__Map__MapNil() { return { tag: "MapNil" }; }
  const core_collection__MapNil = core_collection__Map__MapNil;
  function core_collection__Map__MapCons(a0, a1, a2) { return { tag: "MapCons", 0: a0, 1: a1, 2: a2 }; }
  const core_collection__MapCons = core_collection__Map__MapCons;
  function core_collection__mapEmpty() {
    return core_collection__MapNil();
  }
  function core_collection__size$Map(m) {
    return (() => {
  const __s54 = m;
  if ((__s54.tag === "MapNil")) {  return 0; }
  if ((__s54.tag === "MapCons")) { const t = __s54[2];  return (core_collection__size$Map(t) + 1); }
  return null;
})();
  }
  function core_collection__isEmpty$Map(m) {
    return (() => {
  const __s55 = m;
  if ((__s55.tag === "MapNil")) {  return true; }
  if ((__s55.tag === "MapCons")) {  return false; }
  return null;
})();
  }
  function core_collection__get$Map(m, k) {
    return (() => {
  const __s56 = m;
  if ((__s56.tag === "MapNil")) {  return None(); }
  if ((__s56.tag === "MapCons")) { const k0 = __s56[0]; const v0 = __s56[1]; const t = __s56[2];  return (__eq(k0, k) ? (() => {
  return Some(v0);
})() : (() => {
  return core_collection__get$Map(t, k);
})()); }
  return null;
})();
  }
  function core_collection__containsKey(m, k) {
    return (() => {
  const __s57 = m;
  if ((__s57.tag === "MapNil")) {  return false; }
  if ((__s57.tag === "MapCons")) { const k0 = __s57[0]; const t = __s57[2];  return (__eq(k0, k) ? (() => {
  return true;
})() : (() => {
  return core_collection__containsKey(t, k);
})()); }
  return null;
})();
  }
  function core_collection__keys(m) {
    return (() => {
  const __s58 = m;
  if ((__s58.tag === "MapNil")) {  return []; }
  if ((__s58.tag === "MapCons")) { const k0 = __s58[0]; const t = __s58[2];  return [k0, ...(core_collection__keys(t))]; }
  return null;
})();
  }
  function core_collection__values(m) {
    return (() => {
  const __s59 = m;
  if ((__s59.tag === "MapNil")) {  return []; }
  if ((__s59.tag === "MapCons")) { const v0 = __s59[1]; const t = __s59[2];  return [v0, ...(core_collection__values(t))]; }
  return null;
})();
  }
  function core_collection__put(m, k, v) {
    return core_collection__MapCons(k, v, core_collection__remove$Map(m, k));
  }
  function core_collection__remove$Map(m, k) {
    return (() => {
  const __s60 = m;
  if ((__s60.tag === "MapNil")) {  return core_collection__MapNil(); }
  if ((__s60.tag === "MapCons")) { const k0 = __s60[0]; const v0 = __s60[1]; const t = __s60[2];  return (__eq(k0, k) ? (() => {
  return t;
})() : (() => {
  return core_collection__MapCons(k0, v0, core_collection__remove$Map(t, k));
})()); }
  return null;
})();
  }
  function core_collection__filter$Map(m, p) {
    return (() => {
  const __s61 = m;
  if ((__s61.tag === "MapNil")) {  return core_collection__MapNil(); }
  if ((__s61.tag === "MapCons")) { const k0 = __s61[0]; const v0 = __s61[1]; const t = __s61[2];  return (p(v0) ? (() => {
  return core_collection__MapCons(k0, v0, core_collection__filter$Map(t, p));
})() : (() => {
  return core_collection__filter$Map(t, p);
})()); }
  return null;
})();
  }
  function core_collection__mapValues(m, f) {
    return (() => {
  const __s62 = m;
  if ((__s62.tag === "MapNil")) {  return core_collection__MapNil(); }
  if ((__s62.tag === "MapCons")) { const k0 = __s62[0]; const v0 = __s62[1]; const t = __s62[2];  return core_collection__MapCons(k0, f(v0), core_collection__mapValues(t, f)); }
  return null;
})();
  }
  function core_collection__mapKeys(m, f) {
    return (() => {
  const __s63 = m;
  if ((__s63.tag === "MapNil")) {  return core_collection__MapNil(); }
  if ((__s63.tag === "MapCons")) { const k0 = __s63[0]; const v0 = __s63[1]; const t = __s63[2];  return core_collection__put(core_collection__mapKeys(t, f), f(k0), v0); }
  return null;
})();
  }
  function core_collection__merge(m1, m2) {
    return (() => {
  const __s64 = m2;
  if ((__s64.tag === "MapNil")) {  return m1; }
  if ((__s64.tag === "MapCons")) { const k0 = __s64[0]; const v0 = __s64[1]; const t = __s64[2];  return core_collection__merge(core_collection__put(m1, k0, v0), t); }
  return null;
})();
  }
  function core_collection__toList$Map(m) {
    return core_collection__values(m);
  }
  function core_collection__Optional__Some(a0) { return { tag: "Some", 0: a0 }; }
  const core_collection__Some = core_collection__Optional__Some;
  function core_collection__Optional__None() { return { tag: "None" }; }
  const core_collection__None = core_collection__Optional__None;
  const dict_core_collection_Functor_Optional = {
    map: (d, fa, f) => (() => {
  const __s65 = fa;
  if ((__s65.tag === "Some")) { const v = __s65[0];  return Some(f(v)); }
  if ((__s65.tag === "None")) {  return None(); }
  return null;
})()
  };
  const dict_core_collection_Foldable_Optional = {
    fold: (d, fa, init, f) => (() => {
  const __s66 = fa;
  if ((__s66.tag === "Some")) { const v = __s66[0];  return f(init, v); }
  if ((__s66.tag === "None")) {  return init; }
  return null;
})()
  };
  const dict_core_collection_Monad_Optional = {
    pure: (d, x) => Some(x),
    flatMap: (d, fa, f) => (() => {
  const __s67 = fa;
  if ((__s67.tag === "Some")) { const v = __s67[0];  return f(v); }
  if ((__s67.tag === "None")) {  return None(); }
  return null;
})()
  };
  function core_collection__isSome(o) {
    return (() => {
  const __s68 = o;
  if ((__s68.tag === "Some")) {  return true; }
  if ((__s68.tag === "None")) {  return false; }
  return null;
})();
  }
  function core_collection__isNone(o) {
    return (() => {
  const __s69 = o;
  if ((__s69.tag === "Some")) {  return false; }
  if ((__s69.tag === "None")) {  return true; }
  return null;
})();
  }
  function core_collection__getOrElse(o, d) {
    return (() => {
  const __s70 = o;
  if ((__s70.tag === "Some")) { const v = __s70[0];  return v; }
  if ((__s70.tag === "None")) {  return d; }
  return null;
})();
  }
  function core_collection__orElse(o, d) {
    return (() => {
  const __s71 = o;
  if ((__s71.tag === "Some")) {  return o; }
  if ((__s71.tag === "None")) {  return d; }
  return null;
})();
  }
  function core_collection__filter$Optional(o, p) {
    return (() => {
  const __s72 = o;
  if ((__s72.tag === "Some")) { const v = __s72[0];  return (p(v) ? (() => {
  return Some(v);
})() : (() => {
  return None();
})()); }
  if ((__s72.tag === "None")) {  return None(); }
  return null;
})();
  }
  function core_collection__toResult(o, e) {
    return (() => {
  const __s73 = o;
  if ((__s73.tag === "Some")) { const v = __s73[0];  return core_collection__Ok(v); }
  if ((__s73.tag === "None")) {  return core_collection__Err(e); }
  return null;
})();
  }
  function core_collection__toList$Optional(o) {
    return (() => {
  const __s74 = o;
  if ((__s74.tag === "Some")) { const v = __s74[0];  return [v, ...([])]; }
  if ((__s74.tag === "None")) {  return []; }
  return null;
})();
  }
  function core_collection__Result__Ok(a0) { return { tag: "Ok", 0: a0 }; }
  const core_collection__Ok = core_collection__Result__Ok;
  function core_collection__Result__Err(a0) { return { tag: "Err", 0: a0 }; }
  const core_collection__Err = core_collection__Result__Err;
  function core_collection__isOk(r) {
    return (() => {
  const __s75 = r;
  if ((__s75.tag === "Ok")) {  return true; }
  if ((__s75.tag === "Err")) {  return false; }
  return null;
})();
  }
  function core_collection__isErr(r) {
    return (() => {
  const __s76 = r;
  if ((__s76.tag === "Ok")) {  return false; }
  if ((__s76.tag === "Err")) {  return true; }
  return null;
})();
  }
  function core_collection__unwrapOr(r, d) {
    return (() => {
  const __s77 = r;
  if ((__s77.tag === "Ok")) { const v = __s77[0];  return v; }
  if ((__s77.tag === "Err")) {  return d; }
  return null;
})();
  }
  function core_collection__mapOk(r, f) {
    return (() => {
  const __s78 = r;
  if ((__s78.tag === "Ok")) { const v = __s78[0];  return core_collection__Ok(f(v)); }
  if ((__s78.tag === "Err")) { const e = __s78[0];  return core_collection__Err(e); }
  return null;
})();
  }
  function core_collection__mapErr(r, f) {
    return (() => {
  const __s79 = r;
  if ((__s79.tag === "Ok")) { const v = __s79[0];  return core_collection__Ok(v); }
  if ((__s79.tag === "Err")) { const e = __s79[0];  return core_collection__Err(f(e)); }
  return null;
})();
  }
  function core_collection__flatMapOk(r, f) {
    return (() => {
  const __s80 = r;
  if ((__s80.tag === "Ok")) { const v = __s80[0];  return f(v); }
  if ((__s80.tag === "Err")) { const e = __s80[0];  return core_collection__Err(e); }
  return null;
})();
  }
  function core_collection__toList$Result(r) {
    return (() => {
  const __s81 = r;
  if ((__s81.tag === "Ok")) { const v = __s81[0];  return [v, ...([])]; }
  if ((__s81.tag === "Err")) {  return []; }
  return null;
})();
  }
  function core_collection__Set__SetNil() { return { tag: "SetNil" }; }
  const core_collection__SetNil = core_collection__Set__SetNil;
  function core_collection__Set__SetCons(a0, a1) { return { tag: "SetCons", 0: a0, 1: a1 }; }
  const core_collection__SetCons = core_collection__Set__SetCons;
  const dict_core_collection_Functor_Set = {
    map: (d, fa, f) => (() => {
  const __s82 = fa;
  if ((__s82.tag === "SetNil")) {  return core_collection__SetNil(); }
  if ((__s82.tag === "SetCons")) { const h = __s82[0]; const t = __s82[1];  return core_collection__add(dict_core_collection_Functor_Set.map(dict_core_collection_Functor_Set, t, f), f(h)); }
  return null;
})()
  };
  const dict_core_collection_Foldable_Set = {
    fold: (d, fa, init, f) => (() => {
  const __s83 = fa;
  if ((__s83.tag === "SetNil")) {  return init; }
  if ((__s83.tag === "SetCons")) { const h = __s83[0]; const t = __s83[1];  return dict_core_collection_Foldable_Set.fold(dict_core_collection_Foldable_Set, t, f(init, h), f); }
  return null;
})()
  };
  function core_collection__setEmpty() {
    return core_collection__SetNil();
  }
  function core_collection__setOf(items) {
    return core_collection__SetNil();
  }
  function core_collection__add(s, x) {
    return (core_collection__contains$Set(s, x) ? (() => {
  return s;
})() : (() => {
  return core_collection__SetCons(x, s);
})());
  }
  function core_collection__remove$Set(s, x) {
    return (() => {
  const __s84 = s;
  if ((__s84.tag === "SetNil")) {  return core_collection__SetNil(); }
  if ((__s84.tag === "SetCons")) { const h = __s84[0]; const t = __s84[1];  return (__eq(h, x) ? (() => {
  return t;
})() : (() => {
  return core_collection__SetCons(h, core_collection__remove$Set(t, x));
})()); }
  return null;
})();
  }
  function core_collection__size$Set(s) {
    return (() => {
  const __s85 = s;
  if ((__s85.tag === "SetNil")) {  return 0; }
  if ((__s85.tag === "SetCons")) { const t = __s85[1];  return (core_collection__size$Set(t) + 1); }
  return null;
})();
  }
  function core_collection__isEmpty$Set(s) {
    return (() => {
  const __s86 = s;
  if ((__s86.tag === "SetNil")) {  return true; }
  if ((__s86.tag === "SetCons")) {  return false; }
  return null;
})();
  }
  function core_collection__contains$Set(s, x) {
    return (() => {
  const __s87 = s;
  if ((__s87.tag === "SetNil")) {  return false; }
  if ((__s87.tag === "SetCons")) { const h = __s87[0]; const t = __s87[1];  return (__eq(h, x) ? (() => {
  return true;
})() : (() => {
  return core_collection__contains$Set(t, x);
})()); }
  return null;
})();
  }
  function core_collection__count$Set(s, p) {
    return dict_core_collection_Foldable_Set.fold(dict_core_collection_Foldable_Set, s, 0, (acc, x) => (p(x) ? (() => {
  return (acc + 1);
})() : (() => {
  return acc;
})()));
  }
  function core_collection__forEach$Set(s, f) {
    return (() => {
  const __s88 = s;
  if ((__s88.tag === "SetNil")) {  return null; }
  if ((__s88.tag === "SetCons")) { const h = __s88[0]; const t = __s88[1];  return (() => {
  f(h);
  return core_collection__forEach$Set(t, f);
})(); }
  return null;
})();
  }
  function core_collection__union(s1, s2) {
    return (() => {
  const __s89 = s1;
  if ((__s89.tag === "SetNil")) {  return s2; }
  if ((__s89.tag === "SetCons")) { const h = __s89[0]; const t = __s89[1];  return (core_collection__contains$Set(s2, h) ? (() => {
  return core_collection__union(t, s2);
})() : (() => {
  return core_collection__SetCons(h, core_collection__union(t, s2));
})()); }
  return null;
})();
  }
  function core_collection__intersect(s1, s2) {
    return (() => {
  const __s90 = s1;
  if ((__s90.tag === "SetNil")) {  return core_collection__SetNil(); }
  if ((__s90.tag === "SetCons")) { const h = __s90[0]; const t = __s90[1];  return (core_collection__contains$Set(s2, h) ? (() => {
  return core_collection__SetCons(h, core_collection__intersect(t, s2));
})() : (() => {
  return core_collection__intersect(t, s2);
})()); }
  return null;
})();
  }
  function core_collection__filter$Set(s, p) {
    return (() => {
  const __s91 = s;
  if ((__s91.tag === "SetNil")) {  return core_collection__SetNil(); }
  if ((__s91.tag === "SetCons")) { const h = __s91[0]; const t = __s91[1];  return (p(h) ? (() => {
  return core_collection__SetCons(h, core_collection__filter$Set(t, p));
})() : (() => {
  return core_collection__filter$Set(t, p);
})()); }
  return null;
})();
  }
  function core_collection__flatMap(s, f) {
    return (() => {
  const __s92 = s;
  if ((__s92.tag === "SetNil")) {  return core_collection__SetNil(); }
  if ((__s92.tag === "SetCons")) { const h = __s92[0]; const t = __s92[1];  return core_collection__union(f(h), core_collection__flatMap(t, f)); }
  return null;
})();
  }
  function core_collection__toList$Set(s) {
    return (() => {
  const __s93 = s;
  if ((__s93.tag === "SetNil")) {  return []; }
  if ((__s93.tag === "SetCons")) { const h = __s93[0]; const t = __s93[1];  return [h, ...(core_collection__toList$Set(t))]; }
  return null;
})();
  }
  const dict_core_collection_Tuple_EmptyTuple = {
    size: (d, __self) => 0,
    isEmpty: (d, __self) => true
  };
  const dict_core_collection_Tuple_SingleTuple = {
    size: (d, __self) => 1,
    isEmpty: (d, __self) => false
  };
  const dict_core_collection_Tuple__a__b_ = {
    size: (d, __self) => 2,
    isEmpty: (d, __self) => false
  };
  const dict_core_collection_Tuple__a__b__c_ = {
    size: (d, __self) => 3,
    isEmpty: (d, __self) => false
  };
  const dict_core_collection_Tuple__a__b__c__d_ = {
    size: (d, __self) => 4,
    isEmpty: (d, __self) => false
  };
  const dict_core_collection_Tuple__a__b__c__d__e_ = {
    size: (d, __self) => 5,
    isEmpty: (d, __self) => false
  };
  const dict_core_collection_Tuple__a__b__c__d__e__f_ = {
    size: (d, __self) => 6,
    isEmpty: (d, __self) => false
  };
  const dict_core_collection_Tuple__a__b__c__d__e__f__g_ = {
    size: (d, __self) => 7,
    isEmpty: (d, __self) => false
  };
  const dict_core_collection_Tuple__a__b__c__d__e__f__g__h_ = {
    size: (d, __self) => 8,
    isEmpty: (d, __self) => false
  };
  const dict_core_collection_Tuple__a__b__c__d__e__f__g__h__i_ = {
    size: (d, __self) => 9,
    isEmpty: (d, __self) => false
  };
  const dict_core_collection_Tuple__a__b__c__d__e__f__g__h__i__j_ = {
    size: (d, __self) => 10,
    isEmpty: (d, __self) => false
  };
  function core_encoding__base64Encode(s) {
    return (() => { throw new Error('panic: unreachable') })();
  }
  function core_encoding__base64Decode(s) {
    return (() => { throw new Error('panic: unreachable') })();
  }
  function core_encoding__hexEncode(s) {
    return (() => { throw new Error('panic: unreachable') })();
  }
  function core_encoding__hexDecode(s) {
    return (() => { throw new Error('panic: unreachable') })();
  }
  function core_math__sqrt(x) {
    return Math.pow(x, 0.5);
  }
  function core_math__gcd(a, b) {
    return (__eq(b, 0) ? (() => {
  return a;
})() : (() => {
  const r = core_math__gcd(b, (a % b));
  return r;
})());
  }
  function core_math__lcm(a, b) {
    return (__eq(b, 0) ? (() => {
  return 0;
})() : (() => {
  const r = core_math__gcd(a, b);
  return (a * (b / r));
})());
  }
  function core_math__isEven(n) {
    return __eq((n % 2), 0);
  }
  function core_math__isOdd(n) {
    return (!__eq((n % 2), 0));
  }
  function core_math__sq(n) {
    return (n * n);
  }
  function core_math__cube(n) {
    return ((n * n) * n);
  }
  function core_math__summation(a, b) {
    return (core_collection__range(a, b)).reduce((a, b) => a + b, 0);
  }
  const dict_core_number_Num_Rat = {
  };
  function core_random__randNat(n) {
    return Math.floor((Math.random() * Number(n)));
  }
  function core_real__ratOr(s, fallback) {
    return (() => {
  const __s94 = (() => { const v = Number(String(s)); return Number.isNaN(v) ? None() : Some(v); })();
  if ((__s94.tag === "Some")) { const r = __s94[0];  return r; }
  if ((__s94.tag === "None")) {  return fallback; }
  return null;
})();
  }
  function core_regex__regexMatch(s, pattern) {
    return (() => { throw new Error('panic: unreachable') })();
  }
  function core_regex__regexFind(s, pattern) {
    return (() => { throw new Error('panic: unreachable') })();
  }
  function core_regex__regexSplit(s, pattern) {
    return (() => { throw new Error('panic: unreachable') })();
  }
  function core_regex__regexReplace(s, pattern, repl) {
    return (() => { throw new Error('panic: unreachable') })();
  }
  function core_time__diffMs(a, b) {
    return (b - a);
  }
  main();
})();
