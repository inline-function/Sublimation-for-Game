// tetris-logic-test.js —— 纯逻辑回归（Node 侧断言）
// 同步 app/tetris-logic.subl -> test/logic-src/，以 node 目标编译后运行，
// 断言覆盖：碰撞判定、行消除（含重力下落）、计分分档、升级触发、结局判定、旋转表、格子枚举。
// 用法：node test/tetris-logic-test.js
"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const G = path.join(__dirname, "..");
const JAVA = "F:\\jdk-17.0.13.11-hotspot\\bin\\java.exe";
const JAR = "F:\\KotlinProject\\Sublimation\\release\\sublimation.jar";
const dir = path.join(G, "test", "logic-src");
const logicSrc = path.join(G, "app", "tetris-logic.subl");
const appCore = path.join(G, "app", "core");
const coreJunction = path.join(dir, "core");
const outJs = path.join(dir, "out.js");

let failed = 0;
function step(name, cond, detail) {
    if (cond) console.log("  PASS " + name);
    else { failed++; console.log("  FAIL " + name + (detail ? " :: " + detail : "")); }
}

// 1) 同步纯逻辑文件（app/ 为唯一真源）
fs.writeFileSync(path.join(dir, "tetris-logic.subl"), fs.readFileSync(logicSrc, "utf8"));
step("同步 app/tetris-logic.subl 到 test/logic-src", fs.readFileSync(path.join(dir, "tetris-logic.subl"), "utf8") === fs.readFileSync(logicSrc, "utf8"));
// core 装配点（junction）：缺失则重建
if (!fs.existsSync(coreJunction)) { fs.symlinkSync(appCore, coreJunction, "junction"); }
step("core 标准库 junction 就位", fs.existsSync(coreJunction));

// 2) 以 node 目标编译
let compileErr = "";
let exitCode = 0;
try {
    const out = cp.execFileSync(JAVA, ["-jar", JAR, "compile", "test\\logic-src", "-o", "test\\logic-src\\out.js"],
        { cwd: G, encoding: "utf8", timeout: 300000, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 16 * 1024 * 1024 });
    compileErr = String(out);
} catch (e) {
    exitCode = (e && e.status) || -1;
    compileErr = String((e && (e.stdout || "")) + (e && (e.stderr || "")) + e);
}
step("compile（node 目标）exit=0", exitCode === 0, "exit=" + exitCode + " :: " + compileErr.replace(/\s+/g, " ").slice(0, 240));
step("产物 out.js 生成", fs.existsSync(outJs) && fs.statSync(outJs).size > 1000, "");

// 3) 运行断言
let runOut = "";
let runExit = 0;
try {
    runOut = cp.execFileSync(process.execPath, [outJs], { cwd: dir, encoding: "utf8", timeout: 120000, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 16 * 1024 * 1024 });
} catch (e) {
    runExit = (e && e.status) || -1;
    runOut = String((e && (e.stdout || "")) + (e && (e.stderr || "")));
}
const lines = runOut.split(/\r?\n/).filter((l) => /^(PASS|FAIL) /.test(l));
const passN = lines.filter((l) => l.indexOf("PASS ") === 0).length;
const failN = lines.filter((l) => l.indexOf("FAIL ") === 0).length;
step("node 运行 exit=0", runExit === 0, "exit=" + runExit + " :: " + runOut.split(/\r?\n/).slice(-3).join(" | ").slice(0, 240));
step("断言全过（含碰撞/消除/计分/升级/结局/旋转表/枚举）", failN === 0 && passN > 0, "pass=" + passN + " fail=" + failN);
step("LOGIC-DONE 收尾标记", runOut.indexOf("LOGIC-DONE") >= 0, "");
if (failN > 0) console.log(lines.filter((l) => l.indexOf("FAIL ") === 0).slice(0, 12).map((l) => "    " + l).join("\n"));

console.log(failed === 0
    ? "LOGIC-TEST: ALL PASSED (" + passN + " 项纯逻辑断言：碰撞/消除重力/计分/升级/结局/旋转/枚举)"
    : "LOGIC-TEST: " + failed + " FAILED");
if (failed > 0) process.exitCode = 1;
