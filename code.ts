/// <reference types="@figma/plugin-typings" />

/* ────────────────────────────────────────────────────────────────
   Raised-Intersection  •  headless plugin
   Works on Vectors *and* Lines, regardless of nesting
   © 2025 – feel free to MIT this!
──────────────────────────────────────────────────────────────── */

function run(): void {
  /* ═════ helpers ══════════════════════════════════════════════ */

  /** Convert Paint → “#rrggbb” */
  const paintToHex = (paint: SolidPaint) => {
    const { r, g, b } = paint.color;
    return (
      "#" +
      [r, g, b]
        .map(v => Math.round(v * 255).toString(16).padStart(2, "0"))
        .join("")
    );
  };

  /** Convert “#rrggbb” → RGB 0-1 */
  const hexToRgb = (hex: string): RGB => {
    const n = parseInt(hex.replace(/^#/, ""), 16);
    return {
      r: ((n >> 16) & 0xff) / 255,
      g: ((n >> 8) & 0xff) / 255,
      b: (n & 0xff) / 255
    };
  };

    /* ── matrix utils ─────────────────────────────── */
  type Mat = Transform;          // 2×3 matrix alias

  const apply = (m: Mat, p: Vector): Vector => ({
    x: m[0][0] * p.x + m[0][1] * p.y + m[0][2],
    y: m[1][0] * p.x + m[1][1] * p.y + m[1][2],
  });

  /** Local-geometry pt → page pt (honours vectorTransform) */
  const toAbsolute = (node: SceneNode, p: Vector): Vector => {
    const vt = (node as unknown as { vectorTransform?: Mat }).vectorTransform
      ?? [[1, 0, 0], [0, 1, 0]];            // identity if undefined
    return apply(node.absoluteTransform, apply(vt, p));
  };

  // /** Local pt → absolute (page) pt */
  // const toAbsolute = (node: SceneNode, pt: Vector): Vector => {
  //   const m = node.absoluteTransform;
  //   return {
  //     x: m[0][0] * pt.x + m[0][1] * pt.y + m[0][2],
  //     y: m[1][0] * pt.x + m[1][1] * pt.y + m[1][2]
  //   };
  // };

  /** Magnitude + unit direction */
  const dirLen = (p1: Vector, p2: Vector) => {
    const dx = p2.x - p1.x,
      dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    return { dir: { x: dx / len, y: dy / len }, len };
  };

  /** Intersection of two infinite lines p+tv and q+sw */
  const intersect = (p: Vector, v: Vector, q: Vector, w: Vector) => {
    const denom = v.x * w.y - v.y * w.x;
    if (Math.abs(denom) < 1e-4) return null; // parallel
    const t = ((q.x - p.x) * w.y - (q.y - p.y) * w.x) / denom;
    return { x: p.x + t * v.x, y: p.y + t * v.y };
  };

  /** Build an upward-bulging semicircle using 2 cubic Béziers */
  const makeArc = (
    center: Vector,
    radius: number,
    stroke: SolidPaint,
    weight: number,
    rotationDeg: number
  ) => {
    const k = 0.5522847498; // circle constant (4*(√2-1)/3)

    const d = [
      `M ${-radius} 0`,
      `C ${-radius} ${-k * radius} ${-k * radius} ${-radius} 0 ${-radius}`,
      `C ${k * radius} ${-radius} ${radius} ${-k * radius} ${radius} 0`
    ].join(" ");

    const v = figma.createVector();
    v.vectorPaths = [{ windingRule: "NONZERO", data: d }];
    v.strokes = [stroke];
    v.strokeCap = "ROUND";
    v.strokeWeight = weight;
    // Node’s own geometry spans from –r…+r horizontally and –r…0 vertically,
    // so its top-left corner is (center.x − r, center.y − r).
    v.x = center.x - radius;
    v.y = center.y - radius;
    v.rotation = rotationDeg;

    return v;
  };

  const isHorizontal = (v: Vector) => Math.abs(v.x) >= Math.abs(v.y);

  /** Recursively collect single-segment vectors/lines inside any selection */
  function collectLines(nodes: readonly SceneNode[]): (VectorNode | LineNode)[] {
    const found: (VectorNode | LineNode)[] = [];
    for (const n of nodes) {
      if (n.type === "VECTOR") {
        if (n.vectorNetwork.segments.length === 1) found.push(n);
      } else if (n.type === "LINE") {
        found.push(n);
      } else if ("children" in n) {
        found.push(...collectLines(n.children));
      }
    }
    return found;
  }

  /* ═════ main flow ═════════════════════════════════════════════ */

  const lines = collectLines(figma.currentPage.selection);

  if (lines.length !== 2) {
    figma.notify("Select exactly two straight vector strokes 🙏");
    figma.closePlugin();
    return;
  }

  /* Extract absolute endpoints for each line / vector */
  const endpoints: [Vector, Vector][] = lines.map(line => {
    if (line.type === "VECTOR") {
      const v = line.vectorNetwork.vertices;
      return [
        toAbsolute(line, { x: v[0].x, y: v[0].y }),
        toAbsolute(line, { x: v[1].x, y: v[1].y })
      ];
    } else { // LINE node
      // Geometry for a Line is the segment (0,0) → (1,0) in local space.
      return [
        toAbsolute(line, { x: 0, y: 0 }),
        toAbsolute(line, { x: 1, y: 0 })
      ];
    }
  });

  const [p1, p2] = endpoints[0];
  const [q1, q2] = endpoints[1];

  const { dir: vDir } = dirLen(p1, p2);
  const { dir: wDir } = dirLen(q1, q2);

  const ip = intersect(p1, vDir, q1, wDir);
  if (!ip) {
    figma.notify("Those two lines don’t intersect 🤷‍♂️");
    figma.closePlugin();
    return;
  }

  /* Decide which stroke “jumps” */
  const jumper = isHorizontal(vDir) ? lines[0] : lines[1];
  const jumperStroke =
    (jumper.strokes?.[0] as SolidPaint) ??
    ({
      type: "SOLID",
      color: { r: 1, g: 0, b: 0 }
    } as SolidPaint);
  const weight =
    typeof jumper.strokeWeight === "number" ? jumper.strokeWeight : 2;
  const radius = weight * 2;

  const jumperDir = isHorizontal(vDir) ? vDir : wDir;
  const rotation = (Math.atan2(jumperDir.y, jumperDir.x) * 180) / Math.PI;

  const arc = makeArc(ip, radius, jumperStroke, weight, rotation);

  figma.currentPage.appendChild(arc);
  figma.notify("✨ Jump-over added!");
  figma.closePlugin();
}

run(); // boot it