# sleektemplates

A static site for browsing Discord server templates, each with its own setup guide. No build step; it runs as-is on GitHub Pages.

## Deploy (about 3 minutes)

1. Create a **public** GitHub repo (for example `sleektemplates`).
2. Upload everything in this folder (drag the files and folders into the repo page, then commit). Make sure `index.html` is at the top level.
3. Go to **Settings → Pages**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. Your site goes live at `https://YOUR-USERNAME.github.io/REPO-NAME/`.

## Add a template

1. Add a Markdown guide at `guides/<id>.md`. Start it with a `# Title` line (the site hides it and shows the template name instead). Use `## Headings` for each section; they become the "On this page" menu.
2. Add an entry to `templates.json`:

```json
{
  "id": "my-template",
  "name": "My Template",
  "tagline": "One sentence on what it gives you.",
  "tags": ["Community"],
  "setup": "15 min",
  "bots": ["Dyno"],
  "author": "your name",
  "discordUrl": "https://discord.new/YOUR_TEMPLATE_CODE",
  "channels": [
    { "name": "Info", "channels": ["t:welcome", "v:Discord Members: 0"] }
  ]
}
```

- `id` must match the guide's filename (without `.md`).
- Channel strings start with `t:` for a text channel or `v:` for a voice channel. They drive the little channel previews on each card.
- The **first** template in the list is shown in the hero preview.

## Before you publish

- Replace every `REPLACE_WITH_YOUR_TEMPLATE_CODE` with your real Discord template link.
- Delete the two sample entries (`gaming-hub`, `study-lounge`) and their guide files, or replace them with real templates.

## Previewing locally

Opening `index.html` directly won't work because browsers block `fetch` on local files. Run `python3 -m http.server` in this folder and open http://localhost:8000.
