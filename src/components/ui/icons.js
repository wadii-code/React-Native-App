/**
 * The icon set, drawn from plain views.
 *
 * Emoji are the fastest way to make an interface look like a website. They
 * ignore the tint colour, sit on a different optical baseline to the text
 * around them, and render differently on every platform. Every glyph that is
 * part of the *chrome* - navigation, buttons, field affordances, metadata - is
 * drawn here instead, so it inherits colour, weight and size like real type.
 *
 * Emoji still appear where the user chose them (habit icons, project icons):
 * that is content, not chrome.
 *
 * No SVG dependency: each icon is composed from bordered and rotated views,
 * which stay crisp at any scale and cost one or two nodes.
 */
import React from 'react';
import { View } from 'react-native';

const S = (size, color, weight) => ({ size, color, w: weight });

/* ------------------------------------------------------------- primitives */

function Bar({ w, h, color, radius, style }) {
  return (
    <View
      style={[
        { width: w, height: h, borderRadius: radius == null ? Math.min(w, h) / 2 : radius, backgroundColor: color },
        style,
      ]}
    />
  );
}

function Ring({ size, color, weight }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: weight,
        borderColor: color,
      }}
    />
  );
}

/* ------------------------------------------------------------------ shapes */

function Chevron({ size, color, w, direction }) {
  const box = size * 0.42;
  const rotate = { right: '45deg', left: '-135deg', up: '-45deg', down: '135deg' }[direction];
  // Nudge the glyph so its optical centre matches the box centre.
  const shift = { right: -size * 0.06, left: size * 0.06, up: 0, down: 0 }[direction];
  const rise = { right: 0, left: 0, up: size * 0.06, down: -size * 0.06 }[direction];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: box,
          height: box,
          borderTopWidth: w,
          borderRightWidth: w,
          borderColor: color,
          borderTopRightRadius: w * 0.6,
          transform: [{ translateX: shift }, { translateY: rise }, { rotate }],
        }}
      />
    </View>
  );
}

function Plus({ size, color, w }) {
  const len = size * 0.72;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Bar w={len} h={w} color={color} style={{ position: 'absolute' }} />
      <Bar w={w} h={len} color={color} style={{ position: 'absolute' }} />
    </View>
  );
}

function Minus({ size, color, w }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Bar w={size * 0.72} h={w} color={color} />
    </View>
  );
}

function Close({ size, color, w }) {
  const len = size * 0.68;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Bar w={len} h={w} color={color} style={{ position: 'absolute', transform: [{ rotate: '45deg' }] }} />
      <Bar w={len} h={w} color={color} style={{ position: 'absolute', transform: [{ rotate: '-45deg' }] }} />
    </View>
  );
}

function Check({ size, color, w }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.56,
          height: size * 0.3,
          borderLeftWidth: w,
          borderBottomWidth: w,
          borderColor: color,
          borderBottomLeftRadius: w * 0.5,
          transform: [{ translateY: -size * 0.06 }, { rotate: '-45deg' }],
        }}
      />
    </View>
  );
}

function Search({ size, color, w }) {
  const d = size * 0.64;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ transform: [{ translateX: -size * 0.06 }, { translateY: -size * 0.06 }] }}>
        <Ring size={d} color={color} weight={w} />
      </View>
      <Bar
        w={size * 0.3}
        h={w}
        color={color}
        style={{
          position: 'absolute',
          right: size * 0.08,
          bottom: size * 0.2,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

/** Two tracks with knobs - the modern stand-in for a gear or a funnel. */
function Sliders({ size, color, w }) {
  const len = size * 0.8;
  const knob = w * 2.6;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ height: size * 0.5, justifyContent: 'space-between' }}>
        <View style={{ justifyContent: 'center' }}>
          <Bar w={len} h={w} color={color} />
          <View
            style={{
              position: 'absolute',
              left: len * 0.58,
              width: knob,
              height: knob,
              borderRadius: knob / 2,
              borderWidth: w,
              borderColor: color,
              backgroundColor: 'transparent',
              top: -(knob - w) / 2,
            }}
          />
        </View>
        <View style={{ justifyContent: 'center' }}>
          <Bar w={len} h={w} color={color} />
          <View
            style={{
              position: 'absolute',
              left: len * 0.16,
              width: knob,
              height: knob,
              borderRadius: knob / 2,
              borderWidth: w,
              borderColor: color,
              top: -(knob - w) / 2,
            }}
          />
        </View>
      </View>
    </View>
  );
}

