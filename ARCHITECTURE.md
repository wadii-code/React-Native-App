# Architecture

One personal productivity system, not four apps in a tab bar. Tasks are actions,
habits are repeated actions, commitments are what matters, goals are where you
are going, challenges are the push.

## The one rule that holds it together

**Nothing stores its own progress.** Every number in the UI — habit streaks,
challenge days, goal bars, commitment percentages, today's score — is derived
from two things: the entities, and a single append-only activity log.

```
one completed action  ->  one activity record  ->  read by habit, challenge,
                                                   goal and commitment alike
```

That is why "Study German for 45 minutes" is never marked done four times.

## Data model (`src/domain/schema.js`)

```
state
├── tasks         text, notes, due date + time, priority, labels, project,
│                 section, subtasks, recurrence, links
├── habits        icon, colour, schedule, target + unit, window, reminder, links
├── commitments   title, why it matters, dates, status
├── goals         parent commitment, metric (milestones | counter), target date
├── challenges    duration, difficulty, rules, reward, requirements, links
├── projects      name, colour, sections
├── milestones    parentType + parentId (commitment | goal | challenge)
├── activities    { type: task|habit, refId, date, amount }   <- the only log
├── achievements  unlocked badge ids
└── settings
```

Every entity carries a `links` bag (`commitmentIds`, `goalIds`, `challengeIds`,
`milestoneIds`) pointing at the larger things it serves. A task may also carry
`links.habitId`, which makes completing it and checking the habit the same act.

## Modules

| Path | Responsibility |
| --- | --- |
| `src/domain/schema.js` | entity factories, normalisation, migration |
| `src/domain/recurrence.js` | task recurrence + habit schedules (shared weekday vocabulary) |
| `src/domain/engine.js` | all derivation: streaks, challenge days, roll-ups, daily summary, XP |
| `src/domain/achievements.js` | badge rules over derived numbers |
| `src/domain/nlp.js` | deterministic Quick Add parsing (no AI, no network) |
| `src/store/AppStore.js` | one reducer for every mutation + debounced persistence |
| `src/useTasks.js` | the original todo hook, now a view over the store |
| `src/navigation.js` | hand-rolled tabs + one-level stack, Android back wired |
| `src/theme.js` | the design system: colour, type ramp, radius, shadow, motion |
| `src/components/ui/*` | the UI kit every screen is assembled from |
| `src/components/*` | rows, cards, editors and pickers built on that kit |
| `src/screens/*` | Today, Tasks (+ Calendar), Habits, Journey, Insights, Settings, detail screens |

## Streaks that understand the schedule

- Fixed schedules (daily, weekdays, certain days, every N days) count **only
  scheduled days**, so a Tue/Thu habit is never broken by "missing" a Wednesday.
- Flexible schedules (X times per week/month) count **whole periods**, so a
  4×/week habit survives any single missed day.
- Today is never counted as a miss while it is still in progress.

## Storage and migration

- `@tasks_v1` — the original todo file. Read once, **never written to again**.
- `@tasks_v1_backup` — a verbatim copy taken before the first migration.
- `@productivity_os_v2` — the unified state.

Migration is additive: legacy tasks keep their ids, text, notes, subtasks,
priority, category and due dates; string recurrence (`'daily'`) is upgraded to
`{ type: 'daily' }`; already-completed tasks are backfilled into the activity log
so history charts are not empty on day one.

## The design system

One file, `src/theme.js`, decides how the product looks: an iOS type ramp, four
surface layers, translucent system fills, a radius scale, near-subliminal
shadows and one set of motion constants. Screens never invent a value.

`src/components/ui/` is the kit built on it, and every screen is assembled from
it, which is what stops tasks, habits and challenges drifting apart visually:

| Module | Responsibility |
| --- | --- |
| `platform.js` | safe-area insets, keyboard height, the glass material |
| `icons.js` | the drawn glyph set - no emoji anywhere in the chrome |
| `primitives.js` | surfaces, press feedback, grouped lists, skeletons, strike-through |
| `controls.js` | chips, segmented control, checkbox, switch, buttons |
| `progress.js` | rings, bars, day tracks, streaks - the app's main output |
| `nav.js` | the large title that scrolls away and the bar it collapses into |
| `inputs.js` | fields, search, the inline composer |
| `sheet.js` | bottom sheets (drag to dismiss) and action sheets |
| `feedback.js` | empty states, toasts, launch state |

Two rules hold it together. **Glass is only for chrome that floats over
content** - the tab bar, nav bars, the composer, sheet backdrops; content itself
is always opaque. And **lists are inset groups, not stacks of cards**: one
rounded surface per group, separators inset to the text.

## Dependencies

Still none added. The app runs on Expo 52 with AsyncStorage, gesture-handler,
reanimated and haptics. Navigation, icons, charts, heatmaps, progress rings,
sheets and the date/time pickers are all built from plain views and the
built-in `Animated` API.

Two optional packages are *detected* at runtime and used only if they are ever
installed - `expo-blur` for a real blur material, and
`react-native-safe-area-context` for exact insets. Without them the app falls
back to a tuned translucent tint and a device-metrics inset guess, so nothing
needs a native rebuild to keep working.

## Known limitation

Reminder times are stored on habits and tasks and shown in the UI, but no OS
notification is scheduled — that would need `expo-notifications`, a new
dependency and permission flow.
