import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { loadDashboardRows } from "./data.js";

// ---------------------------------------------------------------------------
// Icons (inline SVG components, stroke-based, no external icon library)
// ---------------------------------------------------------------------------
const svgProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

const IconGauge = () => <svg {...svgProps}><path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /></svg>;
const IconGlobe = () => <svg {...svgProps}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
const IconClock = () => <svg {...svgProps}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
const IconDocument = () => <svg {...svgProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>;
const IconLink = () => <svg {...svgProps}><path d="M10 13a5 5 0 0 0 7.07 0l1.93-1.93a5 5 0 0 0-7.07-7.07L10.5 5.5" /><path d="M14 11a5 5 0 0 0-7.07 0l-1.93 1.93a5 5 0 0 0 7.07 7.07L13.5 18.5" /></svg>;
const IconStopwatch = () => <svg {...svgProps}><path d="M10 2h4" /><path d="M12 14v-4" /><circle cx="12" cy="14" r="8" /></svg>;
const IconImage = () => <svg {...svgProps}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>;
const IconHand = () => <svg {...svgProps}><path d="M18 11V6a2 2 0 0 0-4 0v5" /><path d="M14 10V4a2 2 0 0 0-4 0v6" /><path d="M10 10.5V6a2 2 0 0 0-4 0v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></svg>;
const IconLayers = () => <svg {...svgProps}><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /></svg>;
const IconActivity = () => <svg {...svgProps}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;
const IconWheelchair = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="4" r="1.6" fill="currentColor" stroke="none" /><path d="M11 6v5l-4 6" /><path d="M11 11h5" /><path d="M13 11l3 7" /><path d="M7 17a4 4 0 1 0 7.6-1.8" /></svg>;
const IconAward = () => <svg {...svgProps}><circle cx="12" cy="8" r="6" /><path d="M15.48 13.4 17 22l-5-3-5 3 1.52-8.6" /></svg>;
const IconSearch = () => <svg {...svgProps}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>;
const IconBarChart = () => <svg {...svgProps}><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>;

// ---------------------------------------------------------------------------
// Threshold -> CSS class helpers (Lighthouse standard breakpoints)
// ---------------------------------------------------------------------------
const grade = {
  fcp: s => (s == null ? "muted" : s <= 1.8 ? "good" : s <= 3.0 ? "warn" : "bad"),
  lcp: s => (s == null ? "muted" : s <= 2.5 ? "good" : s <= 4.0 ? "warn" : "bad"),
  tbt: ms => (ms == null ? "muted" : ms <= 200 ? "good" : ms <= 600 ? "warn" : "bad"),
  cls: v => (v == null ? "muted" : v <= 0.1 ? "good" : v <= 0.25 ? "warn" : "bad"),
  si: s => (s == null ? "muted" : s <= 3.4 ? "good" : s <= 5.8 ? "warn" : "bad"),
  score: v => (v == null ? "muted" : v >= 90 ? "good" : v >= 50 ? "warn" : "bad")
};

const fmt = (v, digits = 1, suffix = "") => (v == null || isNaN(v) ? "—" : v.toFixed(digits) + suffix);
const fmtMs = v => (v == null || isNaN(v) ? "—" : Math.round(v) + " ms");

function avg(nums) {
  const v = nums.filter(n => n != null && !isNaN(n));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
function minOf(nums) {
  const v = nums.filter(n => n != null && !isNaN(n));
  return v.length ? Math.min(...v) : null;
}
function maxOf(nums) {
  const v = nums.filter(n => n != null && !isNaN(n));
  return v.length ? Math.max(...v) : null;
}
function donutGradient(pct, color) {
  return pct == null ? "#e7eaf0" : `conic-gradient(${color} ${pct * 3.6}deg, #e7eaf0 0deg)`;
}

// ---------------------------------------------------------------------------
// Presentational components
// ---------------------------------------------------------------------------
function BrandBar() {
  return (
    <header className="brand-bar">
      <img className="logo-left" src="/Assets/vi-logo.png" alt="VI" />
      <div className="brand-stripe"><span className="s1" /><span className="s2" /><span className="s3" /></div>
      <img className="logo-right" src="/Assets/IGS_Main_Logo.BJcAJana_1NGxFy.webp" alt="IGS Engineering Quality" />
    </header>
  );
}

function HeroStats({ rows }) {
  const bestPageLoad = minOf(rows.map(r => r.pageLoad));
  const worstPageLoad = maxOf(rows.map(r => r.pageLoad));
  const avgPageLoad = avg(rows.map(r => r.pageLoad));

  return (
    <div className="hero-stats">
      <div className="stat-card">
        <div className="icon icon-bg-blue"><IconDocument /></div>
        <div><div className="val">{rows.length}</div><div className="lbl">Pages Tested</div></div>
      </div>
      <div className="stat-card">
        <div className="icon icon-bg-green"><IconStopwatch /></div>
        <div><div className="val">{fmt(bestPageLoad, 2, " s")}</div><div className="lbl">Best Page Load</div></div>
      </div>
      <div className="stat-card">
        <div className="icon icon-bg-red"><IconStopwatch /></div>
        <div><div className="val">{fmt(worstPageLoad, 2, " s")}</div><div className="lbl">Worst Page Load</div></div>
      </div>
      <div className="stat-card">
        <div className="icon icon-bg-blue"><IconBarChart /></div>
        <div><div className="val">{fmt(avgPageLoad, 2, " s")}</div><div className="lbl">Avg Page Load</div></div>
      </div>
    </div>
  );
}

function Hero({ rows, lastUpdated }) {
  return (
    <section className="hero">
      <div className="hero-left">
        <div className="hero-icon"><IconGauge /></div>
        <div>
          <h1>WEBSITE PERFORMANCE REPORT
            <span className="live-badge"><span className="dot" />PROTOTYPE</span>
          </h1>
          <div className="hero-sub">
            <span><IconGlobe /></span><span>Environment: Browsing History Audit</span>
            <span><IconClock /></span><span>Last Updated: {lastUpdated}</span>
          </div>
        </div>
      </div>
      <HeroStats rows={rows} />
    </section>
  );
}

function BulkAuditPanel({ onAuditComplete }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [running, setRunning] = useState(false);

  function parseUrls(raw) {
    return [...new Set(raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean))];
  }

  function updateItem(index, patch) {
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  async function runBulk() {
    const urls = parseUrls(text);
    if (!urls.length) return;
    setRunning(true);
    setItems(urls.map(url => ({ url, status: "queued", message: "" })));

    for (let i = 0; i < urls.length; i++) {
      updateItem(i, { status: "running" });
      try {
        const res = await fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urls[i] })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          updateItem(i, { status: "error", message: data.error || `HTTP ${res.status}` });
        } else if (data.message) {
          updateItem(i, { status: "skipped", message: data.message });
        } else {
          updateItem(i, { status: "done", message: "Audited" });
        }
      } catch (e) {
        updateItem(i, { status: "error", message: e.message });
      }
      onAuditComplete?.();
    }
    setRunning(false);
  }

  const statusClass = { done: "good", error: "bad", skipped: "warn", running: "muted", queued: "muted" };
  const doneCount = items.filter(i => i.status === "done" || i.status === "skipped" || i.status === "error").length;

  return (
    <div className="panel bulk-audit-panel">
      <div className="panel-title">Bulk Audit</div>
      <div className="panel-body">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={"Paste URLs, one per line"}
          disabled={running}
        />
        <div className="bulk-audit-actions">
          <button className="bulk-run-btn" onClick={runBulk} disabled={running || !text.trim()}>
            {running ? `Auditing ${doneCount}/${items.length}...` : "Run Bulk Audit"}
          </button>
          {!running && items.length > 0 && (
            <span className="bulk-audit-summary">
              {items.filter(i => i.status === "done").length} audited, {items.filter(i => i.status === "skipped").length} skipped, {items.filter(i => i.status === "error").length} failed
            </span>
          )}
        </div>
        {items.length > 0 && (
          <div className="bulk-audit-list">
            {items.map((it, i) => (
              <div className="bulk-audit-item" key={i}>
                <span className={`bulk-audit-status ${statusClass[it.status]}`}>{it.status}</span>
                <span className="bulk-audit-url" title={it.url}>{it.url}</span>
                {it.message && <span className="bulk-audit-msg" title={it.message}>{it.message}</span>}
              </div>
            ))}
          </div>
        )}
        {/* <p className="no-data-note">Only myvi.in URLs are audited — anything else is rejected automatically. Audits run one at a time and take ~1-2 min each.</p> */}
      </div>
    </div>
  );
}

