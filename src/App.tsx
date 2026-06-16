import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Activity, ArrowUpRight, Database, Download, FileText, FilterX, Search } from "lucide-react";
import type { Facets, FilingRecord, FinancialFacets, FinancialLaw, FinancialRecord, FinancialSource, FinancialStats, Law, Source, Stats } from "./types";

type Module = "archive" | "algorithm" | "financial";
type AlgoView = "records" | "stats" | "laws" | "sources";
type FinancialView = "records" | "stats" | "laws" | "sources";
type AlgoFilters = { query: string; filingType: string; batch: string; algorithmClass: string; province: string; domainTag: string };
type FinancialFilters = { query: string; regime: string; regionType: string; province: string; serviceType: string; year: string };
type Datum = { label: string; value: number };

const emptyAlgoFilters: AlgoFilters = { query: "", filingType: "", batch: "", algorithmClass: "", province: "", domainTag: "" };
const emptyFinancialFilters: FinancialFilters = { query: "", regime: "", regionType: "", province: "", serviceType: "", year: "" };
const palette = ["#17202a", "#2563eb", "#16a34a", "#f97316", "#7c3aed", "#0891b2", "#ca8a04", "#64748b"];

function includesText(source: string, query: string) {
  return source.toLowerCase().includes(query.toLowerCase());
}

function countBy<T>(items: T[], picker: (item: T) => string | string[]) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const values = picker(item);
    (Array.isArray(values) ? values : [values]).filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  });
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "zh-Hans-CN"));
}

function cleanArticleText(number: string, text: string) {
  return text.startsWith(number) ? text.slice(number.length).replace(/^\s*\n?\s*/, "") : text;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">全部</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function StatCard({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>;
}

function MiniBarPanel({ title, data, unit = "项" }: { title: string; data: Datum[]; unit?: string }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return <article className="chart-card"><div className="chart-head"><h2>{title}</h2><span>{data.reduce((sum, item) => sum + item.value, 0).toLocaleString()} {unit}</span></div><div className="bar-list">{data.slice(0, 12).map((item, index) => <div className="bar-row" key={item.label}><span>{item.label}</span><div><i style={{ width: `${Math.max(4, item.value / max * 100)}%`, background: palette[index % palette.length] }} /></div><strong>{item.value}</strong></div>)}</div></article>;
}

