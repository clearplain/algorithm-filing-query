import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Activity, Archive, ArrowLeft, ArrowUpRight, Building2, ChevronUp, Database, Download, FileText, FilterX, Folder, Globe2, Search } from "lucide-react";
import AlgorithmApp from "./App";
import type { Law } from "./types";

type Module = "archive" | "algorithm" | "finance";
type View = "records" | "trends" | "laws" | "sources";
type Datum = { label: string; value: number };
type FinanceRecord = { id: string; recordType: string; institutionScope: string; batch: string; announcementDate: string; institutionName: string; englishName?: string; serviceContent: string; serviceChannel: string; recordNumber: string; province: string; city: string; serviceTags: string[]; sourceUrl: string; sourceTitle: string; sourceFile: string };
type FinanceFacets = { recordTypes: string[]; institutionScopes: string[]; batches: string[]; provinces: string[]; cities: string[]; serviceTags: string[] };
type FinanceStats = { recordCount: number; domesticCount: number; foreignCount: number; foreignInvestedCount: number; sourceCount: number; generatedAt: string };
type FinanceSource = { title: string; category: string; batch: string; date: string; url: string; localFile: string | null; recordCount: number; status: string; message: string };
type Filters = { query: string; recordType: string; institutionScope: string; batch: string; province: string; serviceTag: string };

const emptyFilters: Filters = { query: "", recordType: "", institutionScope: "", batch: "", province: "", serviceTag: "" };
const palette = ["#2563eb", "#f97316", "#16a34a", "#dc2626", "#7c3aed", "#0891b2", "#ca8a04", "#db2777"];
const heatPalette = ["#f8fafc", "#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8", "#0f172a"];
const regionLayout = [
  { name: "新疆", x: 1, y: 2 }, { name: "西藏", x: 2, y: 5 }, { name: "青海", x: 3, y: 4 }, { name: "甘肃", x: 4, y: 3 }, { name: "宁夏", x: 5, y: 3 }, { name: "内蒙古", x: 6, y: 2 },
  { name: "黑龙江", x: 10, y: 1 }, { name: "吉林", x: 10, y: 2 }, { name: "辽宁", x: 9, y: 3 }, { name: "北京", x: 8, y: 3 }, { name: "天津", x: 8, y: 4 }, { name: "河北", x: 7, y: 4 },
  { name: "山西", x: 6, y: 4 }, { name: "陕西", x: 5, y: 5 }, { name: "河南", x: 7, y: 5 }, { name: "山东", x: 8, y: 5 }, { name: "四川", x: 4, y: 6 }, { name: "重庆", x: 5, y: 6 },
  { name: "湖北", x: 6, y: 6 }, { name: "安徽", x: 7, y: 6 }, { name: "江苏", x: 8, y: 6 }, { name: "上海", x: 9, y: 6 }, { name: "云南", x: 3, y: 7 }, { name: "贵州", x: 4, y: 7 },
  { name: "湖南", x: 5, y: 7 }, { name: "江西", x: 6, y: 7 }, { name: "浙江", x: 7, y: 7 }, { name: "福建", x: 7, y: 8 }, { name: "广西", x: 4, y: 8 }, { name: "广东", x: 5, y: 8 },
  { name: "香港", x: 6, y: 8 }, { name: "澳门", x: 6, y: 9 }, { name: "海南", x: 5, y: 9 }, { name: "台湾", x: 8, y: 8 },
];

