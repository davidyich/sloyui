# Reference review — Sloy UI V2

Reviewed on 2026-10-14: all 22 PNG files supplied in `/Users/davidov/AI/PROJECTS/sloyui/interface-refs`, all 24 reference images on the Figma Refs page, and the native nested-surface examples in `19:190`. The two sets overlap; their counts are not additive unique references. SHA-256 identities of local files are in `reference-inventory.json`.

The intended product is one system capable of composing all the supplied interface archetypes through structure, contrast and surface context. These are representative compositions, not pixel-for-pixel copies or a claim that every application interaction is implemented.

| Reference pattern | Design decision | Visible evidence |
| --- | --- | --- |
| Ace Studio, Synara, Linear, Codex: navigation, work area, task or conversation content | Separate Shell, Workspace and Content; neutral controls adapt to their own region | Workspace in all four Theme × Scheme combinations |
| Dense inboxes and dark collaboration tools, including Gr8r | Keep compact metadata and distinct content primary / secondary / tertiary / muted; do not solve density by reducing contrast | Task board, queue, side navigation and context overlay |
| Dark frame with white working document; commerce + assistant | Local Theme override creates a complete contrasting region, including descendants; simple primary/invert fills use their paired foreground | Mixed shell / Commerce, including the dark citation inside a Light document |
| NotebookLM and the supplied Standard / Dimmed example | Standard steps toward lighter dark surfaces; Dimmed reverses Workspace/Content depth while Overlay stays raised | Four nested Workspace views and the full color atlas |
| Raycast, translucent Synara, ReactBits and airy assistant reference | Glass is a material with a protective alpha base and real background blur; its neutral and chromatic secondary/tertiary fills remain alpha layers | Glass command workspace in Light and Dark, over the supplied discrete photograph |
| Aaru/theme-builder palette examples and colorful stream headers | Keep five named accent families plus an independent local Accent selector; show all hierarchies and both states together | Twenty contextual specimens, with all five hues on every surface |
| Black citation popover on a white document | Establish local Dark + Overlay instead of painting black under Light content | Citation card in Mixed shell / Commerce |

The additional local-only references were the July 30 PostiauxCharles assistant, August 18 heyrico conversation, August 25 piyushsphere citation, and September 24 kevinclark commerce view. They informed the Glass, conversation and mixed-context prototypes alongside the Figma references.

## Local image inventory

- `2026-07-30_PostiauxCharles_2082763634778718440_3_2082763568643018752 1.png`
- `2026-08-18__heyrico_2089699848031502491_3_2089699839538065408 1.png`
- `2026-08-25_piyushsphere_2092230462869794861_3_2092230454321790976 1.png`
- `2026-09-10_UI_Farhan_2097981190519365902_3_2097980936533291008 1.png`
- `2026-09-22_trySynara_2102499770593866177_3_2102499444759412736 1.png`
- `2026-09-24_kevinclark_2103217315877675423_3_2103217150370447360 1.png`
- `2026-10-03__heyrico_2106398952572735689_3_2106398943521427456 1.png`
- `2026-10-04_trySynara_2106716115833409973_3_2106716112003964928 1.png`
- `2026-10-05_alvish_2106994815938543710_3_2106994343924178944 1.png`
- `2026-10-05_alvish_2106994815938543710_3_2106994343940911104 1.png`
- `2026-10-05_alvish_2106994815938543710_3_2106994343945080832 1.png`
- `2026-10-09_uidesign_studio_2108407307449270413_3_2108407274817658880 1.png`
- `2026-10-09_uidesign_studio_2108407307449270413_3_2108407280836415488 1.png`
- `CleanShot 2026-10-09 at 10.30.36@2x 1.png`
- `CleanShot 2026-10-09 at 10.30.44@2x 1.png`
- `CleanShot 2026-10-11 at 23.29.52@2x 1.png`
- `CleanShot 2026-10-11 at 23.30.52@2x 1.png`
- `CleanShot 2026-10-12 at 02.33.54@2x 1.png`
- `image 1.png`
- `image 2.png`
- `image 3.png`
- `raycast.png`

## Figma evidence

Original page: `0:1` (Refs), native examples `19:60` (standart) and `19:130` (dimmed), within `19:190`. All 20 original page roots remain present. New work is on three separate V2 pages; the original reference nodes were not edited.

The final prototypes use editable text, auto-layout frames, vectors and reusable native components. The only bitmap used in their composition is the original discrete architectural photograph, not a screenshot of an interface.
