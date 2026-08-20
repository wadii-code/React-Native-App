/**
 * The shared UI kit.
 *
 * Every screen is assembled from these, which is what keeps tasks, habits,
 * challenges and commitments feeling like one product instead of four apps
 * sharing a tab bar.
 *
 *   platform    safe areas and glass, both degrading gracefully
 *   icons       the drawn glyph set - no emoji in the chrome
 *   primitives  surfaces, presses, grouped lists, skeletons
 *   controls    chips, segments, checkboxes, switches, buttons
 *   progress    rings, bars, streaks - the app's main output
 *   nav         collapsing large titles and the bar they collapse into
 *   inputs      fields, search, the inline composer
 *   sheet       bottom sheets and action sheets
 *   feedback    empty states, toasts, launch state
 *
 * Every name the previous kit exported is still exported here with the same
 * props, so no screen had to change its imports to get the new look.
 */

export { default as Icon } from './icons';

export {
  Glass,
  Hairline,
  SafeAreaRoot,
  useSafeArea,
  hasNativeBlur,
  bottomInset,
} from './platform';

export {
  PressableScale,
  haptic,
  Card,
  ListGroup,
  ListRow,
  Divider,
  IconWell,
  Badge,
  Skeleton,
  StrikeText,
  FadeIn,
} from './primitives';

export {
  Chip,
  Segmented,
  Checkbox,
  Toggle,
  Button,
  RoundButton,
  StatTile,
  OptionRow,
  LinkRow,
  StepButton,
  AnimatedNumber,
} from './controls';

export {
  ProgressBar,
  StackedBar,
  ProgressRing,
  RingStack,
  StreakPill,
  CompletionBurst,
  DayDots,
} from './progress';

export {
  NavBar,
  LargeTitle,
  ScreenHeader,
  SectionTitle,
  useScrollY,
  useHeaderSpacer,
  NAV_BAR_HEIGHT,
} from './nav';

export { Field, TextField, SearchField, InlineComposer } from './inputs';

export { Sheet, SheetActions, ActionSheet } from './sheet';

export { EmptyBlock, Toast, LaunchState, AchievementToast } from './feedback';
