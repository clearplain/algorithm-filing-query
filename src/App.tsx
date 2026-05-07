import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, Database, Download, FileText, FilterX, RefreshCw, Search } from "lucide-react";
import type { Facets, FilingRecord, Law, Source, Stats } from "./types";

type View = "records" | "trends" | "laws" | "sources";
type Filters = { query: string; filingType: string; batch: string; algorithmClass: string; province: string; domainTag: string };
type ChartDatum = { label: string; value: number };
type Series = { label: string; values: number[]; color: string };

const emptyFilters: Filters = { query: "", filingType: "", batch: "", algorithmClass: "", province: "", domainTag: "" };
const actionsUrl = import.meta.env.VITE_GITHUB_ACTIONS_URL || "https://github.com/settings/repositories";
const palette = ["#2563eb", "#f97316", "#16a34a", "#dc2626", "#7c3aed", "#0891b2", "#ca8a04", "#db2777", "#4f46e5", "#059669", "#ea580c", "#64748b"];
const domainRuleText = [
  "新闻资讯：新闻、资讯、文章、信息流、热点、时政",
  "短视频/直播：短视频、视频、直播、视听、音视频、频道",
  "电商/本地生活：电商、购物、商品、营销、外卖、团购、商家、消费",
  "社交/社区：社交、社区、好友、话题、评论、互动、论坛",
  "搜索/浏览器：搜索、检索、浏览器、问答",
  "出行/交通：出行、打车、导航、交通、车辆、网约车、地图",
  "教育/学习：教育、学习、课程、题库、作业、培训",
  "生成合成：生成、合成、AIGC、大模型、对话、绘图、数字人、语音、人脸",
];

function includesText(source: string, query: string) {
  return source.toLowerCase().includes(query.toLowerCase());
}

function matchesRecord(record: FilingRecord, filters: Filters) {
  const query = filters.query.trim();
  if (query) {
    const haystack = [record.entityName, record.algorithmName, record.recordNumber, record.product, record.purpose].join(" ");
    if (!includesText(haystack, query)) return false;
  }
  if (filters.filingType && record.filingType !== filters.filingType) return false;
  if (filters.batch && record.batch !== filters.batch) return false;
  if (filters.algorithmClass && record.algorithmClass !== filters.algorithmClass) return false;
  if (filters.province && record.province !== filters.province) return false;
  if (filters.domainTag && !record.domainTags.includes(filters.domainTag)) return false;
  return true;
}

function batchOrder(batch: string) {
  const match = batch.match(/(\d{4})年(\d{1,2})月/);
  return match ? Number(match[1]) * 100 + Number(match[2]) : 0;
}

function countBy(records: FilingRecord[], picker: (record: FilingRecord) => string | string[]) {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    const values = picker(record);
    (Array.isArray(values) ? values : [values]).filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  });
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function buildSeries(records: FilingRecord[], labels: string[], picker: (record: FilingRecord) => string | string[]) {
  const batches = [...new Set(records.map((record) => record.batch))].sort((a, b) => batchOrder(a) - batchOrder(b));
  const series = labels.map((label, index) => ({
    label,
    color: palette[index % palette.length],
    values: batches.map((batch) => records.filter((record) => {
      const values = picker(record);
      return record.batch === batch && (Array.isArray(values) ? values.includes(label) : values === label);
    }).length),
  }));
  return { batches, series };
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">全部</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong></div>;
}

function PiePanel({ title, data, showRules = false }: { title: string; data: ChartDatum[]; showRules?: boolean }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let current = 0;
  const gradient = data.slice(0, 8).map((item, index) => {
    const start = current;
    current += total ? (item.value / total) * 100 : 0;
    return `${palette[index % palette.length]} ${start}% ${current}%`;
  }).join(", ");
  return (
    <article className="chart-card">
      <div className="chart-head"><h2>{title}</h2><span>{total.toLocaleString()} 项</span></div>
      <div className="pie-wrap">
        <div className="pie" style={{ background: `conic-gradient(${gradient})` }} />
        <div className="legend-list">
          {data.slice(0, 8).map((item, index) => (
            <div key={item.label}><i style={{ background: palette[index % palette.length] }} /><span>{item.label}</span><strong>{item.value}</strong></div>
          ))}
        </div>
      </div>
      {showRules && (
        <div className="rule-panel">
          <strong>分类规则</strong>
          <div>{domainRuleText.map((item) => <span key={item}>{item}</span>)}</div>
        </div>
      )}
    </article>
  );
}

