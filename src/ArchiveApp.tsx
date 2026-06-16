import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, ArrowUpRight, Building2, ChevronUp, Download, FilterX, Globe2, Search } from "lucide-react";
import AlgorithmApp from "./App";

type Module = "archive" | "algorithm" | "finance";
type View = "records" | "stats" | "sources";
type LiteRow = [string, string, string, string, string, string, string, string, string, string, string, string];
type Rec = { id: string; recordType: string; scope: string; batch: string; date: string; name: string; en: string; content: string; channel: string; number: string; province: string; city: string; tags: string[]; url: string; source: string };
type Filters = { q: string; type: string; scope: string; batch: string; province: string; tag: string };
type Source = { title: string; category: string; batch: string; date: string; url: string; count: number; status: string; message?: string };
type FourthRecord = { batch: string; announcementDate: string; institutionName: string; englishName: string; serviceContent: string; serviceChannel: string; recordNumber: string; province: string; city: string; serviceTypes: string[]; sourceTitle: string; sourceUrl: string };
type FourthPayload = { source?: { title?: string; date?: string; url?: string; recordCount?: number; status?: string; message?: string }; records?: FourthRecord[] };

const empty: Filters = { q: "", type: "", scope: "", batch: "", province: "", tag: "" };
const typeMeta: Record<string, { recordType: string; scope: string }> = {
  D: { recordType: "境内机构报备", scope: "境内机构" },
  F: { recordType: "境外机构许可", scope: "境外机构" },
  I: { recordType: "境外投资设立企业许可", scope: "境外机构投资设立境内企业" }
};
const sources: Record<string, Source> = {
  D1: { title: "国家互联网信息办公室关于发布第一批境内金融信息服务机构报备编号的公告", category: "境内机构报备", batch: "2022年第一批", date: "2022-01-04", url: "https://www.cac.gov.cn/2022-01/04/c_1642894644935908.htm", count: 20, status: "loaded" },
  D2: { title: "国家互联网信息办公室关于发布第二批境内金融信息服务机构报备编号的公告", category: "境内机构报备", batch: "2022年第二批", date: "2022-10-28", url: "https://www.cac.gov.cn/2022-10/28/c_1668509064248761.htm", count: 13, status: "loaded" },
  D3: { title: "国家互联网信息办公室关于发布第三批境内金融信息服务机构报备编号的公告", category: "境内机构报备", batch: "2023年第三批", date: "2023-11-21", url: "https://www.cac.gov.cn/2023-11/21/c_1702230143102599.htm", count: 5, status: "loaded" },
  D4: { title: "境内金融信息服务机构报备清单（第四批）", category: "境内机构报备", batch: "第四批", date: "2025", url: "./data/financial-fourth-batch.json", count: 7, status: "loaded" },
  F: { title: "境外机构在中国境内提供金融信息服务许可名单", category: "境外机构许可", batch: "2026-04-30许可名单", date: "2026-04-30", url: "https://www.cac.gov.cn/2026-04/30/c_1779276540918311.htm", count: 31, status: "loaded" },
  I: { title: "境外机构在中国境内投资设立企业提供金融信息服务许可名单", category: "境外投资设立企业许可", batch: "2026-04-30许可名单", date: "2026-04-30", url: "https://www.cac.gov.cn/2026-04/30/c_1779276540092438.htm", count: 10, status: "loaded" }
};
const sourceList = [sources.D1, sources.D2, sources.D3, sources.D4, sources.F, sources.I];
const regions = ["北京", "天津", "上海", "浙江", "福建", "山东", "广东", "四川", "海南"];

