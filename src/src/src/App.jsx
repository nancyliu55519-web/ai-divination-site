import React, { useState, useMemo, useRef } from "react";

/* ---------------- 数据配置 ---------------- */

const SYSTEMS = [
  { id: "liuren", name: "小六壬", sub: "掐指速断", glyph: "六" },
  { id: "bazi", name: "八字", sub: "命理推演", glyph: "命" },
  { id: "qimen", name: "奇门遁甲", sub: "时空布局", glyph: "奇" },
  { id: "meihua", name: "梅花易数", sub: "数理起卦", glyph: "梅" },
  { id: "liuyao", name: "六爻", sub: "摇钱成卦", glyph: "爻" },
  { id: "tarot", name: "塔罗", sub: "抽牌问心", glyph: "塔" },
];

const MAJOR_ARCANA = [
  "愚者", "魔术师", "女祭司", "皇后", "皇帝", "教皇", "恋人", "战车",
  "力量", "隐士", "命运之轮", "正义", "倒吊人", "死神", "节制",
  "恶魔", "高塔", "星星", "月亮", "太阳", "审判", "世界",
];

const COLORS = {
  ink: "#12151A",
  inkDeep: "#0B0D10",
  paper: "#E9E1CC",
  paperDim: "#DAD0B4",
  vermillion: "#A6403C",
  jade: "#6C8F72",
  gold: "#B8934F",
  inkText: "#2A251E",
};

/* ---------------- 干支基础算法（确定性计算，不依赖AI） ---------------- */

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const JIEQI_BOUNDS = [
  { m: 2, d: 4 },
  { m: 3, d: 6 },
  { m: 4, d: 5 },
  { m: 5, d: 6 },
  { m: 6, d: 6 },
  { m: 7, d: 7 },
  { m: 8, d: 8 },
  { m: 9, d: 8 },
  { m: 10, d: 8 },
  { m: 11, d: 7 },
  { m: 12, d: 7 },
  { m: 1, d: 6 },
];

function mod(n, m) {
  return ((n % m) + m) % m;
}

function getDayGanZhi(date) {
  const ref = Date.UTC(1900, 0, 31, 12);
  const cur = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const dayOffset = Math.round((cur - ref) / 86400000);
  const stemIdx = mod(dayOffset, 10);
  const branchIdx = mod(dayOffset + 4, 12);
  return { stemIdx, branchIdx, text: STEMS[stemIdx] + BRANCHES[branchIdx] };
}

function getHourGanZhi(dayStemIdx, hour) {
  const branchIdx = mod(Math.floor((hour + 1) / 2), 12);
  const startStemIdx = mod(mod(dayStemIdx, 5) * 2, 10);
  const stemIdx = mod(startStemIdx + branchIdx, 10);
  return { stemIdx, branchIdx, text: STEMS[stemIdx] + BRANCHES[branchIdx] };
}

function getSolarMonthIndex(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const bounds = JIEQI_BOUNDS.map((b, i) => {
    const year = i === 11 ? y + 1 : y;
    return { idx: i, ts: Date.UTC(year, b.m - 1, b.d) };
  });
  const cur = Date.UTC(y, m - 1, d);
  const prevChou = Date.UTC(y, 0, JIEQI_BOUNDS[11].d);
  let monthIdx;
  if (cur < prevChou) {
    monthIdx = 10;
  } else if (cur < bounds[0].ts) {
    monthIdx = 11;
  } else {
    monthIdx = 0;
    for (let i = bounds.length - 1; i >= 0; i--) {
      if (cur >= bounds[i].ts) {
        monthIdx = i;
        break;
      }
    }
  }
  return monthIdx;
}