function includesText(source: string, query: string) { return source.toLowerCase().includes(query.toLowerCase()); }
function countBy<T>(records: T[], picker: (record: T) => string | string[]) {
  const counts = new Map<string, number>();
  records.forEach((record) => (Array.isArray(picker(record)) ? picker(record) as string[] : [picker(record) as string]).filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1)));
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "zh-Hans-CN"));
}
function cleanArticleText(number: string, text: string) { return text.startsWith(number) ? text.slice(number.length).replace(/^\s*\n?\s*/, "") : text; }
function matchRecord(record: FinanceRecord, filters: Filters) {
  const query = filters.query.trim();
  if (query && !includesText([record.institutionName, record.englishName, record.recordNumber, record.serviceContent, record.serviceChannel, record.province, record.city].join(" "), query)) return false;
  if (filters.recordType && record.recordType !== filters.recordType) return false;
  if (filters.institutionScope && record.institutionScope !== filters.institutionScope) return false;
  if (filters.batch && record.batch !== filters.batch) return false;
  if (filters.province && record.province !== filters.province) return false;
  if (filters.serviceTag && !record.serviceTags.includes(filters.serviceTag)) return false;
  return true;
}
function StatCard({ label, value }: { label: string; value: string | number }) { return <div className="stat-card"><span>{label}</span><strong>{value}</strong></div>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">全部</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function ArchiveHome({ onOpen }: { onOpen: (module: Module) => void }) {
  const [wave, setWave] = useState(0);
  return <main className="archive-shell">
    <section className="archive-hero"><p className="eyebrow">Personal Research Database</p><h1>网数档案馆</h1><p>把分散的备案、许可、报备清单收进同一个资料柜。悬停或滚动中间档案夹，可以模拟手翻档案柜的波动效果。</p></section>
    <section className="folder-stage" onWheel={(event) => setWave((current) => current + Math.sign(event.deltaY))} style={{ "--wave": wave } as CSSProperties}><div className="folder-stack" aria-hidden="true">{Array.from({ length: 9 }).map((_, index) => <span key={index} style={{ "--i": index } as CSSProperties} />)}</div></section>
    <section className="archive-grid">
      <button className="archive-folder" onClick={() => onOpen("algorithm")}><Folder size={30} /><span>文件夹一</span><strong>算法备案查询系统</strong><p>保留原有算法备案、深度合成备案、趋势分析、法条检索和来源记录。</p></button>
      <button className="archive-folder highlighted" onClick={() => onOpen("finance")}><Archive size={30} /><span>文件夹二</span><strong>金融信息服务报备许可查询系统</strong><p>新增境内机构报备、境外机构许可、境外投资设立企业许可的检索和统计。</p></button>
      <button className="archive-folder disabled" disabled><Database size={30} /><span>文件夹三</span><strong>更多模块敬请期待</strong><p>预留后续监管清单、许可库、备案库等模块入口。</p></button>
    </section>
  </main>;
}