function LinePanel({ title, batches, series, scale = "linear" }: { title: string; batches: string[]; series: Series[]; scale?: "linear" | "sqrt" | "log" }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 760;
  const height = 280;
  const pad = 34;
  const max = Math.max(1, ...series.flatMap((item) => item.values));
  const transform = (value: number) => {
    if (scale === "sqrt") return Math.sqrt(value);
    if (scale === "log") return Math.log10(value + 1);
    return value;
  };
  const scaledMax = transform(max) || 1;
  const x = (index: number) => pad + (batches.length <= 1 ? 0 : index * ((width - pad * 2) / (batches.length - 1)));
  const y = (value: number) => height - pad - (transform(value) / scaledMax) * (height - pad * 2);
  const hoverX = hoverIndex === null ? null : x(hoverIndex);
  const hoverItems = hoverIndex === null ? [] : series.map((item) => ({ label: item.label, value: item.values[hoverIndex], color: item.color })).sort((a, b) => b.value - a.value);
  return (
    <article className="chart-card chart-wide">
      <div className="chart-head"><h2>{title}</h2><span>{batches.length} 个批次 · {scale === "linear" ? "线性刻度" : scale === "sqrt" ? "平方根刻度" : "对数刻度"}</span></div>
      <div className="line-shell">
      <svg
        className="line-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - rect.left) / rect.width;
          const rawX = ratio * width;
          const index = Math.max(0, Math.min(batches.length - 1, Math.round(((rawX - pad) / (width - pad * 2)) * (batches.length - 1))));
          setHoverIndex(index);
        }}
      >
        {[0, 1, 2, 3].map((tick) => {
          const yy = pad + tick * ((height - pad * 2) / 3);
          return <line key={tick} x1={pad} x2={width - pad} y1={yy} y2={yy} />;
        })}
        {hoverX !== null && <line className="hover-line" x1={hoverX} x2={hoverX} y1={pad} y2={height - pad} />}
        {series.map((item) => {
          const points = item.values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
          return (
            <g key={item.label}>
              <polyline points={points} stroke={item.color} />
              {hoverIndex !== null && <circle cx={x(hoverIndex)} cy={y(item.values[hoverIndex])} r="4" fill={item.color} />}
            </g>
          );
        })}
      </svg>
      {hoverIndex !== null && (
        <div className="hover-card">
          <strong>{batches[hoverIndex]}</strong>
          {hoverItems.map((item) => <span key={item.label}><i style={{ background: item.color }} />{item.label}<b>{item.value}</b></span>)}
        </div>
      )}
      </div>
      <div className="line-legend">
        {series.map((item) => <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>)}
      </div>
    </article>
  );
}