function Calendar({ size, color, w }) {
  const boxW = size * 0.78;
  const boxH = size * 0.72;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: boxW,
          height: boxH,
          borderWidth: w,
          borderColor: color,
          borderRadius: size * 0.16,
          marginTop: size * 0.08,
          overflow: 'hidden',
        }}
      >
        <View style={{ height: boxH * 0.26, backgroundColor: color, opacity: 0.9 }} />
      </View>
      <Bar w={w} h={size * 0.16} color={color} style={{ position: 'absolute', left: size * 0.26, top: 0 }} />
      <Bar w={w} h={size * 0.16} color={color} style={{ position: 'absolute', right: size * 0.26, top: 0 }} />
    </View>
  );
}

function Clock({ size, color, w }) {
  const d = size * 0.82;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Ring size={d} color={color} weight={w} />
      {/* Each hand points up from the centre, then the whole hand is rotated
       * about that centre - which is what gives a real clock face. */}
      <View style={{ position: 'absolute', width: d, height: d, transform: [{ rotate: '55deg' }] }}>
        <Bar
          w={w}
          h={d * 0.3}
          color={color}
          style={{ position: 'absolute', left: d / 2 - w / 2, top: d / 2 - d * 0.3 }}
        />
      </View>
      <View style={{ position: 'absolute', width: d, height: d, transform: [{ rotate: '-20deg' }] }}>
        <Bar
          w={w}
          h={d * 0.22}
          color={color}
          style={{ position: 'absolute', left: d / 2 - w / 2, top: d / 2 - d * 0.22 }}
        />
      </View>
    </View>
  );
}

/** A teardrop: a square with three round corners, tipped onto its point. */
function Flame({ size, color }) {
  const d = size * 0.66;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: d,
          height: d,
          backgroundColor: color,
          borderTopLeftRadius: d / 2,
          borderTopRightRadius: d / 2,
          borderBottomLeftRadius: d / 2,
          borderBottomRightRadius: 1.5,
          transform: [{ rotate: '-45deg' }],
        }}
      />
    </View>
  );
}

