// Feature switches for the CITIZEN side of the web client (/dashboard).
//
// A feature set to `false` is DETACHED for citizens: its card is hidden on
// /dashboard, its citizen routes are not registered, and those pages never mount,
// so none of their API calls run. All code is left in place. To re-attach a
// feature, set its flag back to `true` - nothing else needs to change.
//
// The administration side (/administration and everything under it, staff
// dashboards, task assignment, GeoScope, report tracking) is NOT affected by
// these flags. Server endpoints are untouched too (the native app uses them).
export const FEATURES = {
  // /kindshare/* (donor, receiver, NGO pages)
  kindShare: true,

  // /sisterhood
  sisterHood: false,

  // /reports, /complaint, /water, /reports/me, /ecosnap/reports and the
  // Fire SOS button on /dashboard
  civicConnect: false,

  // /streetgigs
  streetGig: false,
};
