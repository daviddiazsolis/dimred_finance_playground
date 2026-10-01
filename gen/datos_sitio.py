"""Regenera src/engine/data.json, los números que muestra el sitio.

Reproduce los cálculos de los notebooks 08 (fraude con PCA) y 09 (curva de tasas) con scikit-learn, y lee del
notebook 10 ya ejecutado (autoencoder) su tabla final y las coordenadas de t-SNE y UMAP, para no tener que
reentrenar redes. Uso:

    python gen/datos_sitio.py RUTA_A/creditcard.csv RUTA_A/curvas_chile.csv RUTA_A/carpeta_tesoro RUTA_A/10_Fraude_con_Autoencoder.ipynb
"""
import json, sys, glob, re
import numpy as np, pandas as pd
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import average_precision_score as AP, roc_auc_score as AUC

csv_fraude, csv_curvas, dir_tesoro, nb10 = sys.argv[1:5]
R = lambda x, d=4: float(round(float(x), d))
out = {}

# ---------------------------------------------------------------- fraude (notebook 08)
datos = pd.read_csv(csv_fraude)
COLS = [f"V{i}" for i in range(1, 29)] + ["Amount"]
tr, te = train_test_split(datos, test_size=0.33, random_state=2018, stratify=datos["Class"])
y_tr, y_te = tr["Class"].values, te["Class"].values
esc = StandardScaler().fit(tr[COLS]); X_tr, X_te = esc.transform(tr[COLS]), esc.transform(te[COLS])
pfull = PCA().fit(X_tr); Z = pfull.transform(X_te); ve = pfull.explained_variance_ratio_
barrido = []
for k in range(1, 29):
    s = (Z[:, k:] ** 2).sum(1)
    barrido.append({"k": k, "ap": R(AP(y_te, s)), "p100": R(y_te[np.argsort(-s)][:100].mean(), 2), "var": R(ve[:k].sum())})
cargas = {f"CP{j + 1}": [R(v, 3) for v in pfull.components_[j]] for j in [0, 27, 28]}
pca = PCA(n_components=0.95).fit(X_tr)
err = lambda m, X: ((X - m.inverse_transform(m.transform(X))) ** 2).sum(1)
e_tr, e_te = err(pca, X_tr), err(pca, X_te)
umbrales = []
for q in [99.0, 99.5, 99.8, 99.9, 99.95]:
    u = np.percentile(e_tr, q); a = e_te > u
    tp = int((a & (y_te == 1)).sum()); fp = int((a & (y_te == 0)).sum())
    umbrales.append({"q": q, "u": R(u, 2), "alertas": int(a.sum()), "tp": tp, "fp": fp, "fn": int(y_te.sum() - tp),
                     "rec": R(tp / y_te.sum(), 3), "pre": R(tp / max(a.sum(), 1), 3)})
bins = np.linspace(-4, 4, 65)
h0, _ = np.histogram(np.log10(e_te[y_te == 0]), bins=bins, density=True)
h1, _ = np.histogram(np.log10(e_te[y_te == 1]), bins=bins, density=True)
grupo = ["V17", "V12", "V14", "V10", "V16", "V7"]
out["fraude"] = {
    "n": int(len(datos)), "fraudes": int(datos["Class"].sum()), "ntr": int(len(tr)), "nte": int(len(te)), "fte": int(y_te.sum()),
    "var": [R(v) for v in ve], "barrido": barrido, "cargas": cargas, "cols": COLS, "k95": int(pca.n_components_),
    "ap": R(AP(y_te, e_te), 3), "auc": R(AUC(y_te, e_te), 3), "umbrales": umbrales,
    "pk": [{"k": k, "f": int(y_te[np.argsort(-e_te)][:k].sum())} for k in [50, 100, 200, 500, 1000]],
    "hist": {"bins": [R(b, 2) for b in bins], "normal": [R(v, 3) for v in h0], "fraude": [R(v, 3) for v in h1]},
    "corr": {"vars": grupo, "todas": datos[grupo].corr().round(2).values.tolist(),
             "normales": datos.loc[datos["Class"] == 0, grupo].corr().round(2).values.tolist()},
}

# partición por tiempo y comparación con supervisados
o = datos.sort_values("Time").reset_index(drop=True); c = int(len(o) * .7)
trt, tet = o.iloc[:c], o.iloc[c:]; yt_tr, yt_te = trt["Class"].values, tet["Class"].values
et = StandardScaler().fit(trt[COLS]); Xt_tr, Xt_te = et.transform(trt[COLS]), et.transform(tet[COLS])