function computeBazi(date) {
  const monthIdx = getSolarMonthIndex(date);
  const lichun = new Date(date.getFullYear(), JIEQI_BOUNDS[0].m - 1, JIEQI_BOUNDS[0].d);
  let baziYear = date.getFullYear();
  if (date < lichun) baziYear -= 1;

  const yearStemIdx = mod(baziYear - 4, 10);
  const yearBranchIdx = mod(baziYear - 4, 12);
  const yearGZ = STEMS[yearStemIdx] + BRANCHES[yearBranchIdx];

  const monthStartStem = [2, 4, 6, 8, 0][mod(yearStemIdx, 5)];
  const monthStemIdx = mod(monthStartStem + monthIdx, 10);
  const monthBranchIdx = mod(monthIdx + 2, 12);
  const monthGZ = STEMS[monthStemIdx] + BRANCHES[monthBranchIdx];

  const day = getDayGanZhi(date);
  const hour = getHourGanZhi(day.stemIdx, date.getHours());

  return {
    year: yearGZ,
    month: monthGZ,
    day: day.text,
    hour: hour.text,
    dayStemIdx: day.stemIdx,
  };
}

// ---------------- 奇门遁甲：局数精确计算 ----------------
const JIEQI_24 = [
  { name: "小寒", m: 1, d: 6 },
  { name: "大寒", m: 1, d: 20 },
  { name: "立春", m: 2, d: 4 },
  { name: "雨水", m: 2, d: 19 },
  { name: "惊蛰", m: 3, d: 6 },
  { name: "春分", m: 3, d: 21 },
  { name: "清明", m: 4, d: 5 },
  { name: "谷雨", m: 4, d: 20 },
  { name: "立夏", m: 5, d: 6 },
  { name: "小满", m: 5, d: 21 },
  { name: "芒种", m: 6, d: 6 },
  { name: "夏至", m: 6, d: 21 },
  { name: "小暑", m: 7, d: 7 },
  { name: "大暑", m: 7, d: 23 },
  { name: "立秋", m: 8, d: 8 },
  { name: "处暑", m: 8, d: 23 },
  { name: "白露", m: 9, d: 8 },
  { name: "秋分", m: 9, d: 23 },
  { name: "寒露", m: 10, d: 8 },
  { name: "霜降", m: 10, d: 23 },
  { name: "立冬", m: 11, d: 7 },
  { name: "小雪", m: 11, d: 22 },
  { name: "大雪", m: 12, d: 7 },
  { name: "冬至", m: 12, d: 22 },
];

const JU_TABLE = {
  冬至: [1, 7, 4], 小寒: [2, 8, 5], 大寒: [3, 9, 6], 立春: [8, 5, 2],
  雨水: [9, 6, 3], 惊蛰: [1, 7, 4], 春分: [3, 9, 6], 清明: [4, 1, 7],
  谷雨: [5, 2, 8], 立夏: [4, 1, 7], 小满: [5, 2, 8], 芒种: [6, 3, 9],
  夏至: [9, 3, 6], 小暑: [8, 2, 5], 大暑: [7, 1, 4], 立秋: [2, 5, 8],
  处暑: [1, 4, 7], 白露: [9, 3, 6], 秋分: [7, 1, 4], 寒露: [6, 9, 3],
  霜降: [5, 8, 2], 立冬: [6, 9, 3], 小雪: [5, 8, 2], 大雪: [4, 7, 1],
};

const YANG_TERMS = new Set([
  "冬至", "小寒", "大寒", "立春", "雨水", "惊蛰",
  "春分", "清明", "谷雨", "立夏", "小满", "芒种",
]);

const QIMEN_CLASSICS = ["《奇门遁甲统宗大全》", "《遁甲演义》（明·程道生）", "《御定奇门宝鉴》", "《开门之悟》（张志春）"];
const FOUNDATION_CLASSICS = ["《五行大义》", "《天干地支》", "《周易本义》", "《阴阳五行解密》"];

function getJieqiPeriod(date) {
  const y = date.getFullYear();
  const points = JIEQI_24.map((t) => ({ name: t.name, ts: Date.UTC(y, t.m - 1, t.d) }));
  const prevDongzhi = { name: "冬至", ts: Date.UTC(y - 1, 11, 22) };
  const nextXiaohan = { name: "小寒", ts: Date.UTC(y + 1, 0, 6) };
  const all = [prevDongzhi, ...points, nextXiaohan];
  const cur = Date.UTC(y, date.getMonth(), date.getDate());
  let period = prevDongzhi.name;
  for (let i = all.length - 1; i >= 0; i--) {
    if (cur >= all[i].ts) {
      period = all[i].name;
      break;
    }
  }
  return period;
}