function Target({ size, color, w }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Ring size={size * 0.86} color={color} weight={w} />
      <View style={{ position: 'absolute' }}>
        <Ring size={size * 0.46} color={color} weight={w} />
      </View>
      <View
        style={{
          position: 'absolute',
          width: size * 0.16,
          height: size * 0.16,
          borderRadius: size * 0.08,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** A four-point sparkle - two diamonds, one small and offset. */
function Sparkle({ size, color }) {
  const big = size * 0.5;
  const small = size * 0.24;
  const diamond = (d) => ({
    width: d,
    height: d,
    backgroundColor: color,
    borderRadius: d * 0.22,
    transform: [{ rotate: '45deg' }],
  });
  return (
    <View style={{ width: size, height: size }}>
      <View style={[diamond(big), { position: 'absolute', left: size * 0.06, top: size * 0.2 }]} />
      <View style={[diamond(small), { position: 'absolute', right: size * 0.04, top: size * 0.04 }]} />
    </View>
  );
}

function Grid({ size, color }) {
  const cell = size * 0.26;
  const gap = size * 0.09;
  const opacities = [1, 0.5, 0.85, 0.45, 1, 0.6, 0.9, 0.55, 1];
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {opacities.map((o, i) => (
        <View
          key={i}
          style={{
            width: cell,
            height: cell,
            borderRadius: cell * 0.32,
            backgroundColor: color,
            opacity: o,
          }}
        />
      ))}
    </View>
  );
}

function Chart({ size, color }) {
  const bars = [0.42, 0.9, 0.64];
  return (
    <View
      style={{
        width: size,
        height: size,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}
    >
      {bars.map((h, i) => (
        <View
          key={i}
          style={{
            width: size * 0.22,
            height: size * h,
            borderRadius: size * 0.1,
            backgroundColor: color,
            opacity: i === 1 ? 1 : 0.75,
          }}
        />
      ))}
    </View>
  );
}

function List({ size, color, w }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', gap: size * 0.2 }}>
      {[1, 0.78, 0.92].map((f, i) => (
        <Bar key={i} w={size * f} h={w} color={color} />
      ))}
    </View>
  );
}

/** A ring with a dot at its heart - "the day you are standing in". */
function Today({ size, color, w, filled }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Ring size={size * 0.92} color={color} weight={w} />
      <View
        style={{
          position: 'absolute',
          width: size * (filled ? 0.36 : 0.26),
          height: size * (filled ? 0.36 : 0.26),
          borderRadius: size,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** A summit: the journey tab. */
function Summit({ size, color, filled }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.46,
          borderRightWidth: size * 0.46,
          borderBottomWidth: size * 0.78,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
          opacity: filled ? 1 : 0.9,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.11,
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.17,
          borderRightWidth: size * 0.17,
          borderBottomWidth: size * 0.28,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: 'rgba(255,255,255,0.55)',
        }}
      />
    </View>
  );
}

function Trash({ size, color, w }) {
  const bodyW = size * 0.6;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Bar w={size * 0.8} h={w} color={color} style={{ position: 'absolute', top: size * 0.2 }} />
      <Bar w={size * 0.3} h={w} color={color} style={{ position: 'absolute', top: size * 0.09 }} />
      <View
        style={{
          position: 'absolute',
          top: size * 0.28,
          width: bodyW,
          height: size * 0.52,
          borderWidth: w,
          borderTopWidth: 0,
          borderColor: color,
          borderBottomLeftRadius: size * 0.14,
          borderBottomRightRadius: size * 0.14,
        }}
      />
    </View>
  );
}

function Ellipsis({ size, color }) {
  const d = size * 0.19;
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: color }} />
      ))}
    </View>
  );
}

/** A crescent, cut by a disc painted in the surface colour behind it. */
function Moon({ size, color, mask }) {
  const d = size * 0.84;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: color, overflow: 'hidden' }}>
        <View
          style={{
            position: 'absolute',
            width: d,
            height: d,
            borderRadius: d / 2,
            backgroundColor: mask,
            left: d * 0.28,
            top: -d * 0.2,
          }}
        />
      </View>
    </View>
  );
}

function Sun({ size, color, w }) {
  const core = size * 0.44;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: core, height: core, borderRadius: core / 2, backgroundColor: color }} />
      {[0, 45, 90, 135].map((deg) => (
        <View
          key={deg}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            transform: [{ rotate: `${deg}deg` }],
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Bar w={w} h={size * 0.15} color={color} />
          <Bar w={w} h={size * 0.15} color={color} />
        </View>
      ))}
    </View>
  );
}

/** A circular arrow: recurrence, repeat, restore. */
function Repeat({ size, color, w }) {
  const d = size * 0.78;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: d,
          height: d,
          borderRadius: d / 2,
          borderWidth: w,
          borderColor: color,
          borderTopColor: 'transparent',
          transform: [{ rotate: '-35deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.13,
          top: size * 0.06,
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.15,
          borderRightWidth: size * 0.15,
          borderBottomWidth: size * 0.2,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
          transform: [{ rotate: '95deg' }],
        }}
      />
    </View>
  );
}

