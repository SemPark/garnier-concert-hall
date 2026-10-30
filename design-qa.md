# Golden Hall — visual QA

Date: 2026-10-30

Reference: https://musikverein.at/en/vermietung/grosser-saal/

Scope: stylized native 3D reconstruction of the hall's proportions and architectural features, retaining the established characters and concert controls. Not a photogrammetric or pixel-identical copy of its sculpture and paintings.

## Compared evidence

- Official Dieter Nagl hall photograph, viewed at its official image URL in the browser.
- `artifacts/golden-hall-overview.png` — rear gallery view, 1440×900.
- `artifacts/golden-hall-stage.png` — orchestra view.
- `artifacts/golden-hall-walking.png` — rear entrance view.
- `artifacts/golden-hall-mobile.png` — 390×844.

## Findings

- P0/P1/P2: none remaining within this reconstruction scope.
- Long rectangular proportions, bilateral galleries, tall arched windows, rear organ, gilded supports, coffered painted ceiling and repeated crystal pendants are present.
- Full-hall and closer-concert views avoid making either architectural appreciation or orchestra viewing depend on a single camera distance.
- Center and side aisles remain accessible through the dense rows. Actual entrance-to-seat movement, sitting and standing passed in the browser.
- Mobile controls remained on screen without horizontal overflow. Audio continued playing with no reported media error.
- Repeated static chairs and building pieces are instanced. Desktop observation was about 43–48fps; this is not a device performance guarantee.
- P3 follow-up: more detailed sculpted relief, individually varied painted panels and curved wooden chair backs. These details are visibly simplified rather than claimed to be original building assets.

Validation: type checks, 18 unit tests, production build and real local-server integration suite passed.

final result: passed
