# Changelog

## 0.3.0 — 2026-10-04

- Preserved the 0.2.0 workspace and installable npm archive with SHA-256 checksums and separate-directory rollback instructions.
- Added inherited base/canvas/raised surface context and an off-by-default decorative border mode; neutral fills, accent tints and supporting text follow the actual container surface.
- Kept the 12 Neutral / 12 Accent / 24 Appearance Figma base graph separate from runtime context rules. No actual Figma document was updated for this version.
- Updated portaled surfaces to preserve theme/accent/borders and establish their own raised context; added Popover trigger size and visible contextual hover states.
- Unified ActionBar, ButtonGroup and SplitButton sizing, added auto/hidden ScrollArea scrollbar selection, and replaced tinted overflow overlays with background-revealing masks.
- Added plain/surface StatusBar presentation and refined compact status and alert layouts.
- Reorganized the catalogue into 59 component pages with canonical #ComponentName routes and grouped navigation; expanded the agent manifest and usage contracts.


## 0.2.0 — 2026-10-04

- Preserved the complete 0.1.0 workspace and original npm package with SHA-256 checksums.
- Replaced the default color model with 12 neutral steps, 12 shared accent steps in 18 modes, and 24 Light/Dark semantic roles. Added Figma Variables graph and rollback-safe development importer.
- Replaced visible system Select/Popover surfaces with custom overlays. Added Drawer, scoped theme/accent inheritance, focus/inert/scroll locking, nested overlays, and enter/exit motion.
- Added ScrollArea, ButtonGroup, SplitButton, ActionBar, FloatingActionBar, FloatingField, StatusBar, Alert, SidebarPanel.
- Added Calendar, DatePicker, DailyHeader, MarkdownEditor/Preview, configurable ContentCard/TaskCard and controlled KanbanBoard/Column.
- Added pill Tabs, accent Button, inherited accent primitives and global state/motion/responsive contracts.
- Expanded the catalogue, 59-component agent manifest, working consumer example, package validation, keyboard and accessibility coverage.