function Folder({ size, color, w }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.84,
          height: size * 0.62,
          borderWidth: w,
          borderColor: color,
          borderRadius: size * 0.14,
          marginTop: size * 0.08,
        }}
      />
      <Bar
        w={size * 0.38}
        h={w}
        color={color}
        style={{ position: 'absolute', left: size * 0.08, top: size * 0.19 }}
      />
    </View>
  );
}

function Bell({ size, color, w }) {
  const bw = size * 0.62;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: bw,
          height: size * 0.54,
          borderWidth: w,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: bw / 2,
          borderTopRightRadius: bw / 2,
          marginTop: -size * 0.06,
        }}
      />
      <Bar w={size * 0.84} h={w} color={color} style={{ position: 'absolute', top: size * 0.66 }} />
      <View
        style={{
          position: 'absolute',
          top: size * 0.76,
          width: size * 0.22,
          height: size * 0.11,
          borderBottomLeftRadius: size * 0.12,
          borderBottomRightRadius: size * 0.12,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function Arrow({ size, color, w, direction }) {
  const up = direction !== 'down';
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Bar w={w} h={size * 0.66} color={color} />
      <View
        style={{
          position: 'absolute',
          top: up ? size * 0.14 : undefined,
          bottom: up ? undefined : size * 0.14,
          width: size * 0.42,
          height: size * 0.42,
          borderTopWidth: w,
          borderLeftWidth: w,
          borderColor: color,
          borderTopLeftRadius: w * 0.6,
          transform: [{ rotate: up ? '45deg' : '-135deg' }],
        }}
      />
    </View>
  );
}

function Dot({ size, color }) {
  return <View style={{ width: size * 0.4, height: size * 0.4, borderRadius: size, backgroundColor: color }} />;
}

function Inbox({ size, color, w }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.84,
          height: size * 0.7,
          borderWidth: w,
          borderColor: color,
          borderRadius: size * 0.16,
          justifyContent: 'flex-end',
          paddingBottom: size * 0.16,
          alignItems: 'center',
        }}
      >
        <Bar w={size * 0.4} h={w} color={color} />
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------- api */

const GLYPHS = {
  chevronRight: (p) => <Chevron {...p} direction="right" />,
  chevronLeft: (p) => <Chevron {...p} direction="left" />,
  chevronUp: (p) => <Chevron {...p} direction="up" />,
  chevronDown: (p) => <Chevron {...p} direction="down" />,
  plus: Plus,
  minus: Minus,
  close: Close,
  check: Check,
  search: Search,
  sliders: Sliders,
  calendar: Calendar,
  clock: Clock,
  flame: Flame,
  target: Target,
  sparkle: Sparkle,
  grid: Grid,
  chart: Chart,
  list: List,
  today: Today,
  summit: Summit,
  trash: Trash,
  ellipsis: Ellipsis,
  moon: Moon,
  sun: Sun,
  repeat: Repeat,
  folder: Folder,
  bell: Bell,
  inbox: Inbox,
  dot: Dot,
  arrowUp: (p) => <Arrow {...p} direction="up" />,
  arrowDown: (p) => <Arrow {...p} direction="down" />,
};

/**
 * `<Icon name="chevronRight" size={16} color={...} />`
 *
 * `weight` is the stroke width and defaults to a size-relative value that keeps
 * small icons legible and large icons from looking heavy.
 */
export default function Icon({ name, size = 18, color = '#000', weight, filled, mask, style }) {
  const Glyph = GLYPHS[name];
  if (!Glyph) return null;
  const w = weight || Math.max(1.4, Math.round(size * 0.115 * 10) / 10);
  const node = <Glyph size={size} color={color} w={w} weight={w} filled={filled} mask={mask} />;
  if (!style) return node;
  return <View style={style}>{node}</View>;
}

export { S };
