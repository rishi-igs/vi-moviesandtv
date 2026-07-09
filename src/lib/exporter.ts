function safeNum(v: any) {
  if (v == null || isNaN(v)) return null
  return Number(v)
}

function msToSecStr(ms: any, digits = 2) {
  const n = safeNum(ms)
  return n == null ? '—' : (n / 1000).toFixed(digits)
}

export async function exportRowsToXLSX(rows: any[]) {
  const XLSX = await import('xlsx')
  const data = rows.map(r => ({
    Page: r.pageName,
    URL: r.url,
    'First Contentful Paint (s)': msToSecStr(r.metric?.fcp, 2),
    'Largest Contentful Paint (s)': msToSecStr(r.metric?.lcp, 2),
    'Total Blocking Time (ms)': r.metric?.tbt == null ? '—' : Math.round(r.metric.tbt),
    'Cumulative Layout Shift': r.metric?.cls == null ? '—' : Number(r.metric.cls).toFixed(3),
    'Speed Index (s)': msToSecStr(r.metric?.speedIndex, 2),
    Accessibility: r.audit?.accessibilityScore == null ? '—' : r.audit.accessibilityScore + '%',
    'Best Practices': r.audit?.bestPracticesScore == null ? '—' : r.audit.bestPracticesScore + '%',
    SEO: r.audit?.seoScore == null ? '—' : r.audit.seoScore + '%',
    'Page Load Time (s)': msToSecStr(r.metric?.tti, 2),
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Audit')
  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `Audit_Report_${date}.xlsx`)
}

export async function exportRowsToPDF(rows: any[]) {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  const head = [['#', 'Page', 'URL', 'FCP (s)', 'LCP (s)', 'TBT (ms)', 'CLS', 'Speed Index (s)', 'Accessibility', 'Best Practices', 'SEO', 'Page Load (s)']]
  const body = rows.map((r, i) => ([
    (i + 1).toString(),
    r.pageName || '',
    r.url || '',
    msToSecStr(r.metric?.fcp, 2),
    msToSecStr(r.metric?.lcp, 2),
    r.metric?.tbt == null ? '—' : Math.round(r.metric.tbt).toString(),
    r.metric?.cls == null ? '—' : Number(r.metric.cls).toFixed(3),
    msToSecStr(r.metric?.speedIndex, 2),
    r.audit?.accessibilityScore == null ? '—' : r.audit.accessibilityScore + '%',
    r.audit?.bestPracticesScore == null ? '—' : r.audit.bestPracticesScore + '%',
    r.audit?.seoScore == null ? '—' : r.audit.seoScore + '%',
    msToSecStr(r.metric?.tti, 2),
  ]))

  // Add title
  const title = `Audit Report - ${new Date().toISOString().slice(0, 10)}`
  doc.setFontSize(14)
  doc.text(title, 40, 40)

  // Add table
  // @ts-ignore - plugin adds autoTable to jsPDF
  ;(doc as any).autoTable({
    startY: 60,
    head,
    body,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [16, 28, 66], textColor: 255 },
    columnStyles: { 2: { cellWidth: 160 } },
    theme: 'striped',
  })

  const date = new Date().toISOString().slice(0, 10)
  doc.save(`Audit_Report_${date}.pdf`)
}
