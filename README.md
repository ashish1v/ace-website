# ACE Consulting Group website

Static site for [aceconsultinggroup.in](https://aceconsultinggroup.in). No build step.

- `index.html`: single-page site (About, Five Pillars, Approach, Corridors, Leadership, Contact)
- `styles.css`, `main.js`: styling and interactions
- `thank-you.html`: contact form success page (Netlify Forms)
- `404.html`, `robots.txt`, `sitemap.xml`, `netlify.toml`

Preview locally: `python -m http.server 8080` and open http://localhost:8080

Deploy: Netlify, connected to this GitHub repo, with publish directory `.`
