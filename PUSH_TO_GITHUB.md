# Push Winglex Creator Lab to GitHub

This archive contains the source of the private Winglex Creator Lab app, including the original creator tracker data. It does not contain Git history, dependencies, build output, environment files, or source-repository credentials.

## 1. Create an empty private repository
On GitHub, create a private repository called winglex-creator-lab.
Do not initialize it with a README, .gitignore, or license; this source already includes project files.

## 2. Extract and open the source folder
Extract the ZIP. Open Terminal (macOS/Linux) or Git Bash (Windows) in the extracted winglex-creator-lab folder.

## 3. Push
Replace YOUR_USERNAME with your GitHub username or organization.

```bash
git init -b main
git add .
git commit -m "Initial Winglex Creator Lab"
git remote add origin https://github.com/YOUR_USERNAME/winglex-creator-lab.git
git push -u origin main
```

Authenticate with your configured GitHub credential manager or GitHub CLI. Your ordinary GitHub account password is not a Git HTTPS password. If Git requests a commit identity, configure your own name and email before retrying the commit.

Official instructions:
https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github

## Source map
- app/creator-lab.tsx — interface and user interactions
- app/globals.css — design and responsive layout
- lib/model.ts — validation, creator imports, fit rubric and ROI calculations
- lib/seed.ts — original creator data and initial review notes
- app/api/workspace/route.ts — load/save API with revision conflict protection
- db/schema.ts and drizzle/ — persistent workspace schema and migration
- package.json and package-lock.json — dependencies
- vite.config.ts and worker/index.ts — Vinext / Cloudflare runtime

## Source hosting versus app hosting
Pushing to GitHub stores the code. It does not redeploy the live app or transfer the hosted database.
The app currently targets Vinext, Cloudflare Workers and a D1 database binding named DB, with owner-private access provided by Sites. It is not a static GitHub Pages app.
A separate deployment needs a provisioned database, applied migration, runtime configuration and private access controls. The original .openai/hosting.json is retained as source metadata; its project_id is not a credential and does not grant access to the original Site.
Use Node.js 22.13 or newer; dependencies can be installed with npm ci. Build scripts expect Bash and GNU timeout (Windows users can use WSL). Local or external runtime/database setup has not been packaged as a one-click deployment.

## Data
lib/seed.ts includes your original tracker, including creator contact details, rates and notes. Keep this repository private unless you first replace that data.
Saved scenarios and edits made in the live app are stored separately in D1; they are not in this source archive. To retain those separately, use Actual results → Export workspace backup in the live app.

## Validation
The source was built successfully for the current Sites deployment. Model calculations, original CSV import and SQLite revision checks were tested. This handoff does not claim a new standalone hosting deployment or browser test.