function toRec(row: LiteRow, index: number): Rec {
  const meta = typeMeta[row[0]];
  const src = sources[row[11]];
  return { id: `${row[0]}-${index}`, recordType: meta.recordType, scope: meta.scope, batch: row[1], date: row[2], name: row[3], en: row[4], content: row[5], channel: row[6], number: row[7], province: row[8], city: row[9], tags: row[10] ? row[10].split("/") : [], url: src.url, source: src.title };
}
function fourthToLite(record: FourthRecord): LiteRow {
  return ["D", record.batch || "第四批", record.announcementDate || "2025", record.institutionName, record.englishName || "", record.serviceContent || "", record.serviceChannel || "", record.recordNumber || "", record.province || "", record.city || "", (record.serviceTypes || []).join("/"), "D4"];
}
function uniq(values: string[]) { return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-Hans-CN")); }
function count(values: string[]) { return uniq(values).map((label) => ({ label, value: values.filter((v) => v === label).length })).sort((a, b) => b.value - a.value); }
function mergeRows(base: LiteRow[], extra: LiteRow[]) {
  const seen = new Set<string>();
  return [...base, ...extra].filter((row) => { const key = [row[0], row[7], row[3], row[6]].join("|"); if (seen.has(key)) return false; seen.add(key); return true; });
}
function match(r: Rec, f: Filters) {
  const q = f.q.trim().toLowerCase();
  if (q && ![r.name, r.en, r.number, r.content, r.channel, r.province, r.city].join(" ").toLowerCase().includes(q)) return false;
  return (!f.type || r.recordType === f.type) && (!f.scope || r.scope === f.scope) && (!f.batch || r.batch === f.batch) && (!f.province || r.province === f.province) && (!f.tag || r.tags.includes(f.tag));
}
function csv(rows: Rec[]) {
  const esc = (v: string) => `"${String(v || "").replace(/"/g, '""')}"`;
  const head = ["recordType", "scope", "batch", "date", "name", "englishName", "content", "channel", "number", "province", "city", "tags", "url", "source"];
  const body = rows.map((r) => [r.recordType, r.scope, r.batch, r.date, r.name, r.en, r.content, r.channel, r.number, r.province, r.city, r.tags.join("、"), r.url, r.source].map(esc).join(","));
  const blob = new Blob(["\ufeff" + [head.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "financial-information-service-records.csv"; a.click(); URL.revokeObjectURL(url);
}
function Stat({ label, value }: { label: string; value: number | string }) { return <div className="stat-card"><span>{label}</span><strong>{value}</strong></div>; }
function Select({ label, value, options, on }: { label: string; value: string; options: string[]; on: (v: string) => void }) { return <label className="field"><span>{label}</span><select value={value} onChange={(e) => on(e.target.value)}><option value="">全部</option>{options.map((o) => <option key={o}>{o}</option>)}</select></label>; }
function Rank({ title, data }: { title: string; data: { label: string; value: number }[] }) { const max = Math.max(1, ...data.map((d) => d.value)); return <article className="chart-card rank-card"><div className="chart-head"><h2>{title}</h2><span>Top {Math.min(10, data.length)}</span></div><div className="rank-list">{data.slice(0, 10).map((d) => <div className="rank-row" key={d.label}><span>{d.label}</span><div><i style={{ width: `${Math.max(6, d.value / max * 100)}%` }} /></div><strong>{d.value}</strong></div>)}</div></article>; }

function ArchiveHome({ open }: { open: (m: Module) => void }) {
  return <main className="archive-shell"><section className="archive-hero"><h1>网数档案馆</h1></section><section className="archive-grid"><button className="archive-folder" onClick={() => open("algorithm")}><strong>算法备案查询系统</strong></button><button className="archive-folder highlighted" onClick={() => open("finance")}><strong>金融信息服务报备许可查询系统</strong></button><button className="archive-folder disabled" disabled><strong>更多模块敬请期待</strong></button></section></main>;
}
function Finance({ back }: { back: () => void }) {
  const [rows, setRows] = useState<Rec[]>([]); const [view, setView] = useState<View>("records"); const [f, setF] = useState<Filters>(empty);
  useEffect(() => {
    Promise.all([
      fetch("./finance-data/records-lite.json").then((r) => r.json()),
      fetch("./data/financial-fourth-batch.json").then((r) => r.ok ? r.json() : { records: [] }).catch(() => ({ records: [] }))
    ]).then(([baseRows, fourth]: [LiteRow[], FourthPayload]) => {
      const fourthRows = (fourth.records || []).map(fourthToLite);
      setRows(mergeRows(baseRows, fourthRows).map(toRec));
    }).catch(() => setRows([]));
  }, []);
  const filtered = useMemo(() => rows.filter((r) => match(r, f)), [rows, f]);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((x) => ({ ...x, [k]: v }));
  const tags = uniq(rows.flatMap((r) => r.tags));
  return <main className="shell"><header className="topbar module-topbar"><div><p className="eyebrow">Financial Information Service Archive</p><h1>金融信息服务报备许可查询系统</h1></div><button className="secondary-button" onClick={back}><ArrowLeft size={17} />返回档案馆</button></header><section className="summary-band"><div className="summary-copy"><div><strong>数据统计</strong><span>境内机构报备、境外机构许可、境外投资设立企业许可。</span></div></div><div className="stats-grid"><Stat label="总记录" value={rows.length} /><Stat label="境内报备" value={rows.filter((r) => r.recordType === "境内机构报备").length} /><Stat label="境外许可" value={rows.filter((r) => r.recordType === "境外机构许可").length} /><Stat label="投资设企许可" value={rows.filter((r) => r.recordType === "境外投资设立企业许可").length} /></div></section><nav className="tabs"><button className={view === "records" ? "active" : ""} onClick={() => setView("records")}><Building2 size={17} />报备许可查询</button><button className={view === "stats" ? "active" : ""} onClick={() => setView("stats")}><Activity size={17} />省市统计</button><button className={view === "sources" ? "active" : ""} onClick={() => setView("sources")}><Globe2 size={17} />来源记录</button></nav>{view === "records" && <section className="workspace"><aside className="filters"><label className="field search-field"><span>机构 / 英文名 / 编号 / 渠道</span><Search size={17} /><input value={f.q} onChange={(e) => set("q", e.target.value)} placeholder="输入关键词" /></label><Select label="记录类型" value={f.type} options={uniq(rows.map((r) => r.recordType))} on={(v) => set("type", v)} /><Select label="机构范围" value={f.scope} options={uniq(rows.map((r) => r.scope))} on={(v) => set("scope", v)} /><Select label="批次 / 年度" value={f.batch} options={uniq(rows.map((r) => r.batch))} on={(v) => set("batch", v)} /><Select label="省份 / 地区" value={f.province} options={uniq(rows.map((r) => r.province))} on={(v) => set("province", v)} /><Select label="服务标签" value={f.tag} options={tags} on={(v) => set("tag", v)} /><button className="secondary-button" onClick={() => setF(empty)}><FilterX size={17} />清空筛选</button><button className="secondary-button" onClick={() => csv(filtered)}><Download size={17} />导出 CSV</button><button className="secondary-button" onClick={() => scrollTo({ top: 0, behavior: "smooth" })}><ChevronUp size={17} />回到顶部</button></aside><section className="results"><div className="result-head"><div><strong>{filtered.length}</strong><span>条匹配记录</span></div><span>当前显示前 {Math.min(200, filtered.length)} 条</span></div><div className="record-list">{filtered.slice(0, 200).map((r) => <article className="record-card finance-record" key={r.id}><div className="record-title"><div><h2>{r.name}</h2>{r.en && <p>{r.en}</p>}</div><span>{r.province}{r.city && r.city !== r.province ? ` · ${r.city}` : ""}</span></div><div className="chips"><span>{r.recordType}</span><span>{r.scope}</span><span>{r.batch}</span>{r.tags.map((t) => <span key={t}>{t}</span>)}</div><dl className="record-meta"><div><dt>服务内容</dt><dd>{r.content}</dd></div><div><dt>服务渠道</dt><dd>{r.channel}</dd></div><div><dt>编号</dt><dd>{r.number}</dd></div><div><dt>时间</dt><dd>{r.date}</dd></div><div><dt>来源</dt><dd>{r.source}</dd></div></dl><a className="source-link" href={r.url} target="_blank" rel="noreferrer">查看源网址<ArrowUpRight size={15} /></a></article>)}</div></section></section>}{view === "stats" && <section className="trend-page"><div className="chart-grid"><Rank title="记录类型结构" data={count(rows.map((r) => r.recordType))} /><Rank title="服务标签结构" data={count(rows.flatMap((r) => r.tags))} /><Rank title="省份 / 地区排名" data={count(rows.map((r) => r.province))} /><Rank title="城市粗略排名" data={count(rows.map((r) => r.city))} /><Rank title="境内省份分布" data={count(rows.filter((r) => regions.includes(r.province)).map((r) => r.province))} /></div></section>}{view === "sources" && <section className="sources-list">{sourceList.map((s) => <article className="source-card" key={s.title}><div><h2>{s.title}</h2><p>{s.category} · {s.batch} · {s.date} · {s.count} 条</p>{s.message && <p>{s.message}</p>}</div><span>{s.status}</span><a href={s.url} target="_blank" rel="noreferrer">源网址<ArrowUpRight size={15} /></a></article>)}</section>}<button className="floating-top" onClick={() => scrollTo({ top: 0, behavior: "smooth" })}><ChevronUp size={18} /></button></main>;
}
export default function ArchiveApp() { const [module, setModule] = useState<Module>("archive"); if (module === "archive") return <ArchiveHome open={setModule} />; if (module === "algorithm") return <><button className="archive-return" onClick={() => setModule("archive")}><ArrowLeft size={17} />返回档案馆</button><AlgorithmApp /></>; return <Finance back={() => setModule("archive")} />; }