function getYuanIndex(date) {
  for (let back = 0; back < 10; back++) {
    const d = new Date(date);
    d.setDate(d.getDate() - back);
    const { stemIdx, branchIdx } = getDayGanZhi(d);
    if (stemIdx === 0 || stemIdx === 5) {
      const r = mod(branchIdx, 3);
      if (r === 0) return 0;
      if (r === 2) return 1;
      return 2;
    }
  }
  return 0;
}

function computeQimenJu(date) {
  const period = getJieqiPeriod(date);
  const dunType = YANG_TERMS.has(period) ? "阳遁" : "阴遁";
  const yuanIdx = getYuanIndex(date);
  const yuanName = ["上元", "中元", "下元"][yuanIdx];
  const ju = JU_TABLE[period][yuanIdx];
  return { period, dunType, yuanName, ju };
}

const PALACE_NAMES = { 1: "坎", 2: "坤", 3: "震", 4: "巽", 5: "中", 6: "乾", 7: "兑", 8: "艮", 9: "离" };
const DIPAN_STARS = { 1: "天蓬", 2: "天芮", 3: "天冲", 4: "天辅", 5: "天禽", 6: "天心", 7: "天柱", 8: "天任", 9: "天英" };
const DIPAN_DOORS = { 1: "休门", 2: "死门", 3: "伤门", 4: "杜门", 6: "开门", 7: "惊门", 8: "生门", 9: "景门" };
const SIX_YI_SAN_QI = ["戊", "己", "庚", "辛", "壬", "癸", "丁", "丙", "乙"];
const XUN_SHOU_TO_YI = { 子: "戊", 戌: "己", 申: "庚", 午: "辛", 辰: "壬", 寅: "癸" };

function wrapPalace(p) {
  return mod(p - 1, 9) + 1;
}

function layoutDiPan(dunType, ju) {
  const dir = dunType === "阳遁" ? 1 : -1;
  const stemToPalace = {};
  const palaceToStem = {};
  for (let i = 0; i < 9; i++) {
    const p = wrapPalace(ju + dir * i);
    const stem = SIX_YI_SAN_QI[i];
    stemToPalace[stem] = p;
    palaceToStem[p] = stem;
  }
  return { stemToPalace, palaceToStem };
}

function getHourInfo(date) {
  const ref = Date.UTC(1900, 0, 31, 12);
  const cur = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const dayOffset = Math.round((cur - ref) / 86400000);
  const hourBranchIdx = mod(Math.floor((date.getHours() + 1) / 2), 12);
  const idx = mod(dayOffset * 12 + hourBranchIdx, 60);
  const stemIdx = mod(idx, 10);
  const branchIdx = mod(idx, 12);
  const xunShouIdx = idx - stemIdx;
  const xunShouBranchIdx = mod(xunShouIdx, 12);
  return {
    stem: STEMS[stemIdx],
    branch: BRANCHES[branchIdx],
    text: STEMS[stemIdx] + BRANCHES[branchIdx],
    xunShouBranch: BRANCHES[xunShouBranchIdx],
    stepsInXun: stemIdx,
  };
}

