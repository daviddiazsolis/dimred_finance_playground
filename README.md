# Dimensionality Reduction Applications in Finance

Interactive microsite (English / Spanish, dark / light) on PCA, autoencoders, t-SNE and UMAP applied to two real financial problems: an unsupervised credit card fraud detector (Credit Card Fraud Detection, 284,807 transactions) and the level, slope and curvature of the Chilean UF yield curve (Central Bank of Chile). Seven tabs: the idea of projecting and reconstructing (computed live), fraud with PCA and every scikit-learn command, the time-split test and training contamination, the comparison with supervised models, the yield curve from data preparation to stress scenarios and Chile versus the US, autoencoders in Keras, t-SNE and UMAP and their pitfalls, and review questions. Part of the ML & AI Learning Hub.

Same stack as the other playgrounds: Vite + React 19 + Tailwind 4 + lucide-react + motion. MathJax is loaded from cdnjs.

## Structure

- `src/components/` shell of the site (hero, translation widget, sandbox links, notebooks, references, footer) in the hub template, with a sky accent.
- `src/components/Playground.tsx` mounts the tab engine and re-mounts it when the language changes, keeping tab and step.
- `src/engine/body.es.html`, `body.en.html` the content of the seven tabs; `engine.js` a single engine for both languages (labels that change with the controls live in its `T` dictionary); `data.json` the precomputed results; `engine.css` the styles, scoped under `.tfp`.
- `gen/datos_sitio.py` regenerates `src/engine/data.json`: it reruns the scikit-learn parts of notebooks 08 and 09 and reads the final table and the t-SNE / UMAP coordinates from the executed notebook 10, so no neural network has to be retrained. Run it from the repo root:
  `python gen/datos_sitio.py creditcard.csv data/curvas_chile.csv <folder with tesoro_YYYY.csv> notebooks/10_Fraude_con_Autoencoder.ipynb`
- `data/curvas_chile.csv` frozen copy of the UF and peso yield curves (Central Bank of Chile, public BDE), used by notebook 09 if the source does not respond.
- `notebooks/` the three Colab notebooks (08 fraud with PCA, 09 PCA of the yield curve, 10 fraud with an autoencoder), each in Spanish and English (`_EN`), linked from the site.

## Run

```
npm install
npm run dev
npm run build
```

## Publish (same flow as the other playgrounds)

1. Create the GitHub repo `daviddiazsolis/dimred_finance_playground` (empty, no README).
2. In this folder: `git init`, `git add .`, `git commit -m "Dimensionality Reduction Applications in Finance"`, `git branch -M main`, `git remote add origin https://github.com/daviddiazsolis/dimred_finance_playground.git`, `git push -u origin main`.
3. In Vercel: Add New Project, import the repo, framework Vite, deploy. The project name `dimred-finance-playground` gives the URL `https://dimred-finance-playground.vercel.app`, which is the one written in `ml_ai_portal/src/utils/sites.ts`, in `daviddiazsolis-web/src/components/Tools.tsx` and `CoursesMaterial.tsx`, and in the Colab / raw links of `NotebooksSection.tsx` and notebook 09.
4. Rebuild and push `ml_ai_portal` and `daviddiazsolis-web` so the new cards appear.
