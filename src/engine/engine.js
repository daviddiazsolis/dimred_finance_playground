// SPDX-License-Identifier: Apache-2.0
// Motor de las pestañas (vanilla JS), montado desde Playground.tsx. La pestaña 01 se calcula en vivo; el resto
// muestra resultados precalculados en Python con los mismos datos y particiones de los notebooks 08, 09 y 10
// (gen/datos_sitio.py). Un solo motor para los dos idiomas: los textos fijos están en body.<idioma>.html y los
// rótulos que cambian con los controles, en el diccionario T de abajo.
export function initEngine(DATA, init, L) {
const ES = L === "es";
const T = ES ? {
  varExp: "varianza explicada", acum: "acumulada", comp: "componente", plazo: "plazo (años)", tasa: "tasa real (%)",
  normal: "normales", fraude: "fraudes", errB: "error de B", p99: "percentil 99 de las normales", cp1: "varianza de la CP1",
  veces: "veces el percentil 99", alertas: "alertas", tp: "fraudes atrapados", fp: "falsas alarmas", fn: "fraudes perdidos",
  rec: "recall", pre: "precision", umbral: "umbral", guardada: "varianza guardada", k: "componentes guardadas (k)",
  semana: "semana del", nivel: "nivel", pendiente: "pendiente", curvatura: "curvatura", inSample: "dentro de muestra",
  oos: "fuera de muestra (2015 a 2021)", cap: "varianza capturada fuera de muestra", pb: "pb", sinModelo: "sin modelo",
  base: "curva del", escenario: "escenario", chile: "Chile UF", eeuu: "EEUU", rango: "lugar", de29: "de 29",
  razon: "los fraudes varían", masQue: "veces más que las normales", azar: "partición al azar", tiempo: "partición por tiempo",
  modelos: { pca: "PCA sin etiquetas (todo training)", pcaN: "PCA solo normales", log: "logística (todas las etiquetas)", gb: "gradient boosting (todas las etiquetas)", log20: "logística con solo 20 fraudes" },
  modelo: "modelo", tsne: "t-SNE", umap: "UMAP", pca2: "PCA a 2D", p5: "t-SNE, perplexity 5", p50: "t-SNE, perplexity 50",
  todas: "todas las transacciones", soloNormales: "solo normales", cargas: "cargas de la", log10: "log10(error de reconstrucción)",
  conLas: "con la regla del 95%", entrada: "entrada", oculta: "oculta", codigo: "código", salida: "salida",
} : {
  varExp: "explained variance", acum: "cumulative", comp: "component", plazo: "maturity (years)", tasa: "real yield (%)",
  normal: "normal", fraude: "frauds", errB: "error of B", p99: "99th percentile of normals", cp1: "variance of PC1",
  veces: "times the 99th percentile", alertas: "alerts", tp: "frauds caught", fp: "false alarms", fn: "frauds missed",
  rec: "recall", pre: "precision", umbral: "threshold", guardada: "variance kept", k: "components kept (k)",
  semana: "week of", nivel: "level", pendiente: "slope", curvatura: "curvature", inSample: "in sample",
  oos: "out of sample (2015 to 2021)", cap: "variance captured out of sample", pb: "bp", sinModelo: "no model",
  base: "curve of", escenario: "scenario", chile: "Chile UF", eeuu: "US", rango: "rank", de29: "of 29",
  razon: "frauds vary", masQue: "times more than normals", azar: "random split", tiempo: "time split",
  modelos: { pca: "PCA without labels (all training)", pcaN: "PCA on normals only", log: "logistic (all labels)", gb: "gradient boosting (all labels)", log20: "logistic with only 20 frauds" },
  modelo: "model", tsne: "t-SNE", umap: "UMAP", pca2: "PCA to 2D", p5: "t-SNE, perplexity 5", p50: "t-SNE, perplexity 50",
  todas: "all transactions", soloNormales: "normal ones only", cargas: "loadings of", log10: "log10(reconstruction error)",
  conLas: "with the 95% rule", entrada: "input", oculta: "hidden", codigo: "code", salida: "output",
};
let quieto = false;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const num = (x, d) => { const s = Math.abs(x).toFixed(d); const t = ES ? s.replace(".", ",") : s; return (x < 0 && +s !== 0 ? "−" : "") + t; };
const f1 = x => num(x, 1), f2 = x => num(x, 2), f3 = x => num(x, 3);
const pct = (x, d = 1) => num(100 * x, d) + "%";
const mil = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ES ? "." : ",");
const el = id => document.getElementById(id);
const css = v => getComputedStyle(document.querySelector(".tfp")).getPropertyValue(v).trim() || "#888";
function tex(node) { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(() => { }); }
function stagger(root) { root.querySelectorAll(".stage").forEach((s, i) => { s.style.animationDelay = reduced ? "0s" : (i * 0.15) + "s"; }); }