function computeQimenFull(date) {
  const juInfo = computeQimenJu(date);
  const dir = juInfo.dunType === "阳遁" ? 1 : -1;
  const { stemToPalace } = layoutDiPan(juInfo.dunType, juInfo.ju);
  const hourInfo = getHourInfo(date);

  const xunYi = XUN_SHOU_TO_YI[hourInfo.xunShouBranch];
  const baseGong = stemToPalace[xunYi];
  const zhiFuStar = DIPAN_STARS[baseGong];
  const zhiShiDoor = DIPAN_DOORS[baseGong] || DIPAN_DOORS[2];

  const zhiFuGong = hourInfo.stem === "甲" ? baseGong : stemToPalace[hourInfo.stem];

  let zhiShiGong = baseGong;
  for (let s = 0; s < hourInfo.stepsInXun; s++) zhiShiGong = wrapPalace(zhiShiGong + dir);
  const zhiShiDisplayGong = zhiShiGong === 5 ? 2 : zhiShiGong;

  return {
    ...juInfo,
    dir,
    diPan: stemToPalace,
    hourInfo,
    xunYi,
    baseGong,
    zhiFuStar,
    zhiFuGong,
    zhiShiDoor,
    zhiShiGong: zhiShiDisplayGong,
  };
}

const SIX_PALACES = ["大安", "留连", "速喜", "赤口", "小吉", "空亡"];

function computeXiaoLiuRen(lunarMonth, lunarDay, hour) {
  const hourNum = mod(Math.floor((hour + 1) / 2), 12) + 1;
  let idx = mod(lunarMonth - 1, 6);
  idx = mod(idx + (lunarDay - 1), 6);
  idx = mod(idx + (hourNum - 1), 6);
  return { palace: SIX_PALACES[idx], hourNum };
}

/* ---------------- 工具函数 ---------------- */

function tossLine() {
  let sum = 0;
  for (let i = 0; i < 3; i++) sum += Math.random() < 0.5 ? 3 : 2;
  const map = { 6: "老阴（变）", 7: "少阳", 8: "少阴", 9: "老阳（变）" };
  return { value: sum, label: map[sum] };
}

function castLiuYao() {
  const lines = [];
  for (let i = 0; i < 6; i++) lines.push(tossLine());
  return lines;
}

function drawTarot(count) {
  const pool = [...MAJOR_ARCANA];
  const drawn = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const card = pool.splice(idx, 1)[0];
    const reversed = Math.random() < 0.5;
    drawn.push({ card, reversed });
  }
  return drawn;
}

function buildPrompt(systemId, question, extra) {
  const header = `你是一位造诣深厚、行文克制的传统术数执业者。用户的提问："${question || "（未特别说明，请给出整体运势解读）"}"\n\n`;
  const footer = `\n\n要求：\n- 用中文作答，语气沉稳、专业、不夸张，不使用"绝对""一定"等断言词。\n- 先给出简要的起局/排盘要点，再给出解读，最后给出一条实际可执行的建议。\n- 全文控制在 400-600 字。\n- 不涉及赌博、投机下注类的直接指向性判断；如问题涉及此类，请转向理性提示。`;

  switch (systemId) {
    case "liuren":
      return (
        header +
        `已按农历 ${extra.lunarMonth} 月 ${extra.lunarDay} 日、第${extra.hourNum}个时辰（子时为1）掐指起课，落于「${extra.palace}」宫。请直接依据「${extra.palace}」宫的传统断法解读，不要重新起课或改变宫位。` +
        footer
      );
    case "bazi":
      return (
        header +
        `已排定四柱八字：年柱${extra.pillars.year}　月柱${extra.pillars.month}　日柱${extra.pillars.day}　时柱${extra.pillars.hour}。请直接基于这四柱指出日主五行、格局倾向，并结合提问给出解读，不要重新排盘或更改干支。` +
        footer
      );
    case "qimen":
      return (
        header +
        `已精确排出地盘与值符值使，以下数据均为算法算出，请直接使用，不要重新排盘：\n` +
        `局：${extra.dunType}${extra.ju}局（节气：${extra.period}，${extra.yuanName}）\n` +
        `地盘布局（宫位数字对应${Object.entries(PALACE_NAMES).map(([k, v]) => `${k}=${v}`).join("、")}）：` +
        `${Object.entries(extra.diPan).map(([stem, gong]) => `${stem}在${gong}宫(${PALACE_NAMES[gong]})`).join("、")}\n` +
        `当前时辰：${extra.hourInfo.text}（旬首：${extra.xunYi}所在${extra.baseGong}宫）\n` +
        `值符星：${extra.zhiFuStar}，飞临${extra.zhiFuGong}宫(${PALACE_NAMES[extra.zhiFuGong]})\n` +
        `值使门：${extra.zhiShiDoor}，行至${extra.zhiShiGong}宫(${PALACE_NAMES[extra.zhiShiGong]})\n` +
        `请你据此补齐其余七星、七门的位置：从值符星/值使门所在宫开始，按${extra.dunType === "阳遁" ? "顺时针(1→9)" : "逆时针(9→1)"}方向，沿九星固定序（天蓬天芮天冲天辅天禽天心天柱天任天英）和八门固定序（休死伤杜景死惊开中对应门序）依次排开，中五宫寄坤二宫。再结合提问给出解读。\n\n` +
        `断法与术语请以 ${QIMEN_CLASSICS.join("、")} 所载传统体系为准，可参考张志春《开门之悟》的现代阐释思路，配合 ${FOUNDATION_CLASSICS.join("、")} 的干支五行基础理论，避免使用与上述典籍体系相冲突的现代简化说法。` +
        footer
      );
    case "meihua":
      return (
        header +
        `起卦数据：${extra.numbers ? `用户给出数字 ${extra.numbers}` : `以当前时间（${extra.time}）数理起卦`}。请按梅花易数体例推出上下卦及动爻，说明体用关系，并据此解读。` +
        footer
      );
    case "liuyao":
      return (
        header +
        `摇卦结果（自初爻至上爻，按摇出顺序）：\n${extra.lines
          .map((l, i) => `第${i + 1}爻：${l.label}`)
          .join("\n")}\n请据此排出本卦与变卦（如有动爻），说明卦名、世应，并结合提问解读。` +
        footer
      );
    case "tarot":
      return (
        header +
        `抽牌结果：${extra.cards
          .map((c) => `${c.card}（${c.reversed ? "逆位" : "正位"}）`)
          .join("、")}。请逐张说明牌意，再综合解读。` +
        footer
      );
    default:
      return header + footer;
  }
}

