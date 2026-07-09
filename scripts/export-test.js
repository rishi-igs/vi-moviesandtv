const path = require('path')
const XLSX = require('xlsx')
const { loadDashboardRows } = require('../src/data.js')

async function run() {
  const rows = await loadDashboardRows()
  // Map prototype MOCK_ROWS into the export table shape
  const data = rows.map((r, i) => ({
    '#': i + 1,
    Page: r.page || r.pageName || '',
    URL: r.url || '',
    'First Contentful Paint (s)': r.fcp == null ? '—' : (Number(r.fcp)).toFixed(2),
    'Largest Contentful Paint (s)': r.lcp == null ? '—' : (Number(r.lcp)).toFixed(2),
    'Total Blocking Time (ms)': r.tbt == null ? '—' : Math.round(r.tbt),
    'Cumulative Layout Shift': r.clsVal == null ? (r.metric?.cls == null ? '—' : Number(r.metric.cls).toFixed(3)) : Number(r.clsVal).toFixed(3),
    'Speed Index (s)': r.si == null ? (r.metric?.speedIndex == null ? '—' : (Number(r.metric.speedIndex)/1000).toFixed(2)) : Number(r.si).toFixed(2),
    Accessibility: r.accessibility == null ? (r.audit?.accessibilityScore == null ? '—' : r.audit.accessibilityScore + '%') : r.accessibility + '%',
    'Best Practices': r.bestPractices == null ? (r.audit?.bestPracticesScore == null ? '—' : r.audit.bestPracticesScore + '%') : r.bestPractices + '%',
    SEO: r.seo == null ? (r.audit?.seoScore == null ? '—' : r.audit.seoScore + '%') : r.seo + '%',
    'Page Load Time (s)': r.pageLoad == null ? (r.metric?.tti == null ? '—' : (Number(r.metric.tti)/1000).toFixed(2)) : (Number(r.pageLoad)/1000).toFixed(2),
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Audit')
  const date = new Date().toISOString().slice(0,10)
  const out = path.join(__dirname, `Audit_Report_${date}.xlsx`)
  XLSX.writeFile(wb, out)
  console.log('Wrote', out)
}

run().catch(err => { console.error(err); process.exit(1) })