function PiePanel({ title, data }: { title: string; data: Datum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let current = 0;
  const gradient = data.slice(0, 8).map((item, index) => { const start = current; current += total ? item.value / total * 100 : 0; return `${palette[index % palette.length]} ${start}% ${current}%`; }).join(", ");
  return <article className="chart-card"><div className="chart-head"><h2>{title}</h2><span>{total} 项</span></div><div className="pie-wrap"><div className="pie" style={{ background: `conic-gradient(${gradient || "#e5e7eb 0 100%"})` }} /><div className="legend-list">{data.slice(0, 8).map((item, index) => <div key={item.label}><i style={{ background: palette[index % palette.length] }} /><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></div></article>;
}
function ChinaHeatMap({ data }: { data: Datum[] }) {
  const values = new Map(data.map((item) => [item.label, item.value]));
  const max = Math.max(1, ...regionLayout.map((item) => values.get(item.name) ?? 0));
  const colorFor = (value: number) => value === 0 ? heatPalette[0] : heatPalette[Math.min(heatPalette.length - 1, Math.max(1, Math.ceil(value / max * (heatPalette.length - 1))))];
  return <article className="chart-card chart-wide"><div className="chart-head"><h2>境内机构省级分布</h2><span>按记录数量着色</span></div><div className="map-layout"><div className="china-map-grid">{regionLayout.map((region) => { const value = values.get(region.name) ?? 0; return <div className="map-cell" key={region.name} style={{ gridColumn: region.x, gridRow: region.y, background: colorFor(value), color: value / max > .55 ? "#fff" : "#17202a" }} title={`${region.name}: ${value}`}><strong>{region.name}</strong><span>{value}</span></div>; })}</div><div className="heat-legend"><span>低</span>{heatPalette.map((color) => <i key={color} style={{ background: color }} />)}<span>高</span></div></div></article>;
}
function RankPanel({ title, data, limit = 10 }: { title: string; data: Datum[]; limit?: number }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return <article className="chart-card rank-card"><div className="chart-head"><h2>{title}</h2><span>Top {Math.min(limit, data.length)}</span></div><div className="rank-list">{data.slice(0, limit).map((item) => <div className="rank-row" key={item.label}><span>{item.label}</span><div><i style={{ width: `${Math.max(6, item.value / max * 100)}%` }} /></div><strong>{item.value}</strong></div>)}</div></article>;
}

function FinanceModule({ onBack }: { onBack: () => void }) {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [facets, setFacets] = useState<FinanceFacets | null>(null);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [sources, setSources] = useState<FinanceSource[]>([]);
  const [laws, setLaws] = useState<Law[]>([]);
  const [view, setView] = useState<View>("records");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [lawQuery, setLawQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { async function load() {
    const [recordsRes, facetsRes, statsRes, sourcesRes, lawsRes] = await Promise.all([fetch("./finance-data/records.json"), fetch("./finance-data/facets.json"), fetch("./finance-data/stats.json"), fetch("./finance-data/sources.json"), fetch("./finance-data/laws.json")]);
    setRecords(await recordsRes.json()); setFacets(await facetsRes.json()); setStats(await statsRes.json()); setSources(await sourcesRes.json()); setLaws(await lawsRes.json()); setLoading(false);
  } load().catch(() => setLoading(false)); }, []);

  const filteredRecords = useMemo(() => records.filter((record) => matchRecord(record, filters)), [records, filters]);
  const visibleRecords = filteredRecords.slice(0, 200);
  const provinceData = countBy(records.filter((record) => record.province !== "境外" && record.province !== "全国"), (record) => record.province);
  const cityData = countBy(records.filter((record) => record.city && record.city !== "境外"), (record) => record.city);
  const activeLaw = laws[0];
  const lawMatches = useMemo(() => { if (!activeLaw) return []; const query = lawQuery.trim(); return activeLaw.chapters.map((chapter) => ({ ...chapter, articles: chapter.articles.filter((article) => !query || includesText(article.text, query)) })); }, [activeLaw, lawQuery]);
  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) { setFilters((current) => ({ ...current, [key]: value })); }

  return <main className="shell">
    <header className="topbar module-topbar"><div><p className="eyebrow">Financial Information Service Archive</p><h1>金融信息服务报备许可查询系统</h1></div><button className="secondary-button back-button" onClick={onBack}><ArrowLeft size={17} />返回档案馆</button></header>
    <section className="summary-band"><div className="summary-copy"><div><strong>数据统计</strong><span>覆盖境内机构报备、境外机构许可、境外投资设立企业许可。</span></div></div><div className="stats-grid"><StatCard label="总记录" value={stats?.recordCount ?? "-"} /><StatCard label="境内报备" value={stats?.domesticCount ?? "-"} /><StatCard label="境外许可" value={stats?.foreignCount ?? "-"} /><StatCard label="投资设企许可" value={stats?.foreignInvestedCount ?? "-"} /></div></section>
    <nav className="tabs"><button className={view === "records" ? "active" : ""} onClick={() => setView("records")}><Building2 size={17} />报备许可查询</button><button className={view === "trends" ? "active" : ""} onClick={() => setView("trends")}><Activity size={17} />省市统计</button><button className={view === "laws" ? "active" : ""} onClick={() => setView("laws")}><FileText size={17} />规定检索</button><button className={view === "sources" ? "active" : ""} onClick={() => setView("sources")}><Globe2 size={17} />来源记录</button></nav>
    {loading && <div className="empty">正在载入数据</div>}
    {!loading && view === "records" && facets && <section className="workspace"><aside className="filters"><label className="field search-field"><span>机构 / 英文名 / 编号 / 渠道</span><Search size={17} /><input value={filters.query} onChange={(event) => setFilter("query", event.target.value)} placeholder="输入关键词" /></label><SelectField label="记录类型" value={filters.recordType} options={facets.recordTypes} onChange={(value) => setFilter("recordType", value)} /><SelectField label="机构范围" value={filters.institutionScope} options={facets.institutionScopes} onChange={(value) => setFilter("institutionScope", value)} /><SelectField label="批次 / 年度" value={filters.batch} options={facets.batches} onChange={(value) => setFilter("batch", value)} /><SelectField label="省份 / 地区" value={filters.province} options={facets.provinces} onChange={(value) => setFilter("province", value)} /><SelectField label="服务标签" value={filters.serviceTag} options={facets.serviceTags} onChange={(value) => setFilter("serviceTag", value)} /><button className="secondary-button" onClick={() => setFilters(emptyFilters)}><FilterX size={17} />清空筛选</button><a className="secondary-button" href="./finance-data/records.csv" download><Download size={17} />导出 CSV</a><button className="secondary-button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><ChevronUp size={17} />回到顶部</button></aside><section className="results"><div className="result-head"><div><strong>{filteredRecords.length}</strong><span>条匹配记录</span></div><span>当前显示前 {visibleRecords.length} 条</span></div><div className="record-list">{visibleRecords.map((record) => <article className="record-card finance-record" key={record.id}><div className="record-title"><div><h2>{record.institutionName}</h2>{record.englishName && <p>{record.englishName}</p>}</div><span>{record.province}{record.city && record.city !== record.province ? ` · ${record.city}` : ""}</span></div><div className="chips"><span>{record.recordType}</span><span>{record.institutionScope}</span><span>{record.batch}</span>{record.serviceTags.map((tag) => <span key={tag}>{tag}</span>)}</div><dl className="record-meta"><div><dt>服务内容</dt><dd>{record.serviceContent}</dd></div><div><dt>服务渠道</dt><dd>{record.serviceChannel}</dd></div><div><dt>编号</dt><dd>{record.recordNumber}</dd></div><div><dt>时间</dt><dd>{record.announcementDate}</dd></div><div><dt>来源</dt><dd>{record.sourceTitle}</dd></div></dl><a className="source-link" href={record.sourceUrl} target="_blank" rel="noreferrer">查看源网址<ArrowUpRight size={15} /></a></article>)}</div></section></section>}
    {!loading && view === "trends" && <section className="trend-page"><div className="chart-grid"><PiePanel title="记录类型结构" data={countBy(records, (record) => record.recordType)} /><PiePanel title="服务标签结构" data={countBy(records, (record) => record.serviceTags)} /><ChinaHeatMap data={provinceData} /><RankPanel title="省份 / 地区排名" data={countBy(records, (record) => record.province)} /><RankPanel title="城市粗略排名" data={cityData} /></div></section>}
    {!loading && view === "laws" && <section className="law-layout law-single"><section className="law-panel">{activeLaw && <><div className="law-head"><div><h2>{activeLaw.title}</h2><p>施行日期：{activeLaw.effectiveDate}</p></div></div><label className="field search-field law-search"><span>规定关键词</span><Search size={17} /><input value={lawQuery} onChange={(event) => setLawQuery(event.target.value)} placeholder="输入关键词" /></label><div className="articles">{lawMatches.map((chapter) => <section key={chapter.chapter}>{chapter.articles.length > 0 && <h3>{chapter.chapter}</h3>}{chapter.articles.map((article) => <article key={article.number}><strong>{article.number}</strong><p>{cleanArticleText(article.number, article.text)}</p></article>)}</section>)}</div></>}</section></section>}
    {!loading && view === "sources" && <section className="sources-list">{sources.map((source) => <article className="source-card" key={`${source.title}-${source.batch}-${source.localFile}`}><div><h2>{source.title}</h2><p>{source.category} · {source.batch} · {source.date} · {source.recordCount} 条</p>{source.message && <p>{source.message}</p>}</div><span>{source.status}</span><a href={source.url} target="_blank" rel="noreferrer">源网址<ArrowUpRight size={15} /></a></article>)}</section>}
    <button className="floating-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="回到顶部"><ChevronUp size={18} /></button>
  </main>;
}

function ArchiveApp() {
  const [module, setModule] = useState<Module>("archive");
  if (module === "archive") return <ArchiveHome onOpen={setModule} />;
  if (module === "algorithm") return <><button className="archive-return" onClick={() => setModule("archive")}><ArrowLeft size={17} />返回档案馆</button><AlgorithmApp /></>;
  return <FinanceModule onBack={() => setModule("archive")} />;
}

export default ArchiveApp;
