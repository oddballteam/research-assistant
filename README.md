# Research Assistant

A workbench for VA researchers and designers. It starts from what the research repository already knows (past plans, guides, findings and participant quotes), then walks through the standard study flow: research plan, conversation guide, early findings, final report, and adding the study back to the repository with its labels. It started as a Claude artifact and now runs as a static site. There are no accounts and no server code: everything you draft stays in your own browser.

## Proof of concept

This is a proof of concept, not a product. It exists to test one idea:

> If a designer sees what past research already asked and found **before** writing a plan, they will repeat fewer questions and start from better evidence, and every claim they carry forward stays traceable to its source.

What a demo should let someone see:

1. **Know first.** Search a topic and see questions asked before, participant quotes, findings and the study each came from, each with a source link. Nothing is summarized without a source.
2. **Catch repeats.** Paste draft questions and see which ones overlap with earlier ones, with the wording match shown.
3. **Carry evidence forward.** Pin items; the pins travel with their citation into the plan, guide, findings and report.
4. **Check alignment.** Link each guide question to a plan goal (or mark it a warm-up). A panel shows which goals no question tests and which questions serve none, and the exported guide includes the same summary. This is the one feature added after the artifact.
5. **Follow the standard flow.** Plan, guide, early findings, final report, then the repository intake step, each drafted from templates and exportable as Markdown.

Deliberately out of scope for the POC: real research data (sample only), accounts or shared drafts, any model-generated text, integration with the Component Prototype Builder, and a refresh pipeline for the index. Those are the next questions if the concept holds up.

This section is drafted from the goals you described for the tool. Edit it so it says exactly what you want the POC to prove.

```
public/               the app (served as-is)
  index.html          markup
  styles.css          styles
  app.js              the Research Assistant: the artifact plus four small patches and the goal-alignment check
  claude-shim.js      stands in for Claude's artifact runtime (saving a file)
  data/
    sample/           the FICTIONAL sample data the app loads (committed)
    README.md         notes on this folder
scripts/
  split-artifact.mjs  re-creates public/ from a fresh artifact export and applies the patches
  make-sample-data.mjs  writes public/data/sample/*.json
  dev-server.mjs      local static server for public/
source/               the original single-file artifact, for reference
tests/                node --test
vercel.json           output directory and basic headers (including noindex)
```

## How it fits together

Unlike the Component Prototype Builder, this tool never calls Claude. It searches pre-built index files in the browser and drafts documents from templates, so there is **no `api/` folder, no `ANTHROPIC_API_KEY`, and nothing to configure in Vercel**.

The app asks `window.claude.use("downloads")` for one thing, saving a Markdown file, and `claude-shim.js` answers with a normal browser download. Anything else it asks for gets `null`, and the app falls back to its Copy buttons.

Drafts are saved in this browser's `localStorage` (key `va-research-assistant-v1`). They are per browser and per device, and clearing site data erases them. Use the download and Copy buttons to keep or hand off work.

## Data

This repo contains **fictional sample data only**, and the app loads nothing else. The three files in `public/data/sample/` describe made-up studies, participants and quotes, with every link pointing at example.com. The footer and top bar say "Sample data" on every page.

| File | What it is |
| --- | --- |
| `research-index.json` | Board studies, plans, guides, findings, questions and participant quotes |
| `explorer-index.json` | The Research Explorer layer: findings with automatic labels and confidence |
| `repo-labels.json` | Issue labels, used by the Register step |

The app has no code path that reads real research data. As a second guard, `.gitignore` and `.vercelignore` exclude any `.json` file placed directly in `public/data/`, and a test checks that those rules are in place. To change the sample, edit `scripts/make-sample-data.mjs` and run `npm run sample`.

## Run it locally

```
npm run dev      # http://localhost:3000
npm test
```

## Deploy

Same steps as the Component Prototype Builder, minus the API key:

1. Push this repo to GitHub.
2. In Vercel, import the repo. There is no build command and no environment variable to add; `vercel.json` sets the output directory to `public`.
3. Turn on Deployment Protection (Settings, then Deployment Protection) if the deployment is not meant to be public. Nothing in it is real, so this is a choice, not a safeguard.
4. Open a pull request and check the preview. It shows the sample data and the "Sample data" marker.

The deployment shows the sample data and nothing else.

## Changing the app

`public/` is edited directly, and `app.js` now differs from the artifact (the goal-alignment check, between the `/* alignment:` and `/* end alignment */` markers). `npm run split` refuses to run while that block is present; pass `-- --force` to overwrite it and re-add the block by hand. To pull in a newer version of the artifact, replace `source/research-assistant.artifact.html` and run the split; that overwrites `index.html`, `styles.css` and `app.js` and re-applies the patches. The four patches are listed in `scripts/split-artifact.mjs`: they point the app at `data/sample/`, add the sample-data markers, and replace the refresh text.

To change the sample data, edit `scripts/make-sample-data.mjs` and run `npm run sample`. The generator builds each document from blocks so that quoted line numbers match the text.

## Gaps

- **Sample only, by choice.** The app was built to search a real index of the VA research repository (`research-index.json`, built by a script called `build_index.py`, plus an Explorer layer). Neither builder is in this repo and the app does not read real data. Bringing that back would be a deliberate change, not a setting, and should be checked with the owners of the research repository first.
- **Some text is VA-specific.** Prompts, templates, the "Research folder in va.gov-team" link label and the best-practice notes are written for VA research and are unchanged from the artifact. The source artifact also contains links to VA's internal research templates; they are plain URLs and are not followed by the app.
- **Browser storage.** Browsers allow roughly 5 MB per site. Drafts are small, but if storage fills, saving can fail.
- **No browser tests.** `npm test` checks the files, the shim, the sample data and the split script. The app itself was checked by loading it in headless Chrome against the sample data (all six steps, search, the overlap checker, light and dark, phone width), but that check is not part of CI.

## Secrets

None are needed. A test fails if a key-shaped string appears anywhere in the repo.