function ReportTable({ rows }) {
  const tableWrapRef = useRef(null);
  const stickyBarRef = useRef(null);
  const tableRef = useRef(null);
  const syncingRef = useRef(false);
  const [scrollWidth, setScrollWidth] = useState(0);

  useLayoutEffect(() => {
    function measure() {
      if (tableRef.current) setScrollWidth(tableRef.current.scrollWidth);
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (tableRef.current) ro.observe(tableRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [rows]);

  function handleTableScroll() {
    if (syncingRef.current) { syncingRef.current = false; return; }
    if (stickyBarRef.current) {
      syncingRef.current = true;
      stickyBarRef.current.scrollLeft = tableWrapRef.current.scrollLeft;
    }
  }
  function handleStickyScroll() {
    if (syncingRef.current) { syncingRef.current = false; return; }
    if (tableWrapRef.current) {
      syncingRef.current = true;
      tableWrapRef.current.scrollLeft = stickyBarRef.current.scrollLeft;
    }
  }

  return (
    <div className="table-scroll-region">
    <section className="table-wrap" ref={tableWrapRef} onScroll={handleTableScroll}>
      <table ref={tableRef}>
        <thead>
          <tr className="group-row">
            <th></th><th></th><th></th>
            <th colSpan="5">Performance</th>
            <th></th><th></th><th></th><th></th>
          </tr>
          <tr className="col-row">
            <th style={{ width: 40 }}>#</th>
            <th className="col-page"><div className="th-inner"><IconDocument /><span>Page</span></div></th>
            <th className="col-url"><div className="th-inner"><IconLink /><span>URL</span></div></th>
            <th><div className="th-inner"><IconStopwatch /><span>First Contentful Paint (s)</span></div></th>
            <th><div className="th-inner"><IconImage /><span>Largest Contentful Paint (s)</span></div></th>
            <th><div className="th-inner"><IconHand /><span>Total Blocking Time (ms)</span></div></th>
            <th><div className="th-inner"><IconLayers /><span>Cumulative Layout Shift</span></div></th>
            <th><div className="th-inner"><IconActivity /><span>Speed Index (s)</span></div></th>
            <th><div className="th-inner"><IconWheelchair /><span>Accessibility</span></div></th>
            <th><div className="th-inner"><IconAward /><span>Best Practices</span></div></th>
            <th><div className="th-inner"><IconSearch /><span>SEO</span></div></th>
            <th><div className="th-inner"><IconStopwatch /><span>Page Load Time (s)</span></div></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan="12" style={{ textAlign: "center", padding: 24, color: "#98a2b3" }}>No successful audits available.</td></tr>
          ) : rows.map((r, i) => (
            <tr key={r.websiteId}>
              <td className="col-idx"><span className="idx-badge">{i + 1}</span></td>
              <td className="col-page"><div className="page-row"><IconDocument /><span>{r.page}</span></div></td>
              <td className="col-url">
                <a href={r.url} target="_blank" rel="noopener noreferrer" title={r.url}>
                  <IconLink /><span>{r.url}</span>
                </a>
              </td>
              <td className={grade.fcp(r.fcp)}>{fmt(r.fcp, 1, " s")}</td>
              <td className={grade.lcp(r.lcp)}>{fmt(r.lcp, 1, " s")}</td>
              <td className={grade.tbt(r.tbt)}>{fmtMs(r.tbt)}</td>
              <td className={grade.cls(r.clsVal)}>{r.clsVal == null ? "—" : r.clsVal.toFixed(3)}</td>
              <td className={grade.si(r.si)}>{fmt(r.si, 1, " s")}</td>
              <td className={grade.score(r.accessibility)}>{r.accessibility == null ? "—" : r.accessibility + "%"}</td>
              <td className={grade.score(r.bestPractices)}>{r.bestPractices == null ? "—" : r.bestPractices + "%"}</td>
              <td className={grade.score(r.seo)}>{r.seo == null ? "—" : r.seo + "%"}</td>
              <td className="muted">{r.pageLoad == null ? "—" : fmt(r.pageLoad, 2, " s")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
    {scrollWidth > 0 && (
      <div className="sticky-scrollbar" ref={stickyBarRef} onScroll={handleStickyScroll}>
        <div style={{ width: scrollWidth }} />
      </div>
    )}
    </div>
  );
}

function OverviewPanel({ rows }) {
  const bestFcp = minOf(rows.map(r => r.fcp));
  const avgFcp = avg(rows.map(r => r.fcp));
  const worstLcp = maxOf(rows.map(r => r.lcp));
  const highTbt = maxOf(rows.map(r => r.tbt));
  const highSi = maxOf(rows.map(r => r.si));
  const highPageLoad = maxOf(rows.map(r => r.pageLoad));

  const items = [
    { icon: <IconStopwatch />, bg: "icon-bg-green", val: fmt(bestFcp, 1, " s"), lbl: "Best FCP (Fastest)" },
    { icon: <IconStopwatch />, bg: "icon-bg-orange", val: fmt(avgFcp, 1, " s"), lbl: "Avg FCP" },
    { icon: <IconImage />, bg: "icon-bg-red", val: fmt(worstLcp, 1, " s"), lbl: "Worst LCP (Slowest)" },
    { icon: <IconHand />, bg: "icon-bg-red", val: fmtMs(highTbt), lbl: "Highest TBT" },
    { icon: <IconGauge />, bg: "icon-bg-navy", val: fmt(highSi, 1, " s"), lbl: "Highest Speed Index" },
    { icon: <IconStopwatch />, bg: "icon-bg-red", val: fmt(highPageLoad, 2, " s"), lbl: "Highest Page Load" }
  ];

  return (
    <div className="panel">
      <div className="panel-title">Performance Overview</div>
      <div className="panel-body">
        <div className="mini-stats">
          {items.map((it, i) => (
            <div className="mini-stat" key={i}>
              <div className={`icon ${it.bg}`}>{it.icon}</div>
              <div className="val">{it.val}</div>
              <div className="lbl">{it.lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreDistributionPanel({ rows }) {
  const donuts = [
    { pct: avg(rows.map(r => r.accessibility)), color: "var(--acc-orange)", lbl: "Accessibility" },
    { pct: avg(rows.map(r => r.bestPractices)), color: "var(--acc-green)", lbl: "Best Practices" },
    { pct: avg(rows.map(r => r.seo)), color: "var(--acc-blue)", lbl: "SEO" },
    { pct: avg(rows.map(r => r.performance)), color: "var(--acc-purple)", lbl: "Performance" }
  ];
  return (
    <div className="panel">
      <div className="panel-title">Score Distribution</div>
      <div className="panel-body">
        <div className="donut-row">
          {donuts.map((d, i) => (
            <div className="donut-item" key={i}>
              <div className="donut" style={{ background: donutGradient(d.pct, d.color) }}>
                <span>{d.pct == null ? "—" : Math.round(d.pct) + "%"}</span>
              </div>
              <div className="lbl">{d.lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RatingPanel({ rows }) {
  const times = rows.map(r => r.pageLoad).filter(v => v != null && !isNaN(v));
  const total = times.length;
  const fast = times.filter(t => t < 1).length;
  const moderate = times.filter(t => t >= 1 && t <= 2).length;
  const slow = times.filter(t => t > 2).length;

  const pct = n => (total ? Math.round((n / total) * 100) : 0);
  const fastPct = pct(fast);
  const moderatePct = pct(moderate);

  const fastDeg = total ? (fast / total) * 360 : 0;
  const moderateDeg = total ? (moderate / total) * 360 : 0;
  const donutBg = total
    ? `conic-gradient(var(--good) 0deg ${fastDeg}deg, var(--warn) ${fastDeg}deg ${fastDeg + moderateDeg}deg, var(--bad) ${fastDeg + moderateDeg}deg 360deg)`
    : "#e7eaf0";

  return (
    <div className="panel">
      <div className="panel-title">Performance Rating (Page Load Time)</div>
      <div className="rating-body">
        <div className="rating-donut" style={{ background: donutBg }}>
          <div className="center">
            {total ? (
              <>
                <div className="pct">{fastPct}%</div>
                <div className="sub">Fast</div>
              </>
            ) : (
              <>
                <div className="pct no-data">No data</div>
                <div className="sub">yet</div>
              </>
            )}
          </div>
        </div>
        <div className="rating-legend">
          <div className="row"><span className="dot" style={{ background: "var(--good)" }} /><span className="txt">Fast (&lt; 1s)</span><span className="count">{total ? `${fast} pages (${fastPct}%)` : "—"}</span></div>
          <div className="row"><span className="dot" style={{ background: "var(--warn)" }} /><span className="txt">Moderate (1s - 2s)</span><span className="count">{total ? `${moderate} pages (${moderatePct}%)` : "—"}</span></div>
          <div className="row"><span className="dot" style={{ background: "var(--bad)" }} /><span className="txt">Slow (&gt; 2s)</span><span className="count">{total ? `${slow} pages (${pct(slow)}%)` : "—"}</span></div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [rows, setRows] = useState([]);
  const [lastUpdated, setLastUpdated] = useState("—");
  const [error, setError] = useState(null);

  function load() {
    loadDashboardRows()
      .then(data => {
        setRows(data);
        setLastUpdated(new Date().toLocaleString());
        setError(null);
      })
      .catch(e => setError(e.message));
  }

  useEffect(() => {
    load();
    // Poll in the background so newly-completed audits (e.g. from the Chrome
    // extension or the Next.js app's manual "Run Audit") show up without a
    // manual refresh.
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page">
      <BrandBar />
      <Hero rows={rows} lastUpdated={lastUpdated} />
      <BulkAuditPanel onAuditComplete={load} />
      {error ? (
        <div style={{ color: "var(--bad)", textAlign: "center", padding: 20 }}>Failed to load data: {error}</div>
      ) : (
        <>
          <ReportTable rows={rows} />
          <section className="summary-grid">
            <OverviewPanel rows={rows} />
            <ScoreDistributionPanel rows={rows} />
            <RatingPanel rows={rows} />
          </section>
        </>
      )}
    </div>
  );
}
