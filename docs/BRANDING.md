# Ember Page branding

Ember Page 0.1.1 uses the supplied pixel artwork for Chrome extension icons, extension headers and favicons, the local dashboard, and the README. The original image is retained in `assets/ember-page-logo.png`; the installed assets are resized PNG derivatives in `public/icons/`.

At the user's request, this release starts fresh. The article format is `emberpage.article`; discovery uses `emberpage-v1-listing` and `emberpage-v1-rating`. IndexedDB stores, the signing-key slot, the local metadata directory, and internal names use Ember Page identifiers. Previous data and discovery namespaces are not read or migrated. Historical signed research records remain unchanged; pre-rebrand source is available at the `v0.1.0` tag.

Verification: strict TypeScript, 83 tests, extension and dashboard browser smoke at 360/800/1280px, and 20 sequential edge-case drives. The source artwork was used without generated replacements or a layout redesign.
