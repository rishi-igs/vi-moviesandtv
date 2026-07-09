import { useState, useEffect, useRef, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { loadDashboardRows, loadInFlightAudits, loadCurrentBatch, startBulkAudit, loadAllAudits, loadAuditDiagnostics } from "./data.js";

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
            <span className="live-badge"><span className="dot" />LIVE</span>
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

function InFlightPanel({ items }) {
  if (!items.length) return null;
  return (
    <div className="panel in-flight-panel">
      <div className="panel-title">Currently Auditing ({items.length})</div>
      <div className="panel-body">
        <div className="bulk-audit-list">
          {items.map(it => (
            <div className="bulk-audit-item" key={it.websiteId}>
              <span className="bulk-audit-status muted">running</span>
              <span className="bulk-audit-url" title={it.url}>{it.url}</span>
              <span className="bulk-audit-msg">{Math.max(0, Math.round((Date.now() - it.startedAt) / 1000))}s elapsed</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BulkAuditPanel() {
  const [text, setText] = useState("");
  const [batch, setBatch] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);

  function parseUrls(raw) {
    return [...new Set(raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean))];
  }

  useEffect(() => {
    function poll() {
      loadCurrentBatch().then(setBatch).catch(() => {});
    }
    poll();
    // Polls the server-tracked batch rather than driving progress locally, so
    // this reflects the true state even after a refresh or a closed tab.
    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, []);

  const items = batch?.items ?? [];
  const running = items.some(it => it.status === "queued" || it.status === "running");

  async function runBulk() {
    const urls = parseUrls(text);
    if (!urls.length) return;
    setStarting(true);
    setStartError(null);
    try {
      const newBatch = await startBulkAudit(urls);
      setBatch(newBatch);
      setText("");
    } catch (e) {
      setStartError(e.message);
    } finally {
      setStarting(false);
    }
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
          disabled={running || starting}
        />
        <div className="bulk-audit-actions">
          <button className="bulk-run-btn" onClick={runBulk} disabled={running || starting || !text.trim()}>
            {running ? `Auditing ${doneCount}/${items.length}...` : starting ? "Starting..." : "Run Bulk Audit"}
          </button>
          {!running && items.length > 0 && (
            <span className="bulk-audit-summary">
              {items.filter(i => i.status === "done").length} audited, {items.filter(i => i.status === "skipped").length} skipped, {items.filter(i => i.status === "error").length} failed
            </span>
          )}
        </div>
        {startError && <div className="bulk-audit-error">{startError}</div>}
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
        {/* <p className="no-data-note">Only myvi.in URLs are audited — anything else is rejected automatically. Audits run one at a time (~1-2 min each) on the server, so progress here survives a refresh or a closed tab.</p> */}
      </div>
    </div>
  );
}

function MetricTooltip({ anchorRect, loading, hasData, entries }) {
  if (!anchorRect) return null;
  const width = 320;
  const maxHeight = 360;
  const gap = 8;
  const margin = 12;

  const spaceBelow = window.innerHeight - anchorRect.bottom - gap - margin;
  const spaceAbove = anchorRect.top - gap - margin;

  // Flip above the cell when there isn't room below, and clamp the height to
  // whichever side actually has room so the box (and its own scrollbar) never
  // runs off the bottom or top of the viewport.
  let top, height;
  if (spaceBelow >= 160 || spaceBelow >= spaceAbove) {
    height = Math.max(120, Math.min(maxHeight, spaceBelow));
    top = anchorRect.bottom + gap;
  } else {
    height = Math.max(120, Math.min(maxHeight, spaceAbove));
    top = anchorRect.top - gap - height;
  }

  const style = {
    top,
    left: Math.min(Math.max(anchorRect.left, margin), window.innerWidth - width - margin),
    maxHeight: height
  };
  return createPortal(
    <div className="metric-tooltip" style={style}>
      {loading ? (
        <div className="metric-tooltip-loading">Loading diagnosis…</div>
      ) : !hasData ? (
        <div className="metric-tooltip-loading">No diagnostic data for this audit — it ran before this feature was added.</div>
      ) : entries.length === 0 ? (
        <div className="metric-tooltip-loading metric-tooltip-ok">No issues found — this metric passed cleanly.</div>
      ) : (
        entries.map(e => (
          <div className="metric-tooltip-item" key={e.id}>
            <div className="metric-tooltip-title">
              {e.title}
              {e.displayValue ? <span className="metric-tooltip-value"> — {e.displayValue}</span> : null}
            </div>
            <div className="metric-tooltip-desc">{e.description}</div>
            {e.learnMoreUrl && (
              <a className="metric-tooltip-fix" href={e.learnMoreUrl} target="_blank" rel="noopener noreferrer">
                How to fix this →
              </a>
            )}
          </div>
        ))
      )}
    </div>,
    document.body
  );
}

// Wraps a metric <td> with hover-to-diagnose: on hover, lazily fetches the
// real Lighthouse findings behind that specific audit's score for this
// metric and shows them in a tooltip portaled to <body> (so it isn't clipped
// by the table's horizontal scroll container).
function MetricCell({ auditId, metricKey, className, children }) {
  const cellRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [rect, setRect] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleEnter() {
    setHovered(true);
    if (cellRef.current) setRect(cellRef.current.getBoundingClientRect());
    if (diagnostics == null && !loading && auditId != null) {
      setLoading(true);
      loadAuditDiagnostics(auditId)
        .then(setDiagnostics)
        .finally(() => setLoading(false));
    }
  }

  const hasData = diagnostics != null;
  const entries = diagnostics?.[metricKey] ?? [];

  return (
    <td ref={cellRef} className={`${className} metric-cell`} onMouseEnter={handleEnter} onMouseLeave={() => setHovered(false)}>
      {children}
      {hovered && auditId != null && (
        <MetricTooltip anchorRect={rect} loading={loading} hasData={hasData} entries={entries} />
      )}
    </td>
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
            <tr key={r.auditId ?? r.websiteId}>
              <td className="col-idx"><span className="idx-badge">{i + 1}</span></td>
              <td className="col-page">
                <div className="page-row">
                  <IconDocument /><span>{r.page}</span>
                  {r.concurrentAudits > 1 && (
                    <span
                      className="noisy-badge"
                      title={`Ran alongside ${r.concurrentAudits - 1} other audit(s) at the same time — TBT, Speed Index, and performance score may be noisier than a solo run. Re-run this page alone for a trustworthy number.`}
                    >
                      ⚠
                    </span>
                  )}
                </div>
              </td>
              <td className="col-url">
                <a href={r.url} target="_blank" rel="noopener noreferrer" title={r.url}>
                  <IconLink /><span>{r.url}</span>
                </a>
              </td>
              <MetricCell auditId={r.auditId} metricKey="fcp" className={grade.fcp(r.fcp)}>{fmt(r.fcp, 1, " s")}</MetricCell>
              <MetricCell auditId={r.auditId} metricKey="lcp" className={grade.lcp(r.lcp)}>{fmt(r.lcp, 1, " s")}</MetricCell>
              <MetricCell auditId={r.auditId} metricKey="tbt" className={grade.tbt(r.tbt)}>{fmtMs(r.tbt)}</MetricCell>
              <MetricCell auditId={r.auditId} metricKey="cls" className={grade.cls(r.clsVal)}>{r.clsVal == null ? "—" : r.clsVal.toFixed(3)}</MetricCell>
              <MetricCell auditId={r.auditId} metricKey="si" className={grade.si(r.si)}>{fmt(r.si, 1, " s")}</MetricCell>
              <MetricCell auditId={r.auditId} metricKey="accessibility" className={grade.score(r.accessibility)}>{r.accessibility == null ? "—" : r.accessibility + "%"}</MetricCell>
              <MetricCell auditId={r.auditId} metricKey="bestPractices" className={grade.score(r.bestPractices)}>{r.bestPractices == null ? "—" : r.bestPractices + "%"}</MetricCell>
              <MetricCell auditId={r.auditId} metricKey="seo" className={grade.score(r.seo)}>{r.seo == null ? "—" : r.seo + "%"}</MetricCell>
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

function TabBar({ tab, setTab }) {
  const tabs = [
    { id: "report", label: "Report" },
    { id: "history", label: "History" },
    { id: "compare", label: "Compare" }
  ];
  return (
    <nav className="tab-bar">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`tab-btn ${tab === t.id ? "active" : ""}`}
          onClick={() => setTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

function HistoryTab({ audits }) {
  const pages = useMemo(() => {
    const map = new Map();
    audits.forEach(a => { if (!map.has(a.url)) map.set(a.url, a.page); });
    return [...map.entries()].map(([url, page]) => ({ url, page }));
  }, [audits]);

  const [selectedUrl, setSelectedUrl] = useState("");
  useEffect(() => {
    if ((!selectedUrl || !pages.some(p => p.url === selectedUrl)) && pages.length) {
      setSelectedUrl(pages[0].url);
    }
  }, [pages, selectedUrl]);

  const rows = audits
    .filter(a => a.url === selectedUrl)
    .sort((a, b) => new Date(b.auditedAt) - new Date(a.auditedAt));

  if (pages.length === 0) {
    return <p className="no-data-note">No completed audits yet.</p>;
  }

  return (
    <div>
      <div className="tab-controls">
        <label className="tab-controls-label">Page:</label>
        <select className="tab-select" value={selectedUrl} onChange={e => setSelectedUrl(e.target.value)}>
          {pages.map(p => <option key={p.url} value={p.url}>{p.page}</option>)}
        </select>
        <span className="bulk-audit-summary">{rows.length} audit{rows.length === 1 ? "" : "s"} recorded</span>
      </div>
      <ReportTable rows={rows} />
    </div>
  );
}

const compareMetrics = [
  { key: "performance", label: "Performance Score", better: "higher", fmt: v => (v == null ? "—" : v + "%") },
  { key: "accessibility", label: "Accessibility", better: "higher", fmt: v => (v == null ? "—" : v + "%") },
  { key: "bestPractices", label: "Best Practices", better: "higher", fmt: v => (v == null ? "—" : v + "%") },
  { key: "seo", label: "SEO", better: "higher", fmt: v => (v == null ? "—" : v + "%") },
  { key: "fcp", label: "First Contentful Paint", better: "lower", fmt: v => fmt(v, 1, " s") },
  { key: "lcp", label: "Largest Contentful Paint", better: "lower", fmt: v => fmt(v, 1, " s") },
  { key: "tbt", label: "Total Blocking Time", better: "lower", fmt: v => fmtMs(v) },
  { key: "clsVal", label: "Cumulative Layout Shift", better: "lower", fmt: v => (v == null ? "—" : v.toFixed(3)) },
  { key: "si", label: "Speed Index", better: "lower", fmt: v => fmt(v, 1, " s") },
  { key: "pageLoad", label: "Page Load Time", better: "lower", fmt: v => fmt(v, 2, " s") }
];

function CompareTab({ audits }) {
  const options = useMemo(
    () => [...audits].sort((a, b) => new Date(b.auditedAt) - new Date(a.auditedAt)),
    [audits]
  );
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (selectedIds.length === 0 && options.length > 0) {
      setSelectedIds(options.slice(0, 2).map(a => String(a.auditId)));
    }
  }, [options, selectedIds.length]);

  if (options.length === 0) {
    return <p className="no-data-note">No completed audits yet.</p>;
  }
  if (options.length < 2) {
    return <p className="no-data-note">Need at least two completed audits to compare.</p>;
  }

  function optionLabel(a) {
    return `${a.page} — ${new Date(a.auditedAt).toLocaleString()}`;
  }

  function updateSelected(index, value) {
    setSelectedIds(prev => prev.map((id, i) => (i === index ? value : id)));
  }

  function addSelector() {
    const used = new Set(selectedIds);
    const next = options.find(a => !used.has(String(a.auditId)));
    setSelectedIds(prev => [...prev, next ? String(next.auditId) : ""]);
  }

  function removeSelector(index) {
    setSelectedIds(prev => prev.filter((_, i) => i !== index));
  }

  const columns = selectedIds
    .map(id => options.find(a => String(a.auditId) === id))
    .filter(Boolean);

  return (
    <div>
      <div className="tab-controls compare-controls">
        {selectedIds.map((id, i) => (
          <div className="compare-selector" key={i}>
            <select className="tab-select" value={id} onChange={e => updateSelected(i, e.target.value)}>
              <option value="">Select an audit…</option>
              {options.map(a => <option key={a.auditId} value={a.auditId}>{optionLabel(a)}</option>)}
            </select>
            {selectedIds.length > 2 && (
              <button className="compare-remove-btn" onClick={() => removeSelector(i)} title="Remove">×</button>
            )}
          </div>
        ))}
        {selectedIds.length < options.length && (
          <button className="compare-add-btn" onClick={addSelector}>+ Add audit</button>
        )}
      </div>
      {columns.length < 2 ? (
        <p className="no-data-note">Select at least two audits to compare.</p>
      ) : (
        <div className="panel compare-panel">
          <div className="panel-body">
            <div className="compare-table-scroll">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th></th>
                    {columns.map(col => (
                      <th key={col.auditId}>{col.page}<span className="compare-date">{new Date(col.auditedAt).toLocaleString()}</span></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareMetrics.map(m => {
                    const values = columns.map(col => col[m.key]);
                    const nonNull = values.filter(v => v != null);
                    const best = nonNull.length > 1
                      ? (m.better === "higher" ? Math.max(...nonNull) : Math.min(...nonNull))
                      : null;
                    const tied = new Set(values).size <= 1;
                    return (
                      <tr key={m.key}>
                        <td className="compare-label">{m.label}</td>
                        {values.map((v, i) => (
                          <td key={i} className={best != null && v === best && !tied ? "compare-win" : undefined}>
                            {m.fmt(v)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
  const [allAudits, setAllAudits] = useState([]);
  const [inFlight, setInFlight] = useState([]);
  const [lastUpdated, setLastUpdated] = useState("—");
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("report");

  function load() {
    loadDashboardRows()
      .then(data => {
        setRows(data);
        setLastUpdated(new Date().toLocaleString());
        setError(null);
      })
      .catch(e => setError(e.message));
    // Server-truth in-flight status — independent of any tab's local state,
    // so it still shows correctly after a refresh.
    loadInFlightAudits().then(setInFlight);
    // Full history, used by the History and Compare tabs.
    loadAllAudits().then(setAllAudits);
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
      <TabBar tab={tab} setTab={setTab} />
      {tab === "report" && (
        <>
          <InFlightPanel items={inFlight} />
          <BulkAuditPanel />
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
        </>
      )}
      {tab === "history" && <HistoryTab audits={allAudits} />}
      {tab === "compare" && <CompareTab audits={allAudits} />}
    </div>
  );
}
