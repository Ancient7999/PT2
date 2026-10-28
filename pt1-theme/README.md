# PT1 theme settings (kept, hidden, not active)

These files are copied unchanged from the Med Physics PT1 project so the theme
settings are available in this repository, as you asked. They are NOT loaded by
the portal, so they change nothing about how the portal looks:

| File | What it is |
| --- | --- |
| `settings-modal.html` | PT1's theme / settings window (gear button + panels) |
| `colorizer-theme.js`, `colorizer.css`, `theme-vars.css` | PT1's colour themes, fonts picker and accent system |
| `particles.js` | PT1's particle helper used by the theme |
| `colorizer-panel.fragment.html` | PT1's colour panel fragment |
| `fonts.css` | PT1's font list (Google Fonts import) |

`index.html` also carries the settings window inside an inert
`<template id="pt1ThemeSettingsTemplate">`. A `<template>` is never shown and
its scripts never run.

The only PT1 theme behaviour the portal uses is touch detection
(`data-pointer-input`), which is copied into `js/quiz-engine.js` because the
quiz needs it. The mood themes, skins and the cursor randomiser stay in charge
of colours.

To turn the PT1 theme on later you would load the CSS/JS above and clone the
template into the page; that would need testing against the mood themes first.
