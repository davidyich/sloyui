# Navigation and disclosure motion

Shared hover belongs to a local sibling scope. Attach a ref to a positioned container with `cap-shared-hover`, render `MovingHighlight root={ref} hover target="..."`, and limit `target` to its actions. Disabled/inert elements and nested shared scopes are excluded. Primary actions keep their own surface. Include active navigation rows in the hover path so adjacent movement stays continuous; their active fill remains static above the decorative layer. Selected SidebarItem and NavigationMenu backgrounds remain on the actual item; TreeView selection and active guide update immediately without travelling markers; never pass their selection as `MovingHighlight.selected`.

The layer batches its container, target and current visual geometry before writing. Adjacent moves use a finite native transform animation, including dimension changes through FLIP scaling. First entry places the hidden layer at its target before revealing it. Moving between a row's icon/text does not remeasure or restart motion; internal gaps preserve the target. Interruption reads the current visual position before cancelling; a true exit freezes that position and only fades opacity. Revisions preserve a valid target. Resize measurements wait for the surface to settle and update directly; they do not follow disclosure animation frame by frame. Scrolling clears stale hover and the next pointer movement reacquires once. CSS translation is the fallback; reduced motion updates geometry immediately. Do not transition width/height on this layer or animate text together with the background.

The layer uses the actual target's computed radius (the painted inner span for SegmentedControl), preserving local radius contexts and explicit pill/circle geometry. Context changes refresh without motion. Decorative outlines and divided action bar boundaries use toggleable control/panel border roles; the documented structural boundaries of nested TreeView Tag/IconBox remain visible independently. Do not add consumer `a:hover` backgrounds inside a shared scope: they flash a second surface over its layer.

Release ResizeObserver subscriptions when the hover target leaves, becomes ineligible or is cleared by scrolling; dynamic trees must not retain previously visited rows until unmount. Decorative absolute elements remain outside flow. Generic sibling stacking must exclude TreeView selection/guide indicators. Keep popup positioning on the outer panel, with the shared hover scope on its inner item container.

Tabs automatically constrain their own horizontal viewport. Overflow enables physical left/right controls and edge masks. Selection, focus and resize reveal the relevant tab with clearance for edge controls, using only the local viewport. Never call `scrollIntoView` for this interaction. Arrow keys skip disabled tabs, respect RTL, select immediately and keep a single tab stop; Home/End choose the first/last enabled tab. `scrollLabels` translates the edge buttons.

Accordion `variant="bouncy"` reuses native details semantics, optional `icon`, the finite disclosure height transition and a small transform/opacity content settle. Compose single-open sections with controlled `open` and `onOpenChange`:

```tsx
const [expanded, setExpanded] = useState<string | null>('brief');
{sections.map(section => (
  <Accordion key={section.id} title={section.title} icon={section.icon}
    variant="bouncy" open={expanded === section.id}
    onOpenChange={open => setExpanded(open ? section.id : null)}>
    {section.content}
  </Accordion>
))}
```

`defaultOpen` sets an uncontrolled initial state. Existing native `onToggle` remains supported. Closing content becomes inert immediately, while its pixels remain for the exit; closing from an inner focused action returns focus to the summary. A reopening cancels the earlier close deadline. Hover paints one restrained disclosure surface, including expanded content; summary hover does not add a second fill. Navigation variant keeps its smaller caption typography.

Calendar previous/next controls use the neutral secondary variant and `--cap-control-border`, so decorative outlines follow the nearest `data-borders` context independently of appearance. Focus outlines remain visible with borders off.

Reference concepts were inspected at [beUI Tabs](https://beui.dev/components/motion/tabs) and [beUI Bouncy Accordion](https://beui.dev/components/motion/bouncy-accordion); implementation uses the kit's existing React/CSS stack with no added runtime dependencies.

Focused coverage: `tests/navigation-motion-revision.test.tsx` checks separate hover/selection, touch exclusion, finite transform geometry, reduced motion, overflow edges, selected reveal and controlled single-open sections. Existing group-highlight, sidebar-navigation, navigation-arc and disclosure suites cover keyboard selection, disabled actions, hover panels, portal focus and reversible exits. Browser verification belongs to the overall revision report.
