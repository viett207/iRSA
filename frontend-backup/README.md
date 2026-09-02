# iRSA frontend redesign workspace

This workspace was created on **2026-09-01** from the working tree at commit
`d33ccd09` (`update frontend`). It started as a source-level backup and now
contains the isolated NG-ZORRO theming refactor requested for the redesign. The
original `frontend-admin/` and `frontend-portal/` directories remain unchanged.

## Contents

- `frontend-admin/`: Angular admin/HR application, 73 source/config files.
- `frontend-portal/`: Angular candidate portal, 63 source/config files.
- `shared/styles/foundation.less`: the single design-token and NG-ZORRO theme
  source consumed by both applications.
- `scripts/check-ui-boundaries.mjs`: architecture guard for both applications.
- `DESIGN.md`: proposed visual direction and implementation roadmap.

The snapshot intentionally excludes generated or reproducible artifacts:

- `node_modules/`
- `dist/`
- `.angular/`
- `coverage/`, `tmp/`, `out-tsc/`
- `*.tsbuildinfo` and `.DS_Store`

This reduces the backup from roughly 961 MB (including installed dependencies)
to roughly 2.4 MB while preserving application code, routes, services,
environments, translations, configuration, manifests, and lockfiles.

## Verification

- The initial snapshot matched both source applications before the isolated
  theming refactor began.
- Both redesigned applications completed a production build on 2026-09-01.
- `npm run check:ui` passes and enforces: no React/shadcn/Radix dependency, no
  `!important`, no `::ng-deep`, no local token definitions, no Montserrat, no
  inline Angular component templates/styles, and no NG-ZORRO internal selector
  in components.
- Both applications enforce the same 12 kB `anyComponentStyle` warning budget.
- The Jobs page is split into seven view components; the interview room is split
  into five view components while their parent classes retain state and service
  orchestration.
- The Admin shell uses the shared 256/64 px sidebar contract. Candidate
  Evaluation uses a resizable PDF/AI split view with lazy NG-ZORRO tabs, and the
  Portal Home places recent jobs directly below a compact search hero.
- Both apps receive the same colors, spacing, radius, typography, elevation,
  control geometry, and NG-ZORRO variables from the shared foundation.
- The final admin build no longer reports the previous dashboard component-style
  budget warning. The refactored Admin and Portal production builds report no
  component-style budget warning.
- Angular 17 emits a forward-looking warning for the inline JavaScript used by
  NG-ZORRO 17's official LESS color functions. It does not fail the build, but
  should be reassessed during an Angular/NG-ZORRO major-version upgrade.

Treat the two original frontend directories as the unchanged behavior baseline;
continue visual work only in this isolated workspace or on a dedicated branch.

To run either application independently, enter its directory, run `npm ci`,
then run `npm run check:ui` and `npm start`. Dependencies and generated build
outputs are not included.
