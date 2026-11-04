/* PT2 version and changelog: the one file to edit for a new update.
   For each update: add a new block at the TOP of `releases` (newest first) with the new version, the date
   (dd/mm/yyyy) and a few short, plain lines for students. Nothing else needs changing: the What's New
   pop-up, Settings → Changelog and the "new update" notice all read from here.
   Keep each block's version and date written the same way as below (the update check reads the first block). */
var APP_INFO = {
  releases: [
    {
      version: '0.30',
      date: '04/11/2026',
      changes: [
        'Anatomy: Axial and Appendicular are now one Bone Identification card that asks which part of the skeleton each bone belongs to.',
        'Anatomy: new Bone MCQs and Bone Linking cards.',
        'Anatomy: clearer wording for the vertebrae, skull and facial bones.',
        'On phones, a slight sideways swipe or opening a picture now stops the auto-next bar, and other touches no longer do.',
        'You can swipe between a question\'s pictures when they\'re open full size.'
      ]
    },
    {
      version: '0.29',
      date: '04/11/2026',
      changes: [
        'Anatomy is now released.',
        'In Picture Study, choosing a mode on one picture now applies it to every picture.',
        'On phones, Picture Study now scrolls to the typing box when the keyboard opens.',
        'The auto-next bar is back on phones.'
      ]
    },
    {
      version: '0.28',
      date: '03/11/2026',
      changes: [
        'Medical Physics now covers Chapters 3 to 6. Chapter 7 has been removed, including its formulas and its Mixed Chapters questions.',
        'On phones, you can swipe left or right to change questions, and a question counter replaces the navigation buttons.',
        'On phones, the auto-next bar is gone, and the page now scrolls to keep the question, its explanation and the keyboard in view.',
        'Each set card now shows its timer and progress bar.',
        'Stepped questions expand smoothly, and tapping a locked step takes you to the last unlocked one.',
        'Pictures in quiz questions are smaller on PCs.',
        'Typed answers now ignore apostrophes.',
        'Changes to the Mixed section of Medical Terminology, which is now finalized.',
        'The update notice now has a Dismiss button.'
      ]
    },
    {
      version: '0.27',
      date: '01/11/2026',
      changes: [
        'Update notices and the what\'s new popup now show in the quiz screen.'
      ]
    },
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
