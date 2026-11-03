# Data folder

`sample/` holds the only data the app loads: three FICTIONAL files (made-up studies, participants and quotes; every link points at example.com). Regenerate them with `npm run sample`.

Do not put real research data in this folder. The app does not read it, and `.gitignore` and `.vercelignore` exclude any `.json` file placed directly here.