def supervisados(Xa, ya, Xb):
    s = {}
    s["log"] = LogisticRegression(max_iter=2000).fit(Xa, ya).decision_function(Xb)
    s["gb"] = HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=300, l2_regularization=1.0,
                                             min_samples_leaf=50, random_state=0).fit(Xa, ya).predict_proba(Xb)[:, 1]
    rng = np.random.default_rng(0)
    pocos = np.r_[rng.choice(np.where(ya == 1)[0], 20, replace=False), np.where(ya == 0)[0]]
    s["log20"] = LogisticRegression(max_iter=2000).fit(Xa[pocos], ya[pocos]).decision_function(Xb)
    return s

def met(y, s):
    o_ = np.argsort(-s)
    return {"ap": R(AP(y, s), 3), "auc": R(AUC(y, s), 3), "p100": R(y[o_][:100].mean(), 2), "r500": R(y[o_][:500].sum() / y.sum(), 3)}

azar = {"pca": e_te, "pcaN": err(PCA(n_components=0.95).fit(X_tr[y_tr == 0]), X_te), **supervisados(X_tr, y_tr, X_te)}
tiempo = {"pca": err(PCA(n_components=0.95).fit(Xt_tr), Xt_te), "pcaN": err(PCA(n_components=0.95).fit(Xt_tr[yt_tr == 0]), Xt_te),
          **supervisados(Xt_tr, yt_tr, Xt_te)}

def eje_fraude(m, X, y):
    Zx = m.transform(X); razon = Zx[y == 1].var(0) / Zx[y == 0].var(0); j = int(np.argmax(razon))
    return {"rango": j + 1, "var": R(m.explained_variance_ratio_[j]), "razon": int(round(razon[j]))}

out["futuro"] = {"azar": {k: met(y_te, v) for k, v in azar.items()}, "tiempo": {k: met(yt_te, v) for k, v in tiempo.items()},
                 "ntr": int(len(trt)), "ftr": int(yt_tr.sum()), "nte": int(len(tet)), "fte": int(yt_te.sum()),
                 "eje_todo": eje_fraude(PCA().fit(Xt_tr), Xt_tr, yt_tr), "eje_normal": eje_fraude(PCA().fit(Xt_tr[yt_tr == 0]), Xt_tr, yt_tr)}

# ---------------------------------------------------------------- curva (notebook 09)
cur = pd.read_csv(csv_curvas, index_col=0, parse_dates=True)
P = ["UF_2A", "UF_5A", "UF_10A", "UF_20A", "UF_30A"]
cob = cur[P].notna().groupby(cur.index.year).mean()
sem = cur[P].resample("W-FRI").last().loc["2008-01-01":"2021-12-31"].dropna()
cam = (sem.diff() * 100)[sem.index.to_series().diff().dt.days == 7].dropna()
esc_c = StandardScaler().fit(cam); Xc = esc_c.transform(cam); pc = PCA().fit(Xc)
sg = np.sign([pc.components_[0].sum(), pc.components_[1][-1], pc.components_[2][1]]); W = pc.components_[:3] * sg[:, None]
F = Xc @ W.T

def rmse(k, A, B, sc):
    m = PCA(n_components=k).fit(A); r = (B - m.inverse_transform(m.transform(B))) * sc
    return [R(v, 2) for v in np.sqrt((r ** 2).mean(0))]

antes = cam.index < "2015-01-01"; ea = StandardScaler().fit(cam[antes]); Xa, Xd = ea.transform(cam[antes]), ea.transform(cam[~antes])
oos = []
for k in range(1, 6):
    m = PCA(n_components=k).fit(Xa); r = Xd - m.inverse_transform(m.transform(Xd))
    oos.append({"k": k, "cap": R(1 - (r ** 2).sum() / ((Xd - Xd.mean(0)) ** 2).sum(), 3), "rmse": [R(v, 2) for v in np.sqrt(((r * ea.scale_) ** 2).mean(0))]})