/* ---------------- 主组件 ---------------- */

export default function App() {
  const [selected, setSelected] = useState(null);
  const [question, setQuestion] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [numbers, setNumbers] = useState("");
  const [lunarMonth, setLunarMonth] = useState("");
  const [lunarDay, setLunarDay] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [castInfo, setCastInfo] = useState(null);
  const resultRef = useRef(null);

  const wheelItems = useMemo(() => {
    const radius = 118;
    return SYSTEMS.map((s, i) => {
      const angle = (i / SYSTEMS.length) * 2 * Math.PI - Math.PI / 2;
      return { ...s, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    });
  }, []);

  function resetForm(id) {
    setSelected(id);
    setQuestion("");
    setBirthDate("");
    setBirthTime("");
    setNumbers("");
    setLunarMonth("");
    setLunarDay("");
    setResult(null);
    setError("");
    setCastInfo(null);
  }

  async function handleSubmit() {
    if (!selected) return;
    if (selected === "bazi" && !birthDate) {
      setError("请填写出生日期");
      return;
    }
    if (selected === "liuren" && (!lunarMonth || !lunarDay)) {
      setError("请填写农历月、日");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    const now = new Date();
    const timeStr = now.toLocaleString("zh-CN", { hour12: false });

    let extra = { time: timeStr };
    let cast = null;

    if (selected === "bazi") {
      const birthDateTime = new Date(`${birthDate}T${birthTime || "12:00"}`);
      const pillars = computeBazi(birthDateTime);
      extra.pillars = pillars;
      cast = { type: "bazi", text: `${pillars.year} ${pillars.month} ${pillars.day} ${pillars.hour}` };
    } else if (selected === "liuren") {
      const { palace, hourNum } = computeXiaoLiuRen(Number(lunarMonth), Number(lunarDay), now.getHours());
      extra.lunarMonth = Number(lunarMonth);
      extra.lunarDay = Number(lunarDay);
      extra.hourNum = hourNum;
      extra.palace = palace;
      cast = { type: "liuren", palace, hourNum };
    } else if (selected === "meihua") {
      extra.numbers = numbers.trim();
      cast = { type: "meihua", text: numbers.trim() || `以当前时间起卦` };
    } else if (selected === "liuyao") {
      const lines = castLiuYao();
      extra.lines = lines;
      cast = { type: "liuyao", lines };
    } else if (selected === "tarot") {
      const cards = drawTarot(3);
      extra.cards = cards;
      cast = { type: "tarot", cards };
    } else if (selected === "qimen") {
      const full = computeQimenFull(now);
      Object.assign(extra, full);
      cast = { type: "qimen", ...full };
    } else {
      cast = { type: "time", text: timeStr };
    }

    setCastInfo(cast);

    const prompt = buildPrompt(selected, question, extra);

    try {
      const response = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`后端返回非法数据（HTTP ${response.status}）：${rawText.slice(0, 200)}`);
      }
      if (!response.ok || data.error) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      setResult(data.text || "解读生成失败，请重试。");
    } catch (e) {
      console.error("请求失败:", e);
      setError(e.message || "未知错误");
    } finally {
      setLoading(false);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }

  const currentSystem = SYSTEMS.find((s) => s.id === selected);

  return (
    <div style={{ background: COLORS.inkDeep, minHeight: "100vh", color: COLORS.paper }} className="w-full flex flex-col items-center px-4 py-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Ma+Shan+Zheng&family=Inter:wght@400;500&display=swap');
        .font-brush { font-family: 'Ma Shan Zheng', cursive; }
        .font-serif-sc { font-family: 'Noto Serif SC', serif; }
        .font-ui { font-family: 'Inter', sans-serif; }
        @keyframes stampIn { 0% { opacity:0; transform:scale(2.2) rotate(-8deg);} 60%{opacity:1; transform:scale(0.9) rotate(-8deg);} 100%{opacity:1; transform:scale(1) rotate(-8deg);} }
        .stamp-anim { animation: stampIn 0.5s ease-out forwards; }
        @keyframes inkPulse { 0%,100%{opacity:0.35;} 50%{opacity:0.85;} }
        .ink-pulse { animation: inkPulse 1.4s ease-in-out infinite; }
        @keyframes spinSlow { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
        .spin-slow { animation: spinSlow 60s linear infinite; }
      `}</style>

      <div className="text-center mb-10">
        <h1 className="font-brush" style={{ fontSize: "4rem", color: COLORS.gold, lineHeight: 1 }}>问 卜</h1>
        <p className="font-ui text-sm mt-3 tracking-widest" style={{ color: COLORS.paperDim, opacity: 0.7 }}>AI · 多体系术数问答</p>
      </div>

      <div className="relative mb-4" style={{ width: 280, height: 280 }}>
        <svg className="absolute inset-0 spin-slow" style={{ width: "100%", height: "100%" }} viewBox="0 0 280 280">
          <circle cx="140" cy="140" r="130" fill="none" stroke={COLORS.gold} strokeOpacity="0.25" strokeWidth="1" />
          <circle cx="140" cy="140" r="100" fill="none" stroke={COLORS.gold} strokeOpacity="0.15" strokeWidth="1" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-serif-sc" style={{ color: COLORS.gold, opacity: 0.5, fontSize: "1.5rem" }}>
            {currentSystem ? currentSystem.name : "择法"}
          </span>
        </div>
        {wheelItems.map((item) => {
          const isActive = selected === item.id;
          return (
            <button key={item.id} onClick={() => resetForm(item.id)} className="absolute font-ui flex flex-col items-center justify-center rounded-full transition-all"
              style={{
                left: 140 + item.x - 34, top: 140 + item.y - 34, width: 68, height: 68,
                background: isActive ? COLORS.vermillion : "rgba(233,225,204,0.06)",
                border: `1px solid ${isActive ? COLORS.vermillion : "rgba(184,147,79,0.4)"}`,
                color: isActive ? COLORS.paper : COLORS.paperDim,
                boxShadow: isActive ? `0 0 18px ${COLORS.vermillion}88` : "none",
              }}>
              <span className="font-serif-sc" style={{ fontSize: "1.1rem" }}>{item.glyph}</span>
              <span style={{ fontSize: "0.6rem", marginTop: 2 }}>{item.name}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="w-full max-w-md rounded-lg p-6 mt-6" style={{ background: "rgba(233,225,204,0.05)", border: `1px solid rgba(184,147,79,0.3)` }}>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-serif-sc text-lg" style={{ color: COLORS.gold }}>{currentSystem.name}</h2>
            <span className="font-ui text-xs" style={{ color: COLORS.paperDim, opacity: 0.6 }}>{currentSystem.sub}</span>
          </div>

          <label className="font-ui text-xs block mb-1" style={{ color: COLORS.paperDim, opacity: 0.8 }}>你想问什么</label>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="可留空，留空则给出整体运势解读"
            className="w-full font-ui rounded p-2 mb-4 text-sm outline-none"
            style={{ background: COLORS.paper, color: COLORS.inkText, minHeight: 70, resize: "vertical" }} />

          {selected === "bazi" && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="font-ui text-xs block mb-1" style={{ color: COLORS.paperDim, opacity: 0.8 }}>出生日期</label>
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full font-ui rounded p-2 text-sm outline-none" style={{ background: COLORS.paper, color: COLORS.inkText }} />
              </div>
              <div>
                <label className="font-ui text-xs block mb-1" style={{ color: COLORS.paperDim, opacity: 0.8 }}>出生时间（选填）</label>
                <input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)}
                  className="w-full font-ui rounded p-2 text-sm outline-none" style={{ background: COLORS.paper, color: COLORS.inkText }} />
              </div>
            </div>
          )}

          {selected === "liuren" && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="font-ui text-xs block mb-1" style={{ color: COLORS.paperDim, opacity: 0.8 }}>农历月（1-12）</label>
                <input type="number" min="1" max="12" value={lunarMonth} onChange={(e) => setLunarMonth(e.target.value)} placeholder="例如 5"
                  className="w-full font-ui rounded p-2 text-sm outline-none" style={{ background: COLORS.paper, color: COLORS.inkText }} />
              </div>
              <div>
                <label className="font-ui text-xs block mb-1" style={{ color: COLORS.paperDim, opacity: 0.8 }}>农历日（1-30）</label>
                <input type="number" min="1" max="30" value={lunarDay} onChange={(e) => setLunarDay(e.target.value)} placeholder="例如 18"
                  className="w-full font-ui rounded p-2 text-sm outline-none" style={{ background: COLORS.paper, color: COLORS.inkText }} />
              </div>
              <p className="font-ui text-xs col-span-2" style={{ color: COLORS.jade }}>时辰按提交时的当下时刻自动取用。请自行核对农历月/日的准确性（闰月请按当月实际农历数填写）。</p>
            </div>
          )}

          {selected === "meihua" && (
            <div className="mb-4">
              <label className="font-ui text-xs block mb-1" style={{ color: COLORS.paperDim, opacity: 0.8 }}>起卦数字（选填，如"3 8"，留空则以当前时间数理起卦）</label>
              <input type="text" value={numbers} onChange={(e) => setNumbers(e.target.value)} placeholder="例如 7 12"
                className="w-full font-ui rounded p-2 text-sm outline-none" style={{ background: COLORS.paper, color: COLORS.inkText }} />
            </div>
          )}

          {selected === "liuyao" && <p className="font-ui text-xs mb-4" style={{ color: COLORS.jade }}>提交后将模拟摇钱起卦（六次三枚铜钱），据实际摇出结果排卦。</p>}
          {selected === "tarot" && <p className="font-ui text-xs mb-4" style={{ color: COLORS.jade }}>提交后将随机抽取三张大阿尔卡纳牌进行解读。</p>}
          {selected === "qimen" && (
            <>
              <p className="font-ui text-xs mb-2" style={{ color: COLORS.jade }}>将以提交时的当下时刻起局。局数、地盘布局、值符值使均已精确算法计算；其余七星七门按固定序推演，仍由AI补齐。</p>
              <p className="font-ui text-xs mb-4" style={{ color: COLORS.paperDim, opacity: 0.6 }}>解读依据：{QIMEN_CLASSICS.join("、")}</p>
            </>
          )}

          {error && <p className="font-ui text-xs mb-3" style={{ color: COLORS.vermillion }}>{error}</p>}

          <button onClick={handleSubmit} disabled={loading} className="w-full font-serif-sc rounded py-2 text-sm tracking-widest transition-opacity"
            style={{ background: COLORS.vermillion, color: COLORS.paper, opacity: loading ? 0.6 : 1 }}>
            {loading ? "推演中…" : "起 局"}
          </button>
        </div>
      )}

      {loading && (
        <div className="mt-8 flex flex-col items-center">
          <div className="font-brush ink-pulse" style={{ fontSize: "2rem", color: COLORS.gold }}>研墨　布局　推演…</div>
        </div>
      )}

      {castInfo && !loading && castInfo.type === "liuyao" && (
        <div className="w-full max-w-md mt-6 font-ui text-xs" style={{ color: COLORS.paperDim, opacity: 0.75 }}>摇卦记录：{castInfo.lines.map((l) => l.label).join(" / ")}</div>
      )}
      {castInfo && !loading && castInfo.type === "bazi" && (
        <div className="w-full max-w-md mt-6 font-ui text-xs" style={{ color: COLORS.paperDim, opacity: 0.75 }}>排盘结果（算法计算）：{castInfo.text}</div>
      )}
      {castInfo && !loading && castInfo.type === "liuren" && (
        <div className="w-full max-w-md mt-6 font-ui text-xs" style={{ color: COLORS.paperDim, opacity: 0.75 }}>起课结果（算法计算）：落「{castInfo.palace}」宫，第{castInfo.hourNum}个时辰</div>
      )}
      {castInfo && !loading && castInfo.type === "qimen" && (
        <div className="w-full max-w-md mt-6 font-ui text-xs" style={{ color: COLORS.paperDim, opacity: 0.75 }}>
          定局（算法计算）：{castInfo.period}·{castInfo.yuanName}·{castInfo.dunType}{castInfo.ju}局<br />
          值符：{castInfo.zhiFuStar}临{PALACE_NAMES[castInfo.zhiFuGong]}宫　值使：{castInfo.zhiShiDoor}行至{PALACE_NAMES[castInfo.zhiShiGong]}宫
        </div>
      )}
      {castInfo && !loading && castInfo.type === "tarot" && (
        <div className="w-full max-w-md mt-6 font-ui text-xs" style={{ color: COLORS.paperDim, opacity: 0.75 }}>抽牌记录：{castInfo.cards.map((c) => `${c.card}(${c.reversed ? "逆" : "正"})`).join(" / ")}</div>
      )}

      {result && !loading && (
        <div ref={resultRef} className="relative w-full max-w-md mt-6 rounded-lg p-6 stamp-anim" style={{ background: COLORS.paper, color: COLORS.inkText }}>
          <div className="absolute font-serif-sc flex items-center justify-center"
            style={{ top: -18, right: -14, width: 56, height: 56, borderRadius: "9999px", border: `2px solid ${COLORS.vermillion}`, color: COLORS.vermillion, transform: "rotate(-8deg)", fontSize: "0.85rem", background: COLORS.paper }}>
            天机
          </div>
          <h3 className="font-serif-sc text-base mb-3" style={{ color: COLORS.vermillion }}>{currentSystem?.name} · 解读</h3>
          <p className="font-ui text-sm whitespace-pre-wrap leading-relaxed">{result}</p>
        </div>
      )}

      <p className="font-ui text-xs mt-12 text-center" style={{ color: COLORS.paperDim, opacity: 0.4, maxWidth: 380 }}>
        术数推演仅供参考与自省，不构成对具体决策（含投资、医疗、法律等）的建议。
      </p>
    </div>
  );
}
