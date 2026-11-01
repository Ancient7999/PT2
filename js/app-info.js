/* PT2 version and changelog: the one file to edit for a new update.
   For each update: add a new block at the TOP of `releases` (newest first) with the new version, the date
   (dd/mm/yyyy) and a few short, plain lines for students. Nothing else needs changing: the What's New
   pop-up, Settings → Changelog and the "new update" notice all read from here.
   Keep each block's version and date written the same way as below (the update check reads the first block). */
var APP_INFO = {
  releases: [
    {
      version: '0.26',
      date: '01/11/2026',
      changes: [
        'Picture Study now counts each completed picture.',
        'Updated the quote list.',
        'Removed the version label from the corner.'
      ]
    },
    {
      version: '0.25',
      date: '01/11/2026',
      changes: [
        'The site now tells you when a new update is out, with a button to refresh straight to it.',
        'New Changelog tab in Settings, to see what changed in each version.',
        'Visual enhancements.',
        'New Basic theme option in Settings.',
        'Every third break is now a longer 15-minute break.',
        'Simpler background grid options: Off, Low and Moderate.',
        'Fixes to Anatomy questions and pictures.'
      ]
    },
    {
      version: '0.1',
      date: '28/10/2026',
      changes: [
        'Initial release'
      ]
    }
  ]
};
// the current version (the top block), in the shape the rest of the site uses
APP_INFO.version = APP_INFO.releases[0].version;
APP_INFO.revisionDate = APP_INFO.releases[0].date;
APP_INFO.changelog = APP_INFO.releases[0].changes;