partes = [pd.read_csv(f) for f in sorted(glob.glob(dir_tesoro + "/tesoro_*.csv"))]
t = pd.concat(partes); t["Date"] = pd.to_datetime(t["Date"], format="%m/%d/%Y"); t = t.set_index("Date").sort_index()
U = ["2 Yr", "5 Yr", "10 Yr", "20 Yr", "30 Yr"]
su = t[U].resample("W-FRI").last().loc["2008-01-01":"2021-12-31"].dropna()
cu = (su.diff() * 100)[su.index.to_series().diff().dt.days == 7].dropna()
pu = PCA().fit(StandardScaler().fit_transform(cu)); su_ = np.sign([pu.components_[0].sum(), pu.components_[1][-1], pu.components_[2][1]])
paseos = []
for s in range(50):
    pw = np.cumsum(np.random.default_rng(s).normal(size=(660, 5)), axis=0)
    paseos.append(PCA().fit(StandardScaler().fit_transform(pw)).explained_variance_ratio_[0])
semanas = sem.iloc[::1]
out["curva"] = {
    "plazos": [2, 5, 10, 20, 30], "fechas": [d.strftime("%Y-%m-%d") for d in semanas.index],
    "niveles": [[R(v, 2) for v in fila] for fila in semanas.values],
    "cob_anios": [int(a) for a in cob.index], "cob": [[R(v, 2) for v in cob[c_]] for c_ in P],
    "paseos_niveles": R(np.mean(paseos), 3), "niveles_uf": R(PCA().fit(StandardScaler().fit_transform(sem)).explained_variance_ratio_[0], 3),
    "std_bp": [R(v, 1) for v in cam.std()], "escala": [R(v, 3) for v in esc_c.scale_],
    "var": [R(v) for v in pc.explained_variance_ratio_], "lam": [R(v) for v in pc.explained_variance_[:3]],
    "W": [[R(v, 3) for v in w] for w in W],
    "rmse_in": {k: rmse(k, Xc, Xc, esc_c.scale_) for k in range(1, 6)}, "oos": oos,
    "fac_fechas": [d.strftime("%Y-%m-%d") for d in cam.index], "fac_acum": [[R(v, 2) for v in np.cumsum(F[:, j])] for j in range(3)],
    "us_var": [R(v) for v in pu.explained_variance_ratio_], "us_W": [[R(v, 3) for v in w] for w in pu.components_[:3] * su_[:, None]],
    "us_std": [R(v, 1) for v in cu.std()],
}

# ---------------------------------------------------------------- autoencoder y mapas (notebook 10 ya ejecutado)
nb = json.load(open(nb10))
tabla, mapas, ruido = None, None, None
for c_ in nb["cells"]:
    if c_["cell_type"] != "code":
        continue
    src = "".join(c_["source"])
    for o_ in c_.get("outputs", []):
        d = o_.get("data", {})
        if src.startswith("s_log = ") and "text/plain" in d:
            tabla = "".join(d["text/plain"])
        if "application/vnd.plotly.v1+json" in d and "mapas = pd.concat" in src:
            mapas = d["application/vnd.plotly.v1+json"]
        if "application/vnd.plotly.v1+json" in d and "ruido = " in src:
            ruido = d["application/vnd.plotly.v1+json"]
filas = []
for linea in tabla.splitlines()[2:]:
    m = re.match(r"^(.*?)\s+(-?\d\.\d+)\s+(-?\d\.\d+)\s+(-?\d\.\d+)\s+(-?\d\.\d+)$", linea)
    if m:
        filas.append({"modelo": m.group(1).strip(), "ap": float(m.group(2)), "auc": float(m.group(3)), "p100": float(m.group(4)), "r500": float(m.group(5))})

def puntos(fig, max_normales=1500):
    res = {}
    rng = np.random.default_rng(0)
    for tr_ in fig["data"]:
        x, y = tr_["x"], tr_["y"]
        if isinstance(x, dict):            # plotly guarda arreglos binarios en algunas versiones
            import base64
            x = np.frombuffer(base64.b64decode(x["bdata"]), dtype=x["dtype"]); y = np.frombuffer(base64.b64decode(y["bdata"]), dtype=y["dtype"])
        x, y = np.asarray(x, float), np.asarray(y, float)
        if tr_.get("name") == "normal" and len(x) > max_normales:
            i = rng.choice(len(x), max_normales, replace=False); x, y = x[i], y[i]
        clave = (tr_.get("xaxis", "x"), tr_.get("name", ""))
        res.setdefault(clave[0], {})[clave[1] or "p"] = [[R(a, 2), R(b, 2)] for a, b in zip(x, y)]
    return res

out["ae"] = {"tabla": filas, "mapas": puntos(mapas), "ruido": puntos(ruido, 1500)}

with open("src/engine/data.json", "w") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
print("data.json:", round(len(json.dumps(out)) / 1024), "KB")