function TrendsView({ records }: { records: FilingRecord[] }) {
  const [trendMetric, setTrendMetric] = useState<"domain" | "class" | "province" | "filingType" | "role">("domain");
  const [lineCount, setLineCount] = useState(8);
  const [scale, setScale] = useState<"linear" | "sqrt" | "log">("sqrt");
  const domainData = countBy(records, (record) => record.domainTags).slice(0, 8);
  const classDataAll = countBy(records, (record) => record.algorithmClass);
  const classData = classDataAll.slice(0, 10);
  const provinceData = countBy(records, (record) => record.province).filter((item) => item.label !== "未识别").slice(0, 8);
  const filingTypeData = countBy(records, (record) => record.filingType);
  const roleData = countBy(records.filter((record) => record.filingType === "深度合成服务算法备案"), (record) => record.role || record.algorithmClass);
  const trendConfigs = {
    domain: { title: "应用领域备案趋势", data: countBy(records, (record) => record.domainTags), picker: (record: FilingRecord) => record.domainTags },
    class: { title: "算法类型 / 角色趋势", data: classDataAll, picker: (record: FilingRecord) => record.algorithmClass },
    province: { title: "省份备案趋势", data: countBy(records, (record) => record.province).filter((item) => item.label !== "未识别"), picker: (record: FilingRecord) => record.province },
    filingType: { title: "备案类型趋势", data: filingTypeData, picker: (record: FilingRecord) => record.filingType },
    role: { title: "深度合成角色趋势", data: roleData, picker: (record: FilingRecord) => record.role || record.algorithmClass },
  };
  const activeTrend = trendConfigs[trendMetric];
  const activeSeries = buildSeries(records, activeTrend.data.slice(0, lineCount).map((item) => item.label), activeTrend.picker);
  const classTrend = buildSeries(records, classData.slice(0, 8).map((item) => item.label), (record) => record.algorithmClass);
  const provinceTrend = buildSeries(records, provinceData.slice(0, 5).map((item) => item.label), (record) => record.province);

  return (
    <section className="trend-page">
      <div className="trend-hero">
        <div><p className="eyebrow">Trend Intelligence</p><h2>趋势分析</h2></div>
        <span>按公告批次、领域、算法类型与属地拆解备案结构</span>
      </div>
      <div className="chart-grid">
        <PiePanel title="应用领域结构" data={domainData} showRules />
        <PiePanel title="省份结构" data={provinceData} />
        <article className="chart-card chart-wide">
          <div className="chart-head"><h2>趋势维度选择</h2><span>按实际数据库字段持续映射</span></div>
          <div className="trend-controls">
            <label><span>指标</span><select value={trendMetric} onChange={(event) => setTrendMetric(event.target.value as typeof trendMetric)}>
              <option value="domain">应用领域</option>
              <option value="class">算法类型 / 角色</option>
              <option value="province">所在省</option>
              <option value="filingType">备案类型</option>
              <option value="role">深度合成角色</option>
            </select></label>
            <label><span>显示数量</span><select value={lineCount} onChange={(event) => setLineCount(Number(event.target.value))}>
              <option value={5}>Top 5</option>
              <option value={8}>Top 8</option>
              <option value={12}>Top 12</option>
            </select></label>
            <label><span>刻度方式</span><select value={scale} onChange={(event) => setScale(event.target.value as typeof scale)}>
              <option value="sqrt">平方根刻度：抬升长尾</option>
              <option value="log">对数刻度：更强长尾对比</option>
              <option value="linear">线性刻度：真实比例</option>
            </select></label>
          </div>
        </article>
        <LinePanel title={activeTrend.title} batches={activeSeries.batches} series={activeSeries.series} scale={scale} />
        <LinePanel title="算法类型 / 角色趋势" batches={classTrend.batches} series={classTrend.series} scale={scale} />
        <LinePanel title="省份备案趋势" batches={provinceTrend.batches} series={provinceTrend.series} scale={scale} />
      </div>
    </section>
  );
}

