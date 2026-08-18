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
| `src/screens/*` | Today, Tasks (+ Calendar), Habits, Journey, Stats, Settings, detail screens |

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

## Dependencies

None added. The app still runs on Expo 52 with AsyncStorage, gesture-handler,
reanimated and haptics. Navigation, charts, heatmaps, the progress ring and the
date/time pickers are all built from plain views.

## Known limitation

Reminder times are stored on habits and tasks and shown in the UI, but no OS
notification is scheduled — that would need `expo-notifications`, a new
dependency and permission flow.