function ArchiveLanding({ onOpen }: { onOpen: (module: Module) => void }) {
  const folders: Array<{ module: Module; label: string; disabled?: boolean }> = [
    { module: "algorithm", label: "算法备案查询系统" },
    { module: "financial", label: "金融信息服务报备许可查询系统" },
    { module: "archive", label: "更多模块敬请期待", disabled: true },
  ];
  const [active, setActive] = useState(0);
  const clamp = (value: number) => Math.max(0, Math.min(folders.length - 1, value));
  return (
    <main className="archive-shell">
      <h1 className="archive-title">网数档案馆</h1>
      <section
        className="folder-browser"
        aria-label="网数档案馆文件夹"
        onWheel={(event) => {
          event.preventDefault();
          if (Math.abs(event.deltaY) < 2) return;
          setActive((current) => clamp(current + (event.deltaY > 0 ? 1 : -1)));
        }}
      >
        <div className="folder-rail">
          {folders.map((folder, index) => {
            const offset = index - active;
            const abs = Math.abs(offset);
            const state = offset === 0 ? "active" : offset < 0 ? "before" : "after";
            return (
              <button
                key={folder.label}
                type="button"
                className={`album-folder ${state}`}
                style={{
                  "--y": `${offset * 86}px`,
                  "--z": `${offset * -120}px`,
                  "--rot": `${offset * -1.4}deg`,
                  "--scale": `${1 - abs * 0.045}`,
                  "--opacity": `${1 - abs * 0.18}`,
                  "--brightness": `${1 - abs * 0.04}`,
                  "--hover-y": `${offset * 76 - 12}px`,
                  "--hover-z": `${offset * -120 + 42}px`,
                  "--hover-rot": `${offset * -1.2}deg`,
                  "--hover-scale": `${1.025 - abs * 0.04}`,
                } as CSSProperties}
                onMouseEnter={() => setActive(index)}
                onClick={() => folder.disabled ? setActive(index) : onOpen(folder.module)}
              >
                <span className="folder-tab">{folder.label}</span>
                <span className="folder-body" />
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function matchesAlgo(record: FilingRecord, filters: AlgoFilters) {
  const query = filters.query.trim();
  if (query && !includesText([record.entityName, record.algorithmName, record.recordNumber, record.product, record.purpose].join(" "), query)) return false;
  if (filters.filingType && record.filingType !== filters.filingType) return false;
  if (filters.batch && record.batch !== filters.batch) return false;
  if (filters.algorithmClass && record.algorithmClass !== filters.algorithmClass) return false;
  if (filters.province && record.province !== filters.province) return false;
  if (filters.domainTag && !record.domainTags.includes(filters.domainTag)) return false;
  return true;
}

function matchesFinancial(record: FinancialRecord, filters: FinancialFilters) {
  const query = filters.query.trim();
  if (query && !includesText([record.institutionName, record.englishName, record.recordNumber, record.serviceContent, record.serviceChannel, record.province, record.city].join(" "), query)) return false;
  if (filters.regime && record.regime !== filters.regime) return false;
  if (filters.regionType && record.regionType !== filters.regionType) return false;
  if (filters.province && record.province !== filters.province) return false;
  if (filters.serviceType && !record.serviceTypes.includes(filters.serviceType)) return false;
  if (filters.year && record.year !== filters.year) return false;
  return true;
}

function ModuleHeader({ eyebrow, title, onBack }: { eyebrow: string; title: string; onBack: () => void }) {
  return <header className="topbar"><button className="ghost-button" onClick={onBack}>← 返回网数档案馆</button><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div></header>;
}

function AlgorithmModule({ onBack }: { onBack: () => void }) {
  const [records, setRecords] = useState<FilingRecord[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [laws, setLaws] = useState<Law[]>([]);
  const [view, setView] = useState<AlgoView>("records");
  const [filters, setFilters] = useState<AlgoFilters>(emptyAlgoFilters);
  const [lawQuery, setLawQuery] = useState("");
  const [selectedLaw, setSelectedLaw] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([fetch("./data/records.json"), fetch("./data/facets.json"), fetch("./data/stats.json"), fetch("./data/sources.json"), fetch("./data/laws.json")]).then(async ([a, b, c, d, e]) => { setRecords(await a.json()); setFacets(await b.json()); setStats(await c.json()); setSources(await d.json()); setLaws(await e.json()); setLoading(false); }).catch(() => setLoading(false)); }, []);
  const filtered = useMemo(() => records.filter((record) => matchesAlgo(record, filters)), [records, filters]);
  const activeLaw = laws[selectedLaw];
  const lawMatches = useLawMatches(activeLaw, lawQuery);
  const provinceData = countBy(records, (record) => record.province).filter((item) => item.label !== "未识别");
  const typeData = countBy(records, (record) => record.filingType);
  const classData = countBy(records, (record) => record.algorithmClass);
  const domainData = countBy(records, (record) => record.domainTags);
  function setFilter<K extends keyof AlgoFilters>(key: K, value: AlgoFilters[K]) { setFilters((current) => ({ ...current, [key]: value })); }
  return <main className="shell"><ModuleHeader eyebrow="Algorithm Filing Database" title="算法备案查询系统" onBack={onBack} /><section className="summary-band"><div className="summary-copy"><strong>数据统计</strong><span>原系统模块，保留既有查询口径</span></div><div className="stats-grid"><StatCard label="总记录" value={stats?.recordCount ?? "-"} /><StatCard label="算法备案" value={stats?.domesticCount ?? "-"} /><StatCard label="深度合成" value={stats?.deepCount ?? "-"} /><StatCard label="数据源" value={stats?.sourceCount ?? "-"} /></div></section><Tabs view={view} setView={setView} labels={{ records: "备案查询", stats: "趋势统计", laws: "法条检索", sources: "来源记录" }} />{loading && <div className="empty">正在载入数据</div>}{!loading && view === "records" && facets && <section className="workspace"><aside className="filters"><label className="field search-field"><span>企业 / 算法 / 编号</span><Search size={17} /><input value={filters.query} onChange={(event) => setFilter("query", event.target.value)} placeholder="输入关键词" /></label><SelectField label="备案类型" value={filters.filingType} options={facets.filingTypes} onChange={(value) => setFilter("filingType", value)} /><SelectField label="批次" value={filters.batch} options={facets.batches} onChange={(value) => setFilter("batch", value)} /><SelectField label="算法类型 / 角色" value={filters.algorithmClass} options={facets.algorithmClasses} onChange={(value) => setFilter("algorithmClass", value)} /><SelectField label="应用领域" value={filters.domainTag} options={facets.domainTags} onChange={(value) => setFilter("domainTag", value)} /><SelectField label="所在省" value={filters.province} options={facets.provinces} onChange={(value) => setFilter("province", value)} /><button className="secondary-button" onClick={() => setFilters(emptyAlgoFilters)}><FilterX size={17} />清空筛选</button><a className="secondary-button" href="./data/records.csv" download><Download size={17} />导出 CSV</a></aside><section className="results"><div className="result-head"><div><strong>{filtered.length}</strong><span>条匹配记录</span></div><span>当前显示前 {Math.min(200, filtered.length)} 条</span></div><div className="record-list">{filtered.slice(0, 200).map((record) => <AlgoRecordCard key={record.id} record={record} />)}</div></section></section>}{!loading && view === "stats" && <section className="chart-grid"><MiniBarPanel title="备案类型结构" data={typeData} /><MiniBarPanel title="省份结构" data={provinceData} /><MiniBarPanel title="算法类型 / 角色" data={classData} /><MiniBarPanel title="应用领域" data={domainData} /></section>}{!loading && view === "laws" && <LawPanel laws={laws} selectedLaw={selectedLaw} setSelectedLaw={setSelectedLaw} lawQuery={lawQuery} setLawQuery={setLawQuery} lawMatches={lawMatches} activeLaw={activeLaw} />}{!loading && view === "sources" && <SourceList sources={sources} />}<BackTop /></main>;
}

function FinancialModule({ onBack }: { onBack: () => void }) {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [facets, setFacets] = useState<FinancialFacets | null>(null);
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [sources, setSources] = useState<FinancialSource[]>([]);
  const [laws, setLaws] = useState<FinancialLaw[]>([]);
  const [view, setView] = useState<FinancialView>("records");
  const [filters, setFilters] = useState<FinancialFilters>(emptyFinancialFilters);
  const [lawQuery, setLawQuery] = useState("");
  const [selectedLaw, setSelectedLaw] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([fetch("./data/financial-records.json"), fetch("./data/financial-facets.json"), fetch("./data/financial-stats.json"), fetch("./data/financial-sources.json"), fetch("./data/financial-laws.json")]).then(async ([a, b, c, d, e]) => { setRecords(await a.json()); setFacets(await b.json()); setStats(await c.json()); setSources(await d.json()); setLaws(await e.json()); setLoading(false); }).catch(() => setLoading(false)); }, []);
  const filtered = useMemo(() => records.filter((record) => matchesFinancial(record, filters)), [records, filters]);
  const activeLaw = laws[selectedLaw];
  const lawMatches = useLawMatches(activeLaw, lawQuery);
  const regimeData = countBy(records, (record) => record.regime);
  const provinceData = countBy(records, (record) => record.province);
  const yearData = countBy(records, (record) => record.year).sort((a, b) => a.label.localeCompare(b.label));
  const serviceData = countBy(records, (record) => record.serviceTypes);
  function setFilter<K extends keyof FinancialFilters>(key: K, value: FinancialFilters[K]) { setFilters((current) => ({ ...current, [key]: value })); }
  return <main className="shell"><ModuleHeader eyebrow="Financial Information Service Archive" title="金融信息服务报备许可查询系统" onBack={onBack} /><section className="summary-band"><div className="summary-copy"><strong>数据统计</strong><span>境内报备 + 境外许可名单，支持关键词检索、机构类别筛选、源链接回溯和 CSV 导出。</span></div><div className="stats-grid"><StatCard label="已载入记录" value={stats?.recordCount ?? "-"} /><StatCard label="境内机构报备" value={stats?.domesticCount ?? "-"} /><StatCard label="境外机构许可" value={stats?.overseasDirectCount ?? "-"} /><StatCard label="境外设企许可" value={stats?.overseasInvestedCount ?? "-"} /></div></section>{stats?.note && <div className="notice"><strong>数据提示：</strong>{stats.note}</div>}<Tabs view={view} setView={setView} labels={{ records: "机构查询", stats: "省市统计", laws: "法规依据", sources: "来源记录" }} />{loading && <div className="empty">正在载入数据</div>}{!loading && view === "records" && facets && <section className="workspace"><aside className="filters"><label className="field search-field"><span>机构 / 英文名 / 编号 / 服务</span><Search size={17} /><input value={filters.query} onChange={(event) => setFilter("query", event.target.value)} placeholder="输入关键词" /></label><SelectField label="监管类型" value={filters.regime} options={facets.regimes} onChange={(value) => setFilter("regime", value)} /><SelectField label="机构类型" value={filters.regionType} options={facets.regionTypes} onChange={(value) => setFilter("regionType", value)} /><SelectField label="省份 / 地区" value={filters.province} options={facets.provinces} onChange={(value) => setFilter("province", value)} /><SelectField label="服务类型" value={filters.serviceType} options={facets.serviceTypes} onChange={(value) => setFilter("serviceType", value)} /><SelectField label="编号年份" value={filters.year} options={facets.years} onChange={(value) => setFilter("year", value)} /><button className="secondary-button" onClick={() => setFilters(emptyFinancialFilters)}><FilterX size={17} />清空筛选</button><a className="secondary-button" href="./data/financial-records.csv" download><Download size={17} />导出 CSV</a></aside><section className="results"><div className="result-head"><div><strong>{filtered.length}</strong><span>条匹配记录</span></div><span>当前显示前 {Math.min(200, filtered.length)} 条</span></div><div className="record-list">{filtered.slice(0, 200).map((record) => <FinancialRecordCard key={record.id} record={record} />)}</div></section></section>}{!loading && view === "stats" && <section className="chart-grid"><MiniBarPanel title="监管类型结构" data={regimeData} /><MiniBarPanel title="编号年份分布" data={yearData} /><MiniBarPanel title="服务类型分布" data={serviceData} /><MiniBarPanel title="省份 / 地区 Top" data={provinceData} /><ProvincePanel data={provinceData} /></section>}{!loading && view === "laws" && <LawPanel laws={laws} selectedLaw={selectedLaw} setSelectedLaw={setSelectedLaw} lawQuery={lawQuery} setLawQuery={setLawQuery} lawMatches={lawMatches} activeLaw={activeLaw} />}{!loading && view === "sources" && <SourceList sources={sources} />}<BackTop /></main>;
}

function Tabs<T extends string>({ view, setView, labels }: { view: T; setView: (view: T) => void; labels: Record<T, string> }) {
  const icons = [Database, Activity, FileText, ArrowUpRight];
  return <nav className="tabs">{(Object.keys(labels) as T[]).map((key, index) => { const Icon = icons[index] || Database; return <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}><Icon size={17} />{labels[key]}</button>; })}</nav>;
}

function AlgoRecordCard({ record }: { record: FilingRecord }) {
  return <article className="record-card"><div className="record-title"><div><h2>{record.algorithmName}</h2><p>{record.entityName}</p></div><span>{record.province}</span></div><div className="chips"><span>{record.filingType}</span><span>{record.batch}</span><span>{record.algorithmClass || "未标注"}</span>{record.domainTags.map((tag) => <span key={tag}>{tag}</span>)}</div><dl className="record-meta"><div><dt>应用产品</dt><dd>{record.product}</dd></div><div><dt>备案编号</dt><dd>{record.recordNumber}</dd></div><div><dt>主要用途</dt><dd>{record.purpose}</dd></div>{record.remark && <div><dt>备注</dt><dd>{record.remark}</dd></div>}</dl><a className="source-link" href={record.sourceUrl} target="_blank" rel="noreferrer">查看来源<ArrowUpRight size={15} /></a></article>;
}

function FinancialRecordCard({ record }: { record: FinancialRecord }) {
  return <article className="record-card"><div className="record-title"><div><h2>{record.institutionName}</h2>{record.englishName && <p>{record.englishName}</p>}</div><span>{record.province}</span></div><div className="chips"><span>{record.regime}</span><span>{record.regionType}</span><span>{record.batch}</span>{record.year && <span>{record.year}</span>}{record.serviceTypes.map((tag) => <span key={tag}>{tag}</span>)}</div><dl className="record-meta"><div><dt>许可 / 报备编号</dt><dd>{record.recordNumber}</dd></div><div><dt>服务内容</dt><dd>{record.serviceContent}</dd></div><div><dt>服务渠道</dt><dd>{record.serviceChannel}</dd></div><div><dt>公告时间</dt><dd>{record.announcementDate}</dd></div>{record.note && <div><dt>备注</dt><dd>{record.note}</dd></div>}</dl><a className="source-link" href={record.sourceUrl} target="_blank" rel="noreferrer">查看来源<ArrowUpRight size={15} /></a></article>;
}

function ProvincePanel({ data }: { data: Datum[] }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return <article className="chart-card chart-wide"><div className="chart-head"><h2>省市统计</h2><span>按备案 / 许可记录归集</span></div><div className="province-grid">{data.map((item) => <div key={item.label} className="province-cell" style={{ opacity: 0.42 + 0.58 * (item.value / max) }}><strong>{item.label}</strong><span>{item.value}</span></div>)}</div></article>;
}

function useLawMatches(activeLaw: Law | FinancialLaw | undefined, lawQuery: string) {
  return useMemo(() => {
    if (!activeLaw) return [];
    const query = lawQuery.trim();
    return activeLaw.chapters.map((chapter) => ({ ...chapter, articles: chapter.articles.filter((article) => !query || includesText(article.text, query)) }));
  }, [activeLaw, lawQuery]);
}

function LawPanel({ laws, selectedLaw, setSelectedLaw, lawQuery, setLawQuery, lawMatches, activeLaw }: { laws: Array<Law | FinancialLaw>; selectedLaw: number; setSelectedLaw: (value: number) => void; lawQuery: string; setLawQuery: (value: string) => void; lawMatches: Array<{ chapter: string; articles: Array<{ number: string; text: string }> }>; activeLaw?: Law | FinancialLaw }) {
  return <section className="law-layout"><aside className="law-nav">{laws.map((law, index) => <button className={index === selectedLaw ? "active" : ""} key={law.title} onClick={() => setSelectedLaw(index)}>{law.title}</button>)}</aside><section className="law-panel">{activeLaw && <><div className="law-head"><div><h2>{activeLaw.title}</h2><p>施行日期：{activeLaw.effectiveDate}</p></div>{activeLaw.sourceUrl && <a href={activeLaw.sourceUrl} target="_blank" rel="noreferrer">来源<ArrowUpRight size={15} /></a>}</div><label className="field search-field law-search"><span>条文关键词</span><Search size={17} /><input value={lawQuery} onChange={(event) => setLawQuery(event.target.value)} placeholder="输入关键词" /></label><div className="articles">{lawMatches.map((chapter) => <section key={chapter.chapter}>{chapter.articles.length > 0 && <h3>{chapter.chapter}</h3>}{chapter.articles.map((article) => <article key={article.number}><strong>{article.number}</strong><p>{cleanArticleText(article.number, article.text)}</p></article>)}</section>)}</div></>}</section></section>;
}

function SourceList({ sources }: { sources: Array<FinancialSource | (Source & { type?: string; recordCount?: number; loadedCount?: number })> }) {
  return <section className="sources-list">{sources.map((source) => <article className="source-card" key={`${source.title}-${source.batch}-${source.localFile}`}><div><h2>{source.title}</h2><p>{source.type || "来源"} · {source.batch} · {source.date}</p>{source.message && <small>{source.message}</small>}</div><span className={source.status === "loaded" ? "ok" : "warn"}>{source.status === "loaded" ? "已载入" : "待补附件"}</span>{typeof source.loadedCount === "number" && <b>{source.loadedCount}/{source.recordCount || 0}</b>}<a href={source.url} target="_blank" rel="noreferrer">官方公告<ArrowUpRight size={15} /></a></article>)}</section>;
}

function BackTop() {
  return <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑</button>;
}

function App() {
  const [module, setModule] = useState<Module>("archive");
  if (module === "archive") return <ArchiveLanding onOpen={setModule} />;
  if (module === "financial") return <FinancialModule onBack={() => setModule("archive")} />;
  return <AlgorithmModule onBack={() => setModule("archive")} />;
}

export default App;