// ----- piezas de interfaz
function stepper(prefix, pasos, onGo) {
  const rail = el(prefix + "-rail");
  rail.innerHTML = pasos.map((p, i) => `<button type="button" data-p="${i}"><span class="n">${i}</span>${p}</button>`).join("");
  rail.querySelectorAll("button").forEach(b => b.onclick = () => onGo(+b.dataset.p));
  el(prefix + "-prev").onclick = () => onGo(-1, -1);
  el(prefix + "-next").onclick = () => onGo(-1, +1);
}
function marcarPaso(prefix, i, n) {
  document.querySelectorAll(`#m-${prefix} .panel`).forEach((p, k) => p.classList.toggle("on", k === i));
  document.querySelectorAll(`#${prefix}-rail button`).forEach((b, k) => k === i ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current"));
  el(prefix + "-prev").disabled = i === 0; el(prefix + "-next").disabled = i === n - 1;
  document.querySelectorAll(`#m-${prefix} > .controls .ctrl[data-pasos]`).forEach(c => { c.style.display = c.dataset.pasos.split(",").map(Number).includes(i) ? "" : "none"; });
  const ctr = document.querySelector(`#m-${prefix} > .controls`);
  if (ctr) ctr.style.display = [...ctr.querySelectorAll(".ctrl")].some(c => c.style.display !== "none") ? "" : "none";
  if (!quieto) { const tb = el("tabs"); if (tb) { const y = tb.getBoundingClientRect().top + window.scrollY - 8; window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" }); } }
}
function segmento(id, attr, cb) {
  const e = el(id);
  e.querySelectorAll("button").forEach(b => b.onclick = () => { e.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); cb(b.dataset[attr]); });
}
const kpi = items => `<div class="kpi">${items.map(it => `<div class="stage"><div class="t">${it.t}</div><div class="v" ${it.col ? `style="color:${it.col}"` : ""}>${it.v}${it.s ? ` <small>${it.s}</small>` : ""}</div></div>`).join("")}</div>`;
const tabla = (cab, filas, cls = "cmp") => `<div class="mwrap"><table class="${cls}"><tr>${cab.map(c => `<th>${c}</th>`).join("")}</tr>${filas.map(r => `<tr class="${r.cls || ""}">${r.c.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</table></div>`;
const barras = (items, max) => `<div class="bars">${items.map(it => `<div class="lab ${it.cls || ""}">${it.lab}</div><div class="bar ${it.cls || ""}"><i style="width:${Math.max(0, Math.min(100, 100 * it.v / max))}%"></i></div><div class="val">${it.txt}</div>`).join("")}</div>`;
function anima(root) { if (reduced) return; requestAnimationFrame(() => root.querySelectorAll(".bars .bar i").forEach(i => { const w = i.style.width; i.style.width = "0"; requestAnimationFrame(() => i.style.width = w); })); }

// ----- gráficos SVG
function ejes(o) {
  const W = o.w || 560, H = o.h || 260, ml = o.ml || 48, mb = o.mb || 34, mt = 14, mr = 14;
  const [x0, x1] = o.xr, [y0, y1] = o.yr;
  const X = x => ml + (x - x0) / (x1 - x0) * (W - ml - mr), Y = y => mt + (y1 - y) / (y1 - y0) * (H - mt - mb);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px">`;
  (o.yt || [y0, (y0 + y1) / 2, y1]).forEach(v => s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${ml - 6}" y="${Y(v) + 4}" text-anchor="end" class="tick">${o.yf ? o.yf(v) : v}</text>`);
  (o.xt || [x0, (x0 + x1) / 2, x1]).forEach(v => s += `<text x="${X(v)}" y="${H - 14}" text-anchor="middle" class="tick">${o.xf ? o.xf(v) : v}</text>`);
  if (o.xl) s += `<text x="${(ml + W - mr) / 2}" y="${H - 1}" text-anchor="middle" class="tick" style="font-weight:600">${o.xl}</text>`;
  if (o.cero) s += `<line x1="${ml}" x2="${W - mr}" y1="${Y(0)}" y2="${Y(0)}" stroke="${css("--muted")}" stroke-width="1"/>`;
  return { s, X, Y, W, H, ml, mr, mt, mb };
}
function lineas(series, o) {
  const e = ejes(o); let s = e.s;
  series.forEach(se => {
    if (se.pts.length > 1) s += `<polyline points="${se.pts.map(p => e.X(p[0]).toFixed(1) + "," + e.Y(p[1]).toFixed(1)).join(" ")}" fill="none" stroke="${se.col}" stroke-width="${se.sw || 2.5}" stroke-linejoin="round" ${se.dash ? 'stroke-dasharray="6 4"' : ""} opacity="${se.op || 1}"/>`;
    if (se.marks) se.pts.forEach(p => s += `<circle cx="${e.X(p[0])}" cy="${e.Y(p[1])}" r="${se.r || 4}" fill="${se.col}"/>`);
  });
  (o.vlines || []).forEach(v => s += `<line x1="${e.X(v.x)}" x2="${e.X(v.x)}" y1="${e.mt}" y2="${e.H - e.mb}" stroke="${v.col || css("--muted")}" stroke-dasharray="4 4" stroke-width="1.5"/>${v.lab ? `<text x="${e.X(v.x) + (e.X(v.x) > e.W * 0.75 ? -4 : 4)}" y="${e.mt + 12}" text-anchor="${e.X(v.x) > e.W * 0.75 ? "end" : "start"}" class="tick" style="fill:${v.col || css("--muted")}">${v.lab}</text>` : ""}`);
  (o.puntos || []).forEach(p => s += `<circle cx="${e.X(p.x)}" cy="${e.Y(p.y)}" r="${p.r || 6}" fill="${p.col}" stroke="${css("--ground")}" stroke-width="2"/>`);
  return s + "</svg>";
}
function columnas(vals, o) {
  const n = vals.length, e = ejes({ ...o, xr: [0, n], xt: o.xt || [] }); let s = e.s;
  const bw = (e.X(1) - e.X(0)) * 0.78;
  vals.forEach((v, i) => { const y = e.Y(Math.max(v, 0)), y0 = e.Y(Math.min(v, 0)); s += `<rect x="${e.X(i) + (e.X(1) - e.X(0) - bw) / 2}" y="${y}" width="${bw}" height="${Math.max(0.5, y0 - y)}" rx="2" fill="${(o.cols && o.cols[i]) || o.col}"><title>${o.tip ? o.tip(i, v) : v}</title></rect>`; });
  (o.labs || []).forEach((l, i) => { if (l) s += o.rot ? `<text x="${e.X(i + 0.5)}" y="${e.H - 30}" text-anchor="end" class="tick" style="font-size:9.5px" transform="rotate(-60 ${e.X(i + 0.5)} ${e.H - 30})">${l}</text>` : `<text x="${e.X(i + 0.5)}" y="${e.H - 18}" text-anchor="middle" class="tick" style="font-size:9.5px">${l}</text>`; });
  if (o.linea) s += `<polyline points="${o.linea.map((v, i) => e.X(i + 0.5) + "," + e.Y(v)).join(" ")}" fill="none" stroke="${o.lineaCol}" stroke-width="2.5"/>`;
  (o.hlines || []).forEach(h => s += `<line x1="${e.ml}" x2="${e.W - e.mr}" y1="${e.Y(h.y)}" y2="${e.Y(h.y)}" stroke="${h.col}" stroke-dasharray="5 4" stroke-width="1.5"/><text x="${e.W - e.mr}" y="${e.Y(h.y) - 4}" text-anchor="end" class="tick" style="fill:${h.col}">${h.lab}</text>`);
  return s + "</svg>";
}
function nube(grupos, o) {
  let xs = [], ys = []; grupos.forEach(g => g.pts.forEach(p => { xs.push(p[0]); ys.push(p[1]); }));
  const pad = (a, b) => [a - (b - a) * 0.05, b + (b - a) * 0.05];
  const [x0, x1] = pad(Math.min(...xs), Math.max(...xs)), [y0, y1] = pad(Math.min(...ys), Math.max(...ys));
  const W = o.w || 520, H = o.h || 400, X = x => 8 + (x - x0) / (x1 - x0) * (W - 16), Y = y => 8 + (y1 - y) / (y1 - y0) * (H - 16);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;border:1px solid ${css("--line")};border-radius:8px">`;
  grupos.forEach(g => g.pts.forEach(p => s += `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="${g.r || 2.2}" fill="${g.col}" opacity="${g.op || 0.6}"/>`));
  return s + "</svg>";
}
const leyenda = items => `<div class="legend">${items.map(it => `<span><i style="background:${it.col}"></i>${it.lab}</span>`).join("")}</div>`;

// ----- navegación entre pestañas
const MODELOS = ["idea", "fra", "fut", "cur", "ae", "map", "pre"];
const ST = {};
function irModelo(m) {
  document.querySelectorAll(".tfp .modelo").forEach(x => x.classList.toggle("on", x.id === "m-" + m));
  document.querySelectorAll("#tabs button").forEach(b => b.dataset.m === m ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  estado.m = m; ST[m].go(ST[m].st.paso);
}
const estado = { m: "idea" };

function modulo(prefix, pasos, renders, extra) {
  const st = { paso: 0, ...(extra || {}) };
  const go = (i, delta) => {
    if (i < 0) i = Math.max(0, Math.min(pasos.length - 1, st.paso + delta));
    st.paso = i; marcarPaso(prefix, i, pasos.length);
    const panel = el(`${prefix}-s${i}`); renders[i](panel); stagger(panel); anima(panel); tex(panel);
  };
  stepper(prefix, pasos, go);
  ST[prefix] = { st, go, render: () => { const p = el(`${prefix}-s${st.paso}`); renders[st.paso](p); tex(p); } };
  return st;
}
const PASOS = JSON.parse(el("pasos-json").textContent);

// ===================== 01 LA IDEA (en vivo) =====================
(function () {
  const st = modulo("idea", PASOS.idea, [r0, r1, r2, r3], { rho: 0.9, bu: 0.0, bv: 1.2 });
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function normales(n, seed) { const r = rng(seed), out = []; for (let i = 0; i < n; i++) { const u = Math.max(r(), 1e-12), v = r(); out.push(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)); } return out; }
  const Z1 = normales(400, 7), Z2 = normales(400, 11);
  function modelo() {
    const rho = st.rho, pts = Z1.map((z, i) => [z, rho * z + Math.sqrt(1 - rho * rho) * Z2[i]]);
    const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
    let sxx = 0, syy = 0, sxy = 0; pts.forEach(p => { sxx += (p[0] - mx) ** 2; syy += (p[1] - my) ** 2; sxy += (p[0] - mx) * (p[1] - my); });
    sxx /= n - 1; syy /= n - 1; sxy /= n - 1;
    const tr = sxx + syy, det = sxx * syy - sxy * sxy, l1 = tr / 2 + Math.sqrt(tr * tr / 4 - det), l2 = tr / 2 - Math.sqrt(tr * tr / 4 - det);
    let w = [sxy, l1 - sxx]; const nw = Math.hypot(w[0], w[1]) || 1; w = [w[0] / nw, w[1] / nw]; if (w[0] < 0) w = [-w[0], -w[1]];
    const perp = [-w[1], w[0]];
    const err = p => { const d = [p[0] - mx, p[1] - my], z = d[0] * w[0] + d[1] * w[1]; return (d[0] - z * w[0]) ** 2 + (d[1] - z * w[1]) ** 2; };
    const errs = pts.map(err).sort((a, b) => a - b), p99 = errs[Math.floor(0.99 * (n - 1))];
    const B = [mx + st.bu * w[0] + st.bv * perp[0], my + st.bu * w[1] + st.bv * perp[1]];
    const A = [mx + 2.6 * w[0], my + 2.6 * w[1]];
    return { pts, mx, my, w, perp, l1, l2, err, p99, B, A };
  }
  function dibujo(m, conProy) {
    const W = 460, H = 400, lim = 3.6, X = x => W / 2 + x / lim * (W / 2 - 16), Y = y => H / 2 - y / lim * (H / 2 - 16);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px">`;
    s += `<line x1="${X(-lim)}" x2="${X(lim)}" y1="${Y(0)}" y2="${Y(0)}" class="grid"/><line x1="${X(0)}" x2="${X(0)}" y1="${Y(-lim)}" y2="${Y(lim)}" class="grid"/>`;
    s += `<text x="${X(lim) - 4}" y="${Y(0) - 6}" text-anchor="end" class="tick">${ES ? "monto" : "amount"}</text><text x="${X(0) + 6}" y="${Y(lim) + 12}" class="tick">${ES ? "puntos" : "points"}</text>`;
    m.pts.forEach(p => s += `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="2.6" fill="${css("--muted")}" opacity=".45"/>`);
    const L = 4; s += `<line x1="${X(m.mx - L * m.w[0])}" y1="${Y(m.my - L * m.w[1])}" x2="${X(m.mx + L * m.w[0])}" y2="${Y(m.my + L * m.w[1])}" stroke="${css("--v")}" stroke-width="3"/>`;
    [["A", m.A, css("--q")], ["B", m.B, css("--bad")]].forEach(([nom, p, col]) => {
      if (conProy) { const d = [p[0] - m.mx, p[1] - m.my], z = d[0] * m.w[0] + d[1] * m.w[1], q = [m.mx + z * m.w[0], m.my + z * m.w[1]]; s += `<line x1="${X(p[0])}" y1="${Y(p[1])}" x2="${X(q[0])}" y2="${Y(q[1])}" stroke="${col}" stroke-width="2" stroke-dasharray="4 3"/><circle cx="${X(q[0])}" cy="${Y(q[1])}" r="4" fill="none" stroke="${col}" stroke-width="2"/>`; }
      s += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="8" fill="${col}"/><text x="${X(p[0]) + 11}" y="${Y(p[1]) + 4}" style="fill:${col};font-weight:700;font-size:13px">${nom}</text>`;
    });
    return s + "</svg>";
  }
  function r0(p) { const m = modelo(); el("idea-plot0").innerHTML = dibujo(m, false); el("idea-kpi0").innerHTML = kpi([{ t: T.cp1, v: pct(m.l1 / (m.l1 + m.l2)) }, { t: "CP2", v: pct(m.l2 / (m.l1 + m.l2)) }]); }
  function r1(p) {
    const m = modelo(), eB = m.err(m.B), eA = m.err(m.A);
    el("idea-plot1").innerHTML = dibujo(m, true);
    el("idea-kpi1").innerHTML = kpi([{ t: (ES ? "error de A" : "error of A"), v: f3(eA), col: css("--q") }, { t: T.errB, v: f3(eB), col: css("--bad") }, { t: T.p99, v: f3(m.p99) }]);
    el("idea-nota1").innerHTML = eB > m.p99 ? (ES ? `B queda <b>${f1(eB / m.p99)} ${T.veces}</b>: sería una alerta, aunque su monto y sus puntos, cada uno por separado, son normales.` : `B is <b>${f1(eB / m.p99)} ${T.veces}</b>: it would raise an alert, even though its amount and its points, each on its own, look normal.`)
      : (ES ? "B está dentro del rango de error de las normales: no sería alerta. Aléjalo de la línea con el control de desajuste." : "B is within the error range of normal transactions: no alert. Move it away from the line with the mismatch control.");
  }
  function r2(p) { const m = modelo(); el("idea-num2").innerHTML = kpi([{ t: "w₁", v: `(${f3(m.w[0])}, ${f3(m.w[1])})` }, { t: "λ₁, λ₂", v: `${f3(m.l1)}, ${f3(m.l2)}` }]); }
  function r3(p) { }
  const bind = (id, key, div, lab) => { const e = el(id); e.oninput = () => { st[key] = +e.value / div; el(id + "-v").textContent = f2(st[key]); ST.idea.render(); }; };
  bind("idea-rho", "rho", 100); bind("idea-bv", "bv", 100); bind("idea-bu", "bu", 100);
})();

// ===================== 02 FRAUDE CON PCA =====================
(function () {
  const D = DATA.fraude;
  const st = modulo("fra", PASOS.fra, [r0, r1, r2, r3, r4, r5], { cp: "CP28", k: 27, q: 2 });
  function r0() {
    el("fra-kpi0").innerHTML = kpi([{ t: ES ? "transacciones" : "transactions", v: mil(D.n) }, { t: T.fraude, v: mil(D.fraudes), col: css("--bad") }, { t: ES ? "tasa de fraude" : "fraud rate", v: pct(D.fraudes / D.n, 2) }, { t: "training / testing", v: `${mil(D.ntr)} / ${mil(D.nte)}` }]);
  }
  function r1() {
    const acum = []; D.var.reduce((a, v, i) => (acum[i] = a + v, a + v), 0);
    const labs = D.var.map((_, i) => (i + 1) % 4 === 1 || i === 28 ? "" + (i + 1) : "");
    el("fra-plot1").innerHTML = `<div class="flow"><div style="flex:1;min-width:260px">${columnas(D.var, { yr: [0, 0.08], yt: [0, 0.02, 0.04, 0.06, 0.08], yf: v => pct(v, 0), col: css("--cobre"), labs, tip: (i, v) => `CP${i + 1}: ${pct(v, 2)}`, h: 250, w: 420 })}<div class="legend"><span><i style="background:${css("--cobre")}"></i>${ES ? "varianza explicada por componente" : "variance explained per component"}</span></div></div>`
      + `<div style="flex:1;min-width:260px">${lineas([{ pts: acum.map((v, i) => [i + 1, v]), col: css("--v"), marks: true, r: 2.5 }], { xr: [1, 29], yr: [0, 1], xt: [1, 5, 9, 13, 17, 21, 25, 29], yt: [0, 0.25, 0.5, 0.75, 1], yf: v => pct(v, 0), puntos: [{ x: D.k95, y: acum[D.k95 - 1], col: css("--cobre") }], vlines: [{ x: D.k95, lab: "k = " + D.k95 }], h: 250, w: 420 })}<div class="legend"><span><i style="background:${css("--v")}"></i>${ES ? "varianza explicada acumulada" : "cumulative explained variance"}</span></div></div></div>`;
  }
  function r2() {
    const v = D.cargas[st.cp], j = +st.cp.slice(2) - 1;
    el("fra-plot2").innerHTML = columnas(v, { yr: [-0.8, 0.8], yt: [-0.8, -0.4, 0, 0.4, 0.8], yf: f1, cols: v.map(x => x >= 0 ? css("--cobre") : css("--q")), labs: D.cols.map(c => c.replace("Amount", ES ? "Monto" : "Amount")), rot: true, mb: 62, cero: true, h: 320, w: 620, tip: (i, x) => `${D.cols[i]}: ${f2(x)}` });
    el("fra-cap2").innerHTML = `${T.cargas} ${ES ? st.cp : st.cp.replace("CP", "PC")} · ${T.varExp} ${pct(D.var[j], 2)}`;
  }
  function r3() {
    const b = D.barrido.find(x => x.k === st.k);
    el("fra-kpi3").innerHTML = kpi([{ t: T.k, v: st.k }, { t: T.guardada, v: pct(b.var) }, { t: "PR-AUC", v: f2(b.ap), col: css("--cobre") }, { t: "precision@100", v: f2(b.p100) }]);
    el("fra-plot3").innerHTML = lineas([{ pts: D.barrido.map(x => [x.k, x.ap]), col: css("--cobre"), marks: true, r: 3 }], { xr: [1, 28], yr: [0, 0.8], xt: [1, 5, 10, 15, 20, 25, 28], yt: [0, 0.2, 0.4, 0.6, 0.8], yf: f1, xl: T.k, puntos: [{ x: st.k, y: b.ap, col: css("--cobre") }], vlines: [{ x: D.k95, lab: T.conLas }], h: 260 });
  }
  function r4() {
    const u = D.umbrales[st.q], H = D.hist, xs = H.bins;
    el("fra-kpi4").innerHTML = kpi([{ t: T.alertas, v: mil(u.alertas) }, { t: T.tp, v: u.tp, col: css("--ok") }, { t: T.fp, v: u.fp, col: css("--bad") }, { t: T.fn, v: u.fn }, { t: T.rec, v: f2(u.rec) }, { t: T.pre, v: f2(u.pre) }]);
    const mid = xs.slice(0, -1).map((x, i) => (x + xs[i + 1]) / 2), ymax = Math.max(...H.normal, ...H.fraude);
    el("fra-plot4").innerHTML = lineas([{ pts: mid.map((x, i) => [x, H.normal[i]]), col: css("--muted") }, { pts: mid.map((x, i) => [x, H.fraude[i]]), col: css("--bad") }],
      { xr: [-4, 4], yr: [0, Math.ceil(ymax * 10) / 10], xt: [-4, -2, 0, 2, 4], yt: [0, ymax / 2, ymax].map(v => Math.round(v * 100) / 100), yf: f1, xl: T.log10, vlines: [{ x: Math.log10(u.u), col: css("--cobre"), lab: T.umbral }], h: 260 }) + leyenda([{ col: css("--muted"), lab: T.normal }, { col: css("--bad"), lab: T.fraude }, { col: css("--cobre"), lab: `${T.umbral}: ${ES ? "percentil" : "percentile"} ${num(u.q, 2).replace(/[,.]?0+$/, "")}` }]);
  }
  function r5() {
    const C = D.corr, cab = ["", ...C.vars];
    const fila = (m, i) => ({ c: [`<b>${C.vars[i]}</b>`, ...m[i].map(v => `<span style="color:${v < -0.05 ? css("--q") : "inherit"}">${f2(v)}</span>`)] });
    el("fra-t5a").innerHTML = tabla(cab, [0, 1, 2].map(i => fila(C.todas, i)), "cmp small");
    el("fra-t5b").innerHTML = tabla(cab, [0, 1, 2].map(i => fila(C.normales, i)), "cmp small");
  }
  segmento("fra-cp", "cp", v => { st.cp = v; ST.fra.render(); });
  el("fra-k").oninput = e => { st.k = +e.target.value; el("fra-k-v").textContent = st.k; ST.fra.render(); };
  el("fra-q").oninput = e => { st.q = +e.target.value; el("fra-q-v").textContent = num(D.umbrales[st.q].q, 2).replace(/[,.]?0+$/, ""); ST.fra.render(); };
})();

// ===================== 03 LA PRUEBA DEL FUTURO =====================
(function () {
  const D = DATA.futuro;
  const st = modulo("fut", PASOS.fut, [r0, r1, r2], { part: "tiempo" });
  function r0() {
    el("fut-kpi0").innerHTML = kpi([{ t: "training", v: mil(D.ntr), s: `${D.ftr} ${T.fraude}` }, { t: "testing", v: mil(D.nte), s: `${D.fte} ${T.fraude}` }, { t: `PR-AUC, ${T.azar}`, v: f2(D.azar.pca.ap) }, { t: `PR-AUC, ${T.tiempo}`, v: f3(D.tiempo.pca.ap), col: css("--bad") }]);
  }
  function r1() {
    const dib = (e, col) => { const v = Array.from({ length: 29 }, (_, i) => i + 1 === e.rango ? 1 : 0.18); return columnas(v, { yr: [0, 1], yt: [], cols: v.map(x => x === 1 ? col : css("--mask")), labs: v.map((_, i) => (i + 1 === e.rango || i === 0 || i === 28) ? "" + (i + 1) : ""), h: 120, ml: 10 }); };
    el("fut-p1a").innerHTML = dib(D.eje_todo, css("--bad"));
    el("fut-p1b").innerHTML = dib(D.eje_normal, css("--ok"));
    el("fut-c1a").innerHTML = `${T.rango} ${D.eje_todo.rango} ${T.de29} · ${T.varExp} ${pct(D.eje_todo.var, 2)} · ${T.razon} ${D.eje_todo.razon} ${T.masQue}`;
    el("fut-c1b").innerHTML = `${T.rango} ${D.eje_normal.rango} ${T.de29} · ${T.varExp} ${pct(D.eje_normal.var, 2)} · ${T.razon} ${D.eje_normal.razon} ${T.masQue}`;
    el("fut-kpi1").innerHTML = kpi([{ t: `PR-AUC, ${T.modelos.pca}`, v: f3(D.tiempo.pca.ap), col: css("--bad") }, { t: `PR-AUC, ${T.modelos.pcaN}`, v: f2(D.tiempo.pcaN.ap), col: css("--ok") }, { t: "precision@100", v: f2(D.tiempo.pcaN.p100) }]);
  }
  function r2() {
    const M = D[st.part], keys = ["pca", "pcaN", "log", "gb", "log20"];
    el("fut-t2").innerHTML = tabla([T.modelo, "PR-AUC", "AUC ROC", "precision@100", "recall@500"], keys.map(k => ({ cls: k === "pcaN" ? "hi" : "", c: [T.modelos[k], f3(M[k].ap), f3(M[k].auc), f2(M[k].p100), f3(M[k].r500)] })));
    el("fut-b2").innerHTML = barras(keys.map(k => ({ lab: T.modelos[k], v: M[k].ap, txt: f2(M[k].ap), cls: k.startsWith("pca") ? "pred" : "" })), 1);
  }
  segmento("fut-part", "p", v => { st.part = v; ST.fut.render(); });
})();

// ===================== 04 CURVA DE TASAS =====================
(function () {
  const D = DATA.curva, PL = D.plazos, NOM = [T.nivel, T.pendiente, T.curvatura];
  const COL = () => [css("--cobre"), css("--bad"), css("--v")];
  const st = modulo("cur", PASOS.cur, [r0, r1, r2, r3, r4, r5], { i: D.fechas.length - 1, k: 3, sh: [0, 0, 0], f: 0 });
  function r0() {
    const nv = D.niveles[st.i], ref = D.niveles[0];
    el("cur-plot0").innerHTML = lineas([{ pts: PL.map((x, j) => [x, ref[j]]), col: css("--muted"), dash: true, sw: 1.5 }, { pts: PL.map((x, j) => [x, nv[j]]), col: css("--cobre"), marks: true }],
      { xr: [0, 30], yr: [-2, 4], xt: [2, 5, 10, 20, 30], yt: [-2, -1, 0, 1, 2, 3, 4], yf: f1, xl: T.plazo, cero: true, h: 280 }) + leyenda([{ col: css("--cobre"), lab: `${T.semana} ${D.fechas[st.i]}` }, { col: css("--muted"), lab: `${T.semana} ${D.fechas[0]}` }]);
    el("cur-i-v").textContent = D.fechas[st.i];
  }
  function r1() {
    const nombres = ["2", "5", "10", "20", "30"];
    let h = `<div class="mwrap"><table class="m mini"><tr><th></th>${D.cob_anios.map(a => `<th>${String(a).slice(2)}</th>`).join("")}</tr>`;
    D.cob.forEach((fila, j) => { h += `<tr><th class="r">${nombres[j]}</th>${fila.map(v => `<td style="background:color-mix(in srgb,var(--cobre) ${Math.round(v * 85)}%,var(--mask));color:${v > 0.55 ? "#09090b" : "inherit"}" title="${pct(v, 0)}">${Math.round(v * 100)}</td>`).join("")}</tr>`; });
    el("cur-t1").innerHTML = h + "</table></div>";
    el("cur-kpi1").innerHTML = kpi([{ t: ES ? "5 paseos aleatorios independientes: CP1 sobre niveles" : "5 independent random walks: PC1 on levels", v: pct(D.paseos_niveles, 0) }, { t: ES ? "curva UF: CP1 sobre niveles" : "UF curve: PC1 on levels", v: pct(D.niveles_uf, 0) }, { t: ES ? "curva UF: CP1 sobre cambios semanales" : "UF curve: PC1 on weekly changes", v: pct(D.var[0], 0), col: css("--cobre") }]);
  }
  function r2() {
    const C = COL();
    el("cur-plot2").innerHTML = lineas(D.W.map((w, j) => ({ pts: PL.map((x, t) => [x, w[t]]), col: C[j], marks: true })), { xr: [0, 30], yr: [-1, 1], xt: [2, 5, 10, 20, 30], yt: [-1, -0.5, 0, 0.5, 1], yf: f1, xl: T.plazo, cero: true, h: 260 })
      + leyenda(D.W.map((_, j) => ({ col: C[j], lab: `${NOM[j]} (${pct(D.var[j], 0)})` })));
    const n = D.fac_fechas.length, paso = 2, j = st.f;
    const pts = []; for (let t = 0; t < n; t += paso) pts.push([t, D.fac_acum[j][t]]);
    const vals = D.fac_acum[j], lo = Math.min(...vals), hi = Math.max(...vals);
    const anios = [2008, 2010, 2012, 2014, 2016, 2018, 2020].map(a => D.fac_fechas.findIndex(f => f.startsWith(a)));
    el("cur-plot2b").innerHTML = lineas([{ pts, col: C[j], sw: 2 }], { xr: [0, n - 1], yr: [Math.floor(lo), Math.ceil(hi)], xt: anios, xf: t => D.fac_fechas[t].slice(0, 4), yt: [Math.floor(lo), 0, Math.ceil(hi)], yf: f1, cero: true, h: 220 });
  }
  function r3() {
    const k = st.k, rin = D.rmse_in[k], ro = D.oos[k - 1], mx = Math.max(...D.std_bp);
    el("cur-kpi3").innerHTML = kpi([{ t: ES ? "factores (k)" : "factors (k)", v: k }, { t: T.varExp, v: pct(D.var.slice(0, k).reduce((a, b) => a + b, 0)) }, { t: T.cap, v: pct(ro.cap), col: css("--cobre") }]);
    el("cur-b3").innerHTML = barras(PL.flatMap((p, j) => [{ lab: `${p} ${ES ? "años" : "yrs"}, ${T.sinModelo}`, v: D.std_bp[j], txt: `${f1(D.std_bp[j])} ${T.pb}` }, { lab: T.inSample, v: rin[j], txt: `${f1(rin[j])} ${T.pb}`, cls: "pred" }, { lab: T.oos, v: ro.rmse[j], txt: `${f1(ro.rmse[j])} ${T.pb}`, cls: "real" }]), mx);
  }
  function r4() {
    const base = D.niveles[D.niveles.length - 1], C = COL();
    const mov = PL.map((_, t) => st.sh.reduce((a, s, j) => a + s * Math.sqrt(D.lam[j]) * D.W[j][t] * D.escala[t], 0));
    const nueva = base.map((v, t) => v + mov[t] / 100);
    el("cur-plot4").innerHTML = lineas([{ pts: PL.map((x, t) => [x, base[t]]), col: css("--muted"), marks: true, dash: true }, { pts: PL.map((x, t) => [x, nueva[t]]), col: css("--cobre"), marks: true }],
      { xr: [0, 30], yr: [-1, 4], xt: [2, 5, 10, 20, 30], yt: [-1, 0, 1, 2, 3, 4], yf: f1, xl: T.plazo, cero: true, h: 290 }) + leyenda([{ col: css("--muted"), lab: `${T.base} ${D.fechas[D.fechas.length - 1]}` }, { col: css("--cobre"), lab: T.escenario }]);
    el("cur-t4").innerHTML = tabla([T.plazo, ...PL.map(String)], [{ c: [ES ? "cambio (pb)" : "change (bp)", ...mov.map(f1)] }], "cmp small");
    ["n", "p", "c"].forEach((s, j) => el(`cur-s${s}-v`).textContent = f1(st.sh[j]));
  }
  function r5() {
    const C = COL(), j = st.f;
    el("cur-plot5").innerHTML = lineas([{ pts: PL.map((x, t) => [x, D.W[j][t]]), col: css("--cobre"), marks: true }, { pts: PL.map((x, t) => [x, D.us_W[j][t]]), col: css("--q"), marks: true, dash: true }], { xr: [0, 30], yr: [-1, 1], xt: [2, 5, 10, 20, 30], yt: [-1, 0, 1], yf: f1, xl: T.plazo, cero: true, h: 240 })
      + leyenda([{ col: css("--cobre"), lab: T.chile }, { col: css("--q"), lab: T.eeuu }]);
    el("cur-t5").innerHTML = tabla(["", "CP1", "CP2", "CP3", ES ? "3 juntas" : "3 together", ES ? "desv. 2 años (pb)" : "2-year sd (bp)", ES ? "desv. 30 años (pb)" : "30-year sd (bp)"],
      [{ c: [T.chile, ...D.var.slice(0, 3).map(v => pct(v)), pct(D.var.slice(0, 3).reduce((a, b) => a + b)), f1(D.std_bp[0]), f1(D.std_bp[4])] }, { c: [T.eeuu, ...D.us_var.slice(0, 3).map(v => pct(v)), pct(D.us_var.slice(0, 3).reduce((a, b) => a + b)), f1(D.us_std[0]), f1(D.us_std[4])] }]);
  }
  el("cur-i").max = D.fechas.length - 1; el("cur-i").value = D.fechas.length - 1;
  el("cur-i").oninput = e => { st.i = +e.target.value; ST.cur.render(); };
  el("cur-k").oninput = e => { st.k = +e.target.value; el("cur-k-v").textContent = st.k; ST.cur.render(); };
  ["n", "p", "c"].forEach((s, j) => el(`cur-s${s}`).oninput = e => { st.sh[j] = +e.target.value / 10; ST.cur.render(); });
  el("cur-reset").onclick = () => { st.sh = [0, 0, 0]; ["n", "p", "c"].forEach(s => el(`cur-s${s}`).value = 0); ST.cur.render(); };
  segmento("cur-f", "f", v => { st.f = +v; ST.cur.render(); });
})();

// ===================== 05 AUTOENCODER =====================
(function () {
  const D = DATA.ae.tabla;
  const st = modulo("ae", PASOS.ae, [r0, r1, r2, r3]);
  const fila = pref => D.filter(r => r.modelo.startsWith(pref));
  const nombre = m => ES ? m : m.replace("autoencoder lineal", "linear autoencoder").replace("autoencoder no lineal", "nonlinear autoencoder").replace("semilla", "seed").replace("código", "code").replace("logística (supervisada)", "logistic (supervised)").replace("gradient boosting (supervisado)", "gradient boosting (supervised)");
  function r0() {
    const capas = [[29, T.entrada], [64, `${T.oculta} (ReLU)`], [26, T.codigo], [64, `${T.oculta} (ReLU)`], [29, T.salida]];
    const W = 660, H = 230, x = i => 30 + i * 140; let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px">`;
    capas.forEach(([n, lab], i) => { const h = 30 + n * 2.2, y = (H - 40 - h) / 2; if (i < 4) { const n2 = capas[i + 1][0], h2 = 30 + n2 * 2.2, y2 = (H - 40 - h2) / 2; s += `<polygon points="${x(i) + 50},${y} ${x(i + 1)},${y2} ${x(i + 1)},${y2 + h2} ${x(i) + 50},${y + h}" fill="${css("--cobre-soft")}"/>`; }
      s += `<rect x="${x(i)}" y="${y}" width="50" height="${h}" rx="6" fill="${i === 2 ? css("--cobre") : css("--surface")}" stroke="${css("--cobre")}" stroke-width="2"/><text x="${x(i) + 25}" y="${y + h / 2 + 5}" text-anchor="middle" style="font-weight:700;fill:${i === 2 ? "#09090b" : css("--ink")}">${n}</text><text x="${x(i) + 25}" y="${H - 14}" text-anchor="middle" class="tick">${lab}</text>`; });
    el("ae-plot0").innerHTML = s + `<text x="${x(0) + 25}" y="16" text-anchor="middle" class="tick">x</text><text x="${x(2) + 25}" y="16" text-anchor="middle" class="tick">h = f(x)</text><text x="${x(4) + 25}" y="16" text-anchor="middle" class="tick">x̂ = g(h)</text></svg>`;
  }
  function r1() { const r = [...fila("PCA"), ...fila("autoencoder lineal")]; el("ae-t1").innerHTML = tabla([T.modelo, "PR-AUC", "AUC ROC", "precision@100", "recall@500"], r.map(x => ({ c: [nombre(x.modelo), f3(x.ap), f3(x.auc), f2(x.p100), f3(x.r500)] }))); }
  function r2() {
    const pca = fila("PCA")[0], nl = fila("autoencoder no lineal");
    el("ae-b2").innerHTML = barras([{ lab: nombre(pca.modelo), v: pca.ap, txt: f3(pca.ap), cls: "real" }, ...nl.map(x => ({ lab: nombre(x.modelo).replace(/.*(semilla|seed)/, ES ? "no lineal, semilla" : "nonlinear, seed"), v: x.ap, txt: f3(x.ap), cls: "pred" }))], 1);
    const prom = k => nl.reduce((a, x) => a + x[k], 0) / nl.length;
    el("ae-kpi2").innerHTML = kpi([{ t: ES ? "PR-AUC del PCA" : "PCA PR-AUC", v: f3(pca.ap), col: css("--v") }, { t: ES ? "PR-AUC no lineal, promedio de 3 semillas" : "nonlinear PR-AUC, mean of 3 seeds", v: f3(prom("ap")), col: css("--cobre") }, { t: ES ? "AUC ROC no lineal, promedio" : "nonlinear ROC AUC, mean", v: f3(prom("auc")) }, { t: ES ? "AUC ROC del PCA" : "PCA ROC AUC", v: f3(pca.auc) }]);
  }
  function r3() { el("ae-t3").innerHTML = tabla([T.modelo, "PR-AUC", "AUC ROC", "precision@100", "recall@500"], D.map(x => ({ cls: x.modelo.startsWith("PCA") ? "hi" : "", c: [nombre(x.modelo), f3(x.ap), f3(x.auc), f2(x.p100), f3(x.r500)] }))); }
})();

// ===================== 06 t-SNE y UMAP =====================
(function () {
  const M = DATA.ae.mapas, R = DATA.ae.ruido;
  const st = modulo("map", PASOS.map, [r0, r1], { m: "x2", r: "x2" });
  function r0() { const g = M[st.m]; el("map-plot0").innerHTML = nube([{ pts: g.normal, col: css("--muted"), op: 0.45 }, { pts: g.fraude, col: css("--bad"), r: 3, op: 0.9 }], {}) + leyenda([{ col: css("--muted"), lab: T.normal }, { col: css("--bad"), lab: T.fraude }]); }
  function r1() { const g = R[st.r]; el("map-plot1").innerHTML = nube([{ pts: g.p || Object.values(g)[0], col: css("--muted"), op: 0.55, r: 1.8 }], {}); }
  segmento("map-m", "m", v => { st.m = v; ST.map.render(); });
  segmento("map-r", "r", v => { st.r = v; ST.map.render(); });
})();

// ===================== 07 PREGUNTAS =====================
(function () { modulo("pre", PASOS.pre, [() => { }, () => { }]); })();

// ===================== arranque =====================
document.querySelectorAll("#tabs button").forEach(b => b.onclick = () => irModelo(b.dataset.m));
quieto = true;
MODELOS.forEach(m => { if (m !== (init && init.m)) { ST[m].st.paso = 0; } });
const m0 = init && init.m && MODELOS.includes(init.m) ? init.m : "idea";
if (init && typeof init.paso === "number" && ST[m0]) ST[m0].st.paso = init.paso;
irModelo(m0);
quieto = false;
const obs = new MutationObserver(() => ST[estado.m].render());
obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
return { getState: () => ({ m: estado.m, paso: ST[estado.m].st.paso }), destroy: () => obs.disconnect() };
}