function App() {
  const [records, setRecords] = useState<FilingRecord[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [laws, setLaws] = useState<Law[]>([]);
  const [view, setView] = useState<View>("records");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [lawQuery, setLawQuery] = useState("");
  const [selectedLaw, setSelectedLaw] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [recordsRes, facetsRes, statsRes, sourcesRes, lawsRes] = await Promise.all([
        fetch("./data/records.json"),
        fetch("./data/facets.json"),
        fetch("./data/stats.json"),
        fetch("./data/sources.json"),
        fetch("./data/laws.json"),
      ]);
      setRecords(await recordsRes.json());
      setFacets(await facetsRes.json());
      setStats(await statsRes.json());
      setSources(await sourcesRes.json());
      setLaws(await lawsRes.json());
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, []);

  const filteredRecords = useMemo(() => records.filter((record) => matchesRecord(record, filters)), [records, filters]);
  const visibleRecords = filteredRecords.slice(0, 200);
  const activeLaw = laws[selectedLaw];
  const lawMatches = useMemo(() => {
    if (!activeLaw) return [];
    const query = lawQuery.trim();
    return activeLaw.chapters.map((chapter) => ({ ...chapter, articles: chapter.articles.filter((article) => !query || includesText(article.text, query)) }));
  }, [activeLaw, lawQuery]);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div><p className="eyebrow">Personal Research Database</p><h1>算法备案查询系统</h1></div>
        <a className="icon-button primary" href={actionsUrl} target="_blank" rel="noreferrer" title="打开 GitHub Actions 更新抓取"><RefreshCw size={18} />更新抓取</a>
      </header>

      <section className="summary-band">
        <div className="summary-copy"><div><strong>数据统计</strong></div></div>
        <div className="stats-grid">
          <StatCard label="总记录" value={stats?.recordCount ?? "-"} />
          <StatCard label="算法备案" value={stats?.domesticCount ?? "-"} />
          <StatCard label="深度合成" value={stats?.deepCount ?? "-"} />
          <StatCard label="数据源" value={stats?.sourceCount ?? "-"} />
        </div>
      </section>

      <nav className="tabs" aria-label="主视图">
        <button className={view === "records" ? "active" : ""} onClick={() => setView("records")}><Database size={17} />备案查询</button>
        <button className={view === "trends" ? "active" : ""} onClick={() => setView("trends")}><Activity size={17} />趋势分析</button>
        <button className={view === "laws" ? "active" : ""} onClick={() => setView("laws")}><FileText size={17} />法条检索</button>
        <button className={view === "sources" ? "active" : ""} onClick={() => setView("sources")}><ArrowUpRight size={17} />来源记录</button>
      </nav>

      {loading && <div className="empty">正在载入数据</div>}
      {!loading && view === "trends" && <TrendsView records={records} />}

      {!loading && view === "records" && facets && (
        <section className="workspace">
          <aside className="filters">
            <label className="field search-field"><span>企业 / 算法 / 编号</span><Search size={17} /><input value={filters.query} onChange={(event) => setFilter("query", event.target.value)} placeholder="输入关键词" /></label>
            <SelectField label="备案类型" value={filters.filingType} options={facets.filingTypes} onChange={(value) => setFilter("filingType", value)} />
            <SelectField label="批次" value={filters.batch} options={facets.batches} onChange={(value) => setFilter("batch", value)} />
            <SelectField label="算法类型 / 角色" value={filters.algorithmClass} options={facets.algorithmClasses} onChange={(value) => setFilter("algorithmClass", value)} />
            <SelectField label="应用领域" value={filters.domainTag} options={facets.domainTags} onChange={(value) => setFilter("domainTag", value)} />
            <SelectField label="所在省" value={filters.province} options={facets.provinces} onChange={(value) => setFilter("province", value)} />
            <button className="secondary-button" onClick={() => setFilters(emptyFilters)}><FilterX size={17} />清空筛选</button>
            <a className="secondary-button" href="./data/records.csv" download><Download size={17} />导出 CSV</a>
          </aside>
          <section className="results">
            <div className="result-head"><div><strong>{filteredRecords.length}</strong><span>条匹配记录</span></div><span>当前显示前 {visibleRecords.length} 条</span></div>
            <div className="record-list">
              {visibleRecords.map((record) => (
                <article className="record-card" key={record.id}>
                  <div className="record-title"><div><h2>{record.algorithmName}</h2><p>{record.entityName}</p></div><span>{record.province}</span></div>
                  <div className="chips"><span>{record.filingType}</span><span>{record.batch}</span><span>{record.algorithmClass || "未标注"}</span>{record.domainTags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                  <dl className="record-meta">
                    <div><dt>应用产品</dt><dd>{record.product}</dd></div>
                    <div><dt>备案编号</dt><dd>{record.recordNumber}</dd></div>
                    <div><dt>主要用途</dt><dd>{record.purpose}</dd></div>
                    {record.remark && <div><dt>备注</dt><dd>{record.remark}</dd></div>}
                  </dl>
                  <a className="source-link" href={record.sourceUrl} target="_blank" rel="noreferrer">查看来源<ArrowUpRight size={15} /></a>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}

      {!loading && view === "laws" && (
        <section className="law-layout">
          <aside className="law-nav">{laws.map((law, index) => <button className={index === selectedLaw ? "active" : ""} key={law.title} onClick={() => setSelectedLaw(index)}>{law.title}</button>)}</aside>
          <section className="law-panel">
            {activeLaw && (
              <>
                <div className="law-head"><div><h2>{activeLaw.title}</h2><p>施行日期：{activeLaw.effectiveDate}</p></div><a href={activeLaw.sourceUrl} target="_blank" rel="noreferrer">官方来源<ArrowUpRight size={15} /></a></div>
                <label className="field search-field law-search"><span>法条关键词</span><Search size={17} /><input value={lawQuery} onChange={(event) => setLawQuery(event.target.value)} placeholder="输入关键词" /></label>
                <div className="articles">{lawMatches.map((chapter) => <section key={chapter.chapter}>{chapter.articles.length > 0 && <h3>{chapter.chapter}</h3>}{chapter.articles.map((article) => <article key={article.number}><strong>{article.number}</strong><p>{article.text}</p></article>)}</section>)}</div>
              </>
            )}
          </section>
        </section>
      )}

      {!loading && view === "sources" && (
        <section className="sources-list">
          {sources.map((source) => <article className="source-card" key={`${source.title}-${source.batch}-${source.localFile}`}><div><h2>{source.title}</h2><p>{source.batch} · {source.date}</p></div><span>{source.status}</span><a href={source.url} target="_blank" rel="noreferrer">官方公告<ArrowUpRight size={15} /></a></article>)}
        </section>
      )}
    </main>
  );
}

export default App;
