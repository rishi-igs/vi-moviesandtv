// ---------------------------------------------------------------------------
// Export helpers.
//
// Excel exports build a real spreadsheet from the row data (via SheetJS) —
// actual cells, not a screenshot, so the numbers are usable/sortable in
// Excel. PDF exports instead rasterize the actual rendered DOM section (via
// html2canvas -> jsPDF) so the PDF looks exactly like the on-screen
// dashboard — colors, badges, fonts — rather than a plain data table.
// ---------------------------------------------------------------------------
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export function downloadExcel(filename, sheets) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}

// Tables live inside overflow-x:auto scroll containers (so they fit on
// screen), but that means html2canvas only sees whatever slice happens to be
// scrolled into view. Temporarily expand any scrollable descendant to its
// full scrollWidth, AND widen `root` itself to match — done as real DOM
// mutations (not html2canvas's windowWidth/windowHeight virtual-resize
// option), because that option re-lays out the page in a detached virtual
// viewport that doesn't reliably handle CSS grid/flex (panels silently go
// missing). Mutating the real DOM lets the browser's actual layout engine
// recompute grid tracks and media queries correctly, then html2canvas just
// captures what's really there.
function expandForCapture(root) {
  const scrollNodes = [...root.querySelectorAll("*")].filter(node => {
    const style = getComputedStyle(node);
    return ["auto", "scroll"].includes(style.overflowX) || ["auto", "scroll"].includes(style.overflowY);
  });
  const saved = scrollNodes.map(node => ({
    node,
    overflow: node.style.overflow,
    width: node.style.width,
    height: node.style.height
  }));
  scrollNodes.forEach(node => {
    node.style.overflow = "visible";
    node.style.width = `${node.scrollWidth}px`;
    node.style.height = `${node.scrollHeight}px`;
  });

  void root.offsetHeight; // flush layout so root.scrollWidth reflects the now-expanded children
  const savedRootWidth = root.style.width;
  root.style.width = `${root.scrollWidth}px`;
  void root.offsetHeight;

  return () => {
    root.style.width = savedRootWidth;
    saved.forEach(({ node, overflow, width, height }) => {
      node.style.overflow = overflow;
      node.style.width = width;
      node.style.height = height;
    });
  };
}

// html2canvas's default paint engine doesn't understand CSS conic-gradient()
// at all (used by the Score Distribution / Performance Rating donuts) — it
// silently paints those backgrounds blank instead of erroring.
// foreignObjectRendering:true (real-browser-engine capture) fixes gradients
// in theory, but combined with the real-DOM-resize in expandForCapture it
// produces a blank canvas outright (the serialized SVG <foreignObject> image
// fails to load at the resized dimensions), which is worse. So instead we
// pre-rasterize just the two conic-gradient donuts to a plain PNG data URL
// via <canvas> (which DOES support conic gradients natively) and swap that
// in as a normal background-image right before capture — html2canvas handles
// plain raster background images fine — then restore the CSS gradient after.
function conicGradientToDataUrl(computedBackgroundImage, size) {
  const stops = [...computedBackgroundImage.matchAll(/(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})\s*([\d.]+)deg/g)];
  if (!stops.length) return null;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  // CSS conic-gradient() starts at the top (12 o'clock) going clockwise;
  // canvas angle 0 points right, so start at -90deg to line them up.
  const gradient = ctx.createConicGradient(-Math.PI / 2, size / 2, size / 2);
  let last = 0;
  stops.forEach(([, color, deg]) => {
    const pos = Math.max(last, Math.min(1, Number(deg) / 360));
    gradient.addColorStop(pos, color);
    last = pos;
  });
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas.toDataURL("image/png");
}

function replaceConicGradients(root) {
  const targets = [...root.querySelectorAll(".donut, .rating-donut")];
  const saved = targets.map(el => ({
    el,
    background: el.style.background,
    backgroundSize: el.style.backgroundSize
  }));

  targets.forEach(el => {
    const computedBg = getComputedStyle(el).backgroundImage;
    if (!computedBg.includes("conic-gradient")) return;
    const size = Math.round(Math.max(el.offsetWidth, el.offsetHeight)) || 100;
    const dataUrl = conicGradientToDataUrl(computedBg, size);
    if (!dataUrl) return;
    el.style.background = `url(${dataUrl})`;
    el.style.backgroundSize = "cover";
  });

  return () => {
    saved.forEach(({ el, background, backgroundSize }) => {
      el.style.background = background;
      el.style.backgroundSize = backgroundSize;
    });
  };
}

// Renders `element` to a single PDF page sized to match the captured image's
// aspect ratio exactly — avoids the alternative (slicing a tall screenshot
// across fixed-size pages), which cuts table rows/panels in half wherever
// they land on a page boundary and can leave a near-empty trailing page.
export async function downloadPdf(element, filename) {
  const restoreExpand = expandForCapture(element);
  const restoreGradients = replaceConicGradients(element);
  let canvas;
  try {
    canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true
    });
  } finally {
    restoreGradients();
    restoreExpand();
  }

  // scale:2 above means 2 canvas px per CSS px; treating 1 CSS px as 1pt
  // keeps the PDF page the same visual size as what's on screen.
  const imgWidthPt = canvas.width / 2;
  const imgHeightPt = canvas.height / 2;
  const pdf = new jsPDF({
    orientation: imgWidthPt >= imgHeightPt ? "landscape" : "portrait",
    unit: "pt",
    format: [imgWidthPt, imgHeightPt]
  });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgWidthPt, imgHeightPt);
  pdf.save(filename);
}

export function reportRowsToSheetRows(rows, { includeDate = false } = {}) {
  return rows.map((r, i) => {
    const row = {
      "#": i + 1,
      Page: r.page,
      URL: r.url,
      "FCP (s)": r.fcp,
      "LCP (s)": r.lcp,
      "TBT (ms)": r.tbt,
      CLS: r.clsVal,
      "Speed Index (s)": r.si,
      "Accessibility (%)": r.accessibility,
      "Best Practices (%)": r.bestPractices,
      "SEO (%)": r.seo,
      "Page Load (s)": r.pageLoad
    };
    if (includeDate) row["Audited At"] = r.auditedAt ? new Date(r.auditedAt).toLocaleString() : "";
    return row;
  });
}

export function compareColumnsToSheetRows(metrics, columns) {
  return metrics.map(m => {
    const row = { Metric: m.label };
    columns.forEach(col => {
      row[`${col.page} (${new Date(col.auditedAt).toLocaleString()})`] = m.fmt(col[m.key]);
    });
    return row;
  });
}
