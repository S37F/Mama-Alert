const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "MamaAlert";
pres.title = "MamaAlert - GNEC Hackathon 2026";

const C = {
  terra:    "C4522A",
  terraLt:  "E8835A",
  terraPale:"FAF0EA",
  terraDk:  "8B3318",
  charcoal: "2C2416",
  charcoalLt:"3E3020",
  cream:    "FDFAF6",
  sand:     "F0E6D3",
  sandDk:   "DDD0BC",
  warmGray: "6B5B4E",
  muted:    "A89080",
  mutedDk:  "7A6A60",
  forest:   "2D6A4F",
  forestLt: "4A9070",
  alert:    "DC2626",
  sky:      "1E6FA8",
  purple:   "6B4FA8",
  gold:     "B8860B",
  white:    "FFFFFF",
  offBlack: "1A1008",
};

const makeShadow = () => ({
  type: "outer", blur: 10, offset: 3,
  angle: 135, color: "000000", opacity: 0.08
});

// ------------------------------------------
// SLIDE 1 - TITLE
// ------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: C.charcoal };

  // Left terracotta accent bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.16, h: 5.625,
    fill: { color: C.terra }, line: { color: C.terra }
  });

  // SDG badge - top right
  s.addShape(pres.shapes.RECTANGLE, {
    x: 7.9, y: 0.32, w: 1.78, h: 0.35,
    fill: { color: C.terra }, line: { color: C.terra }
  });
  s.addText("SDG 3 - HEALTH & WELL-BEING", {
    x: 7.9, y: 0.32, w: 1.78, h: 0.35,
    fontSize: 6.5, bold: true, color: C.white,
    align: "center", valign: "middle", charSpacing: 1.2, margin: 0
  });

  // Dot logo mark
  s.addShape(pres.shapes.OVAL, {
    x: 0.42, y: 1.2, w: 0.18, h: 0.18,
    fill: { color: C.terra }, line: { color: C.terra }
  });

  // App name
  s.addText([
    { text: "Mama", options: { color: C.cream, bold: false } },
    { text: "Alert", options: { color: C.terra, bold: true } }
  ], {
    x: 0.38, y: 1.45, w: 5.5, h: 1.15,
    fontSize: 62, fontFace: "Georgia", margin: 0
  });

  // Tagline
  s.addText("One tap. One community. One life saved.", {
    x: 0.38, y: 2.72, w: 6, h: 0.42,
    fontSize: 16, fontFace: "Calibri", color: C.muted,
    italic: true, margin: 0
  });

  // Divider
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.38, y: 3.28, w: 4.2, h: 0.022,
    fill: { color: "3E3020" }, line: { color: "3E3020" }
  });

  // Event + name
  s.addText("GNEC Hackathon 2026", {
    x: 0.38, y: 3.48, w: 5, h: 0.28,
    fontSize: 10, color: C.mutedDk, charSpacing: 2.5, margin: 0
  });
  s.addText("Fahim Badgujar", {
    x: 0.38, y: 3.82, w: 5, h: 0.42,
    fontSize: 17, color: C.cream, bold: true, margin: 0
  });

  // Right stat card
  s.addShape(pres.shapes.RECTANGLE, {
    x: 6.85, y: 0.95, w: 2.8, h: 3.75,
    fill: { color: C.offBlack }, line: { color: "2A1E12" }
  });
  // Terra top accent on card
  s.addShape(pres.shapes.RECTANGLE, {
    x: 6.85, y: 0.95, w: 2.8, h: 0.055,
    fill: { color: C.terra }, line: { color: C.terra }
  });
  s.addText("260,000", {
    x: 6.85, y: 1.2, w: 2.8, h: 1.05,
    fontSize: 46, fontFace: "Georgia", color: C.terra,
    bold: true, align: "center", margin: 0
  });
  s.addText("women die in\nchildbirth every year", {
    x: 6.85, y: 2.32, w: 2.8, h: 0.72,
    fontSize: 12.5, color: C.muted, align: "center",
    lineSpacingMultiple: 1.4, margin: 0
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 7.35, y: 3.2, w: 1.8, h: 0.022,
    fill: { color: "3E3020" }, line: { color: "3E3020" }
  });
  s.addText("WHO Global Health Estimates 2023", {
    x: 6.85, y: 3.35, w: 2.8, h: 0.32,
    fontSize: 8, color: "3E3020", align: "center",
    italic: true, margin: 0
  });
}

// ------------------------------------------
// SLIDE 2 - THE CRISIS (REDESIGNED - no giant "1")
// ------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: C.charcoal };

  // Left accent bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.16, h: 5.625,
    fill: { color: C.terra }, line: { color: C.terra }
  });

  // Label
  s.addText("THE CRISIS", {
    x: 0.5, y: 0.42, w: 9, h: 0.28,
    fontSize: 9, color: C.terra, bold: true,
    charSpacing: 5, margin: 0
  });

  // Main headline - left aligned
  s.addText("Every 2 minutes,\na mother dies.", {
    x: 0.5, y: 0.8, w: 5.8, h: 1.75,
    fontSize: 52, fontFace: "Georgia", color: C.cream,
    lineSpacingMultiple: 1.08, margin: 0
  });

  // Sub
  s.addText("Not because medicine doesn't exist.\nBecause help never reached her in time.", {
    x: 0.5, y: 2.72, w: 5.5, h: 0.85,
    fontSize: 16, color: C.muted, italic: true,
    lineSpacingMultiple: 1.55, margin: 0
  });

  // Three stat boxes - right column
  const stats = [
    { val: "260,000", label: "deaths per year", src: "WHO 2023" },
    { val: "42-52%", label: "occur at home or in transit", src: "India State Studies" },
    { val: "4.1x", label: "higher risk for rural mothers", src: "Lancet 2022" },
  ];
  stats.forEach((st, i) => {
    const y = 0.55 + i * 1.65;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 6.6, y, w: 3.1, h: 1.45,
      fill: { color: C.offBlack }, line: { color: "2A1E12" }
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 6.6, y, w: 0.06, h: 1.45,
      fill: { color: C.terra }, line: { color: C.terra }
    });
    s.addText(st.val, {
      x: 6.72, y: y + 0.1, w: 2.9, h: 0.72,
      fontSize: 36, fontFace: "Georgia", color: C.terra,
      bold: true, margin: 0
    });
    s.addText(st.label, {
      x: 6.72, y: y + 0.82, w: 2.9, h: 0.32,
      fontSize: 11, color: C.muted, margin: 0
    });
    s.addText(st.src, {
      x: 6.72, y: y + 1.2, w: 2.9, h: 0.2,
      fontSize: 7.5, color: "3E3020", italic: true, margin: 0
    });
  });

  // Bottom line
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.38, y: 5.22, w: 9.3, h: 0.22,
    fill: { color: "1A1008" }, line: { color: "1A1008" }
  });
  s.addText("These are not statistics. These are the documented patterns behind 260,000 deaths a year. Every one of them preventable.", {
    x: 0.38, y: 5.22, w: 9.3, h: 0.22,
    fontSize: 9, color: "3E3020", align: "center", valign: "middle", italic: true, margin: 0
  });
}

// ------------------------------------------
// SLIDE 3 - THREE DELAYS
// ------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: C.cream };

  s.addText("WHY MOTHERS DIE", {
    x: 0.5, y: 0.3, w: 9, h: 0.28,
    fontSize: 9, color: C.terra, bold: true, charSpacing: 4, margin: 0
  });
  s.addText("It's not one thing. It's three.", {
    x: 0.5, y: 0.6, w: 9, h: 0.62,
    fontSize: 32, fontFace: "Georgia", color: C.charcoal, margin: 0
  });

  const delays = [
    {
      n: "01", sub: "DELAY 1", title: "The Decision", time: "2-6 hours lost",
      body: "Danger signs go unrecognised. Fear, cultural norms, and uncertainty consume the minutes she doesn't have.",
    },
    {
      n: "02", sub: "DELAY 2", title: "The Journey", time: "1.5-3 hours lost",
      body: "No vehicle. No road. No one awake. 42-52% of maternal deaths happen before a woman ever reaches a hospital.",
    },
    {
      n: "03", sub: "DELAY 3", title: "The Wait", time: "45 min-2 hours lost",
      body: "She arrives. But the facility wasn't ready. No blood prepared. No room cleared. Minutes become fatal.",
    },
  ];

  delays.forEach((d, i) => {
    const x = 0.38 + i * 3.12;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.45, w: 2.98, h: 3.82,
      fill: { color: C.white }, line: { color: C.sandDk, pt: 1 },
      shadow: makeShadow()
    });
    // Top accent
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.45, w: 2.98, h: 0.055,
      fill: { color: C.terra }, line: { color: C.terra }
    });
    // Number watermark
    s.addText(d.n, {
      x: x + 0.18, y: 1.6, w: 1.1, h: 0.62,
      fontSize: 30, fontFace: "Georgia", color: C.sandDk,
      bold: true, margin: 0
    });
    // Sub label
    s.addText(d.sub, {
      x: x + 0.18, y: 2.28, w: 2.62, h: 0.26,
      fontSize: 8, color: C.terra, bold: true, charSpacing: 3, margin: 0
    });
    // Title
    s.addText(d.title, {
      x: x + 0.18, y: 2.55, w: 2.62, h: 0.48,
      fontSize: 19, fontFace: "Georgia", color: C.charcoal, bold: true, margin: 0
    });
    // Divider
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.18, y: 3.06, w: 2.62, h: 0.018,
      fill: { color: C.sand }, line: { color: C.sand }
    });
    // Body
    s.addText(d.body, {
      x: x + 0.18, y: 3.12, w: 2.62, h: 1.42,
      fontSize: 11.5, color: C.warmGray, lineSpacingMultiple: 1.45, margin: 0
    });
    // Time badge
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.18, y: 4.72, w: 2.62, h: 0.35,
      fill: { color: C.terraPale }, line: { color: C.terra, pt: 1 }
    });
    s.addText(d.time, {
      x: x + 0.18, y: 4.72, w: 2.62, h: 0.35,
      fontSize: 10.5, color: C.terra, bold: true,
      align: "center", valign: "middle", margin: 0
    });
  });

  // Bottom callout
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.3, w: 10, h: 0.325,
    fill: { color: C.charcoal }, line: { color: C.charcoal }
  });
  s.addText("MamaAlert collapses all three delays - simultaneously - in under 60 seconds.", {
    x: 0, y: 5.3, w: 10, h: 0.325,
    fontSize: 11, color: C.cream, bold: true, align: "center", valign: "middle", margin: 0
  });
}

// ------------------------------------------
// SLIDE 4 - INTRODUCING MAMAALERT (IMPROVED PILLS)
// ------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: C.terra };

  s.addText("INTRODUCING", {
    x: 0.9, y: 0.82, w: 8.2, h: 0.35,
    fontSize: 10, color: "9B3D1C", bold: true,
    charSpacing: 6, align: "center", margin: 0
  });
  s.addText([
    { text: "Mama", options: { color: C.white, bold: false } },
    { text: "Alert", options: { color: C.offBlack, bold: true } }
  ], {
    x: 0.9, y: 1.2, w: 8.2, h: 1.35,
    fontSize: 74, fontFace: "Georgia", align: "center", margin: 0
  });

  // Divider
  s.addShape(pres.shapes.RECTANGLE, {
    x: 3.5, y: 2.72, w: 3.0, h: 0.022,
    fill: { color: "9B3D1C" }, line: { color: "9B3D1C" }
  });

  s.addText("A community-powered maternal emergency alert system.\nOne tap activates every trained volunteer within 5km.\nThe nearest clinic prepares before she arrives.\nHer family knows she is safe.", {
    x: 1.4, y: 2.88, w: 7.2, h: 1.55,
    fontSize: 15, color: C.white, align: "center",
    lineSpacingMultiple: 1.65, margin: 0
  });

  // Pills - white fill for visibility against terra bg
  const pills = ["Works offline", "No smartphone required", "Free forever"];
  pills.forEach((p, i) => {
    const x = 1.48 + i * 2.6;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 4.75, w: 2.32, h: 0.52,
      fill: { color: C.offBlack }, line: { color: C.offBlack }
    });
    s.addText(p, {
      x, y: 4.75, w: 2.32, h: 0.52,
      fontSize: 12, color: C.white, bold: true,
      align: "center", valign: "middle", margin: 0
    });
  });
}

// ------------------------------------------
// SLIDE 5 - PRIYA
// ------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: C.cream };

  // Tag
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 0.28, w: 2.2, h: 0.3,
    fill: { color: C.alert }, line: { color: C.alert }
  });
  s.addText("REAL SCENARIO - 01", {
    x: 0.5, y: 0.28, w: 2.2, h: 0.3,
    fontSize: 8, color: C.white, bold: true,
    align: "center", valign: "middle", charSpacing: 1.2, margin: 0
  });

  s.addText("Priya, 24", {
    x: 0.5, y: 0.68, w: 5.5, h: 0.65,
    fontSize: 38, fontFace: "Georgia", color: C.charcoal, bold: true, margin: 0
  });
  s.addText("38 weeks  -  Maharashtra, India  -  2:41 AM", {
    x: 0.5, y: 1.35, w: 5.5, h: 0.3,
    fontSize: 11.5, color: C.warmGray, italic: true, margin: 0
  });

  // Situation card
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.78, w: 4.5, h: 1.72,
    fill: { color: C.white }, line: { color: C.sandDk, pt: 1 },
    shadow: makeShadow()
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.78, w: 0.055, h: 1.72,
    fill: { color: C.alert }, line: { color: C.alert }
  });
  s.addText("THE SITUATION", {
    x: 0.68, y: 1.9, w: 4.12, h: 0.26,
    fontSize: 8, color: C.muted, bold: true, charSpacing: 3, margin: 0
  });
  s.addText("Severe bleeding. Husband 200km away.\nElderly mother-in-law. No vehicle. No phone credit.\nShe is alone.", {
    x: 0.68, y: 2.2, w: 4.12, h: 1.12,
    fontSize: 13, color: C.charcoal, lineSpacingMultiple: 1.5, margin: 0
  });

  // Timeline
  const steps = [
    { t: "T + 0:00", c: C.alert,    label: "Priya taps SOS on PWA bookmark" },
    { t: "T + 0:05", c: C.terra,    label: "SMS fires to 4 volunteers within 5km" },
    { t: "T + 0:43", c: C.forest,   label: "Ravi (1.2km) replies YES" },
    { t: "T + 0:43", c: C.forest,   label: "PHC Wai pre-alerted - blood B+ ready" },
    { t: "T + 0:43", c: C.forest,   label: "Husband Rahul gets family status SMS" },
    { t: "T + 22min",c: C.charcoal, label: "Priya arrives. Staff prepared. She survives." },
  ];

  steps.forEach((st, i) => {
    const y = 1.5 + i * 0.62;
    s.addShape(pres.shapes.OVAL, {
      x: 5.32, y: y + 0.06, w: 0.19, h: 0.19,
      fill: { color: st.c }, line: { color: st.c }
    });
    if (i < steps.length - 1) {
      s.addShape(pres.shapes.RECTANGLE, {
        x: 5.41, y: y + 0.25, w: 0.014, h: 0.44,
        fill: { color: C.sandDk }, line: { color: C.sandDk }
      });
    }
    s.addText(st.t, {
      x: 5.64, y: y + 0.02, w: 1.15, h: 0.26,
      fontSize: 8.5, color: C.muted, margin: 0
    });
    s.addText(st.label, {
      x: 6.88, y: y + 0.02, w: 2.88, h: 0.26,
      fontSize: 10.5,
      color: i === steps.length - 1 ? C.forest : C.charcoal,
      bold: i === steps.length - 1, margin: 0
    });
  });

  // Bottom comparison bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.22, w: 10, h: 0.405,
    fill: { color: C.sand }, line: { color: C.sandDk, pt: 1 }
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 4.98, y: 5.32, w: 0.022, h: 0.2,
    fill: { color: C.sandDk }, line: { color: C.sandDk }
  });
  s.addText([
    { text: "Without MamaAlert: ", options: { bold: true, color: C.alert } },
    { text: "reached clinic at 5:15 AM - Fatal delay 2h 34min", options: { color: C.warmGray } }
  ], {
    x: 0.38, y: 5.28, w: 4.5, h: 0.26,
    fontSize: 10, margin: 0
  });
  s.addText([
    { text: "With MamaAlert: ", options: { bold: true, color: C.forest } },
    { text: "response in 22 minutes", options: { color: C.warmGray } }
  ], {
    x: 5.18, y: 5.28, w: 4.5, h: 0.26,
    fontSize: 10, margin: 0
  });
}

// ------------------------------------------
// SLIDE 6 - AMARA + FATIMA
// ------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: C.cream };

  s.addText("TWO MORE WOMEN. TWO MORE EDGES COVERED.", {
    x: 0.5, y: 0.26, w: 9, h: 0.28,
    fontSize: 9, color: C.terra, bold: true, charSpacing: 3, margin: 0
  });

  const cards = [
    {
      x: 0.38, name: "Amara, 19", loc: "Adansi, Ghana - 11:17 AM",
      tag: "REAL SCENARIO - 02", tagC: C.terra,
      situation: "40 weeks. Alone. Basic Nokia phone. No internet. No smartphone. Active labour.",
      triggerLabel: "HOW SHE TRIGGERED IT", trigger: "Dialled *456#\nUSSD - zero internet needed",
      result: "Sister Agnes + Kofi mobilised.\nResponse: 38 minutes.",
      resultBg: C.terraPale,
    },
    {
      x: 5.12, name: "Fatima, 31", loc: "Maiduguri, Nigeria - 4:56 PM",
      tag: "REAL SCENARIO - 03", tagC: C.forest,
      situation: "Pre-eclampsia. Blurred vision. Cannot speak. Alone with two children.",
      triggerLabel: "HOW SHE TRIGGERED IT", trigger: "One tap. Could do no more.\nSystem detected incapacitation.",
      result: "Auto-escalated to Priority 2.\nNurse Blessing arrived in 7 minutes.",
      resultBg: "EAF4EE",
    }
  ];

  cards.forEach((c) => {
    // Card shadow + border
    s.addShape(pres.shapes.RECTANGLE, {
      x: c.x, y: 0.68, w: 4.52, h: 4.72,
      fill: { color: C.white }, line: { color: C.sandDk, pt: 1 },
      shadow: makeShadow()
    });
    // Top accent
    s.addShape(pres.shapes.RECTANGLE, {
      x: c.x, y: 0.68, w: 4.52, h: 0.055,
      fill: { color: c.tagC }, line: { color: c.tagC }
    });
    // Tag pill
    s.addShape(pres.shapes.RECTANGLE, {
      x: c.x + 0.22, y: 0.88, w: 2.15, h: 0.28,
      fill: { color: c.tagC }, line: { color: c.tagC }
    });
    s.addText(c.tag, {
      x: c.x + 0.22, y: 0.88, w: 2.15, h: 0.28,
      fontSize: 7.5, color: C.white, bold: true,
      align: "center", valign: "middle", charSpacing: 0.8, margin: 0
    });
    // Name
    s.addText(c.name, {
      x: c.x + 0.22, y: 1.24, w: 4.1, h: 0.55,
      fontSize: 26, fontFace: "Georgia", color: C.charcoal, bold: true, margin: 0
    });
    // Location
    s.addText(c.loc, {
      x: c.x + 0.22, y: 1.82, w: 4.1, h: 0.26,
      fontSize: 10.5, color: C.warmGray, italic: true, margin: 0
    });
    // Divider
    s.addShape(pres.shapes.RECTANGLE, {
      x: c.x + 0.22, y: 2.14, w: 4.08, h: 0.016,
      fill: { color: C.sand }, line: { color: C.sand }
    });
    // Situation
    s.addText("SITUATION", {
      x: c.x + 0.22, y: 2.2, w: 4.08, h: 0.22,
      fontSize: 7.5, color: C.muted, bold: true, charSpacing: 3, margin: 0
    });
    s.addText(c.situation, {
      x: c.x + 0.22, y: 2.44, w: 4.08, h: 0.62,
      fontSize: 11.5, color: C.charcoal, lineSpacingMultiple: 1.4, margin: 0
    });
    // Trigger label
    s.addText(c.triggerLabel, {
      x: c.x + 0.22, y: 3.12, w: 4.08, h: 0.22,
      fontSize: 7.5, color: c.tagC, bold: true, charSpacing: 3, margin: 0
    });
    s.addText(c.trigger, {
      x: c.x + 0.22, y: 3.36, w: 4.08, h: 0.58,
      fontSize: 11.5, color: C.charcoal, lineSpacingMultiple: 1.4, margin: 0
    });
    // Outcome box
    s.addShape(pres.shapes.RECTANGLE, {
      x: c.x + 0.22, y: 4.02, w: 4.08, h: 1.2,
      fill: { color: c.resultBg }, line: { color: c.tagC, pt: 1 }
    });
    s.addText("OUTCOME", {
      x: c.x + 0.38, y: 4.1, w: 3.8, h: 0.22,
      fontSize: 7.5, color: c.tagC, bold: true, charSpacing: 3, margin: 0
    });
    s.addText(c.result, {
      x: c.x + 0.38, y: 4.34, w: 3.8, h: 0.72,
      fontSize: 12, color: C.charcoal, lineSpacingMultiple: 1.45, margin: 0
    });
  });
}

// ------------------------------------------
// SLIDE 7 - HOW IT WORKS
// ------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: C.cream };

  s.addText("HOW IT WORKS", {
    x: 0.5, y: 0.26, w: 9, h: 0.28,
    fontSize: 9, color: C.terra, bold: true, charSpacing: 4, margin: 0
  });
  s.addText("60 seconds. Start to finish.", {
    x: 0.5, y: 0.56, w: 9, h: 0.58,
    fontSize: 30, fontFace: "Georgia", color: C.charcoal, margin: 0
  });

  const steps = [
    { n: "01", title: "Patient\ntriggers SOS", body: "PWA tap / USSD *456# / SMS keyword. Offline mode queues to IndexedDB and sends when signal returns.", c: C.alert },
    { n: "02", title: "Radius\nquery fires", body: "PostGIS finds every active volunteer within 5km. Sorted by distance. SMS fires to all simultaneously.", c: C.terra },
    { n: "03", title: "Volunteer\nreplies YES", body: "SMS only - no app needed. Twilio webhook confirms and routes directions to the volunteer's phone.", c: C.forest },
    { n: "04", title: "Clinic\npre-alerted", body: "Nearest hospital gets: patient name, blood type, risk flags, volunteer name, ETA. Staff prepare before arrival.", c: C.sky },
    { n: "05", title: "Family\nnotified", body: "Emergency contacts receive SMS + token link. Status page auto-refreshes. No login. No app needed.", c: C.purple },
  ];

  steps.forEach((st, i) => {
    const x = 0.38 + i * 1.87;
    // Arrow connector
    if (i < steps.length - 1) {
      s.addShape(pres.shapes.RECTANGLE, {
        x: x + 1.58, y: 1.66, w: 0.28, h: 0.022,
        fill: { color: C.sandDk }, line: { color: C.sandDk }
      });
    }
    // Circle
    s.addShape(pres.shapes.OVAL, {
      x: x + 0.28, y: 1.38, w: 0.98, h: 0.98,
      fill: { color: st.c }, line: { color: st.c }
    });
    s.addText(st.n, {
      x: x + 0.28, y: 1.38, w: 0.98, h: 0.98,
      fontSize: 20, fontFace: "Georgia", color: C.white,
      bold: true, align: "center", valign: "middle", margin: 0
    });
    // Title
    s.addText(st.title, {
      x, y: 2.46, w: 1.78, h: 0.6,
      fontSize: 11.5, color: C.charcoal, bold: true,
      align: "center", lineSpacingMultiple: 1.2, margin: 0
    });
    // Body
    s.addText(st.body, {
      x, y: 3.12, w: 1.78, h: 1.88,
      fontSize: 9.8, color: C.warmGray, align: "center",
      lineSpacingMultiple: 1.42, margin: 0
    });
  });

  // Bottom bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.22, w: 10, h: 0.405,
    fill: { color: C.charcoal }, line: { color: C.charcoal }
  });
  s.addText("If no volunteer responds in 5 minutes - escalation widens to 10km, then 20km. The coordinator is paged. The system never gives up.", {
    x: 0.38, y: 5.22, w: 9.3, h: 0.405,
    fontSize: 10, color: C.cream, align: "center", valign: "middle", margin: 0
  });
}

// ------------------------------------------
// SLIDE 8 - THE APP (FIXED TEXT OVERFLOW)
// ------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: C.charcoal };

  // Header - compressed to fit above phones
  s.addText("THE APP", {
    x: 0.5, y: 0.25, w: 9, h: 0.28,
    fontSize: 9, color: C.terra, bold: true, charSpacing: 4, margin: 0
  });
  s.addText("Six roles. One codebase. Installed from the landing page - no app store.", {
    x: 0.5, y: 0.55, w: 9, h: 0.42,
    fontSize: 17, fontFace: "Georgia", color: C.cream, margin: 0
  });

  // Three phone mockups
  const phones = [
    { x: 0.45, label: "Patient SOS", sub: "One button. Full screen.\nWorks offline.", c: C.alert, bg: "2A0808" },
    { x: 3.68, label: "Volunteer Dashboard", sub: "Live alerts. SMS fallback.\nYES / NO in one tap.", c: C.forest, bg: "0A2218" },
    { x: 6.9, label: "Coordinator View", sub: "Real-time map. All zones.\nEscalation tracking.", c: C.sky, bg: "081828" },
  ];

  phones.forEach((p) => {
    // Outer frame
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: p.x, y: 1.1, w: 2.88, h: 4.18,
      fill: { color: "1A1008" }, line: { color: "3A2E20", pt: 2 }, rectRadius: 0.24
    });
    // Screen
    s.addShape(pres.shapes.RECTANGLE, {
      x: p.x + 0.15, y: 1.32, w: 2.58, h: 3.74,
      fill: { color: p.bg }, line: { color: p.c, pt: 1 }
    });
    // Screen label
    s.addText(p.label, {
      x: p.x + 0.18, y: 1.5, w: 2.52, h: 0.35,
      fontSize: 10.5, color: C.white, bold: true, align: "center", margin: 0
    });

    if (p.c === C.alert) {
      // SOS screen
      s.addShape(pres.shapes.OVAL, {
        x: p.x + 0.54, y: 2.1, w: 1.8, h: 1.8,
        fill: { color: C.alert }, line: { color: "FF5555", pt: 2 }
      });
      s.addText("SOS", {
        x: p.x + 0.54, y: 2.1, w: 1.8, h: 1.8,
        fontSize: 28, color: C.white, bold: true,
        align: "center", valign: "middle", margin: 0
      });
      s.addText("Priya Sharma - 38 weeks", {
        x: p.x + 0.18, y: 4.05, w: 2.52, h: 0.32,
        fontSize: 9, color: C.muted, align: "center", margin: 0
      });
      s.addText("* Online - Ravi responding", {
        x: p.x + 0.18, y: 4.42, w: 2.52, h: 0.26,
        fontSize: 9, color: C.forest, align: "center", margin: 0
      });
    } else if (p.c === C.forest) {
      // Volunteer screen
      s.addShape(pres.shapes.RECTANGLE, {
        x: p.x + 0.18, y: 2.05, w: 2.52, h: 0.62,
        fill: { color: "1A4A2E" }, line: { color: C.forest, pt: 1 }
      });
      s.addText("! MAMA ALERT", {
        x: p.x + 0.18, y: 2.1, w: 2.52, h: 0.22,
        fontSize: 9, color: C.terraLt, bold: true, align: "center", margin: 0
      });
      s.addText("Priya Sharma  -  1.2km", {
        x: p.x + 0.18, y: 2.33, w: 2.52, h: 0.28,
        fontSize: 9.5, color: C.cream, align: "center", margin: 0
      });
      s.addShape(pres.shapes.RECTANGLE, {
        x: p.x + 0.18, y: 2.82, w: 2.52, h: 0.52,
        fill: { color: C.forest }, line: { color: C.forest }
      });
      s.addText("YES - I AM GOING", {
        x: p.x + 0.18, y: 2.82, w: 2.52, h: 0.52,
        fontSize: 10.5, color: C.white, bold: true,
        align: "center", valign: "middle", margin: 0
      });
      s.addShape(pres.shapes.RECTANGLE, {
        x: p.x + 0.18, y: 3.48, w: 2.52, h: 0.42,
        fill: { color: "0A1A0A" }, line: { color: "2A4A2A", pt: 1 }
      });
      s.addText("NO", {
        x: p.x + 0.18, y: 3.48, w: 2.52, h: 0.42,
        fontSize: 10, color: C.muted,
        align: "center", valign: "middle", margin: 0
      });
    } else {
      // Coordinator screen
      s.addShape(pres.shapes.RECTANGLE, {
        x: p.x + 0.18, y: 2.0, w: 2.52, h: 0.52,
        fill: { color: "0A1E30" }, line: { color: C.sky, pt: 1 }
      });
      s.addText("1 ACTIVE ALERT", {
        x: p.x + 0.18, y: 2.0, w: 2.52, h: 0.52,
        fontSize: 11, color: C.sky, bold: true,
        align: "center", valign: "middle", margin: 0
      });
      s.addText("Priya - Ravi responding\nPHC Wai pre-alerted [OK]", {
        x: p.x + 0.18, y: 2.65, w: 2.52, h: 0.65,
        fontSize: 9.5, color: C.muted, align: "center",
        lineSpacingMultiple: 1.45, margin: 0
      });
      s.addText("Volunteers: 3 alerted\nResponse time: 43s", {
        x: p.x + 0.18, y: 3.42, w: 2.52, h: 0.55,
        fontSize: 9.5, color: C.muted, align: "center",
        lineSpacingMultiple: 1.4, margin: 0
      });
    }

    // Label below phone
    s.addText(p.label, {
      x: p.x, y: 5.35, w: 2.88, h: 0.22,
      fontSize: 10, color: C.cream, bold: true, align: "center", margin: 0
    });
  });
}

// ------------------------------------------
// SLIDE 9 - SIX ROLES (IMPROVED CARDS)
// ------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: C.cream };

  s.addText("SIX ROLES. ZERO FRICTION.", {
    x: 0.5, y: 0.25, w: 9, h: 0.28,
    fontSize: 9, color: C.terra, bold: true, charSpacing: 4, margin: 0
  });
  s.addText("Every person enters at their level.", {
    x: 0.5, y: 0.55, w: 9, h: 0.55,
    fontSize: 28, fontFace: "Georgia", color: C.charcoal, margin: 0
  });

  const roles = [
    { role: "Patient",       access: "Phone number only",      can: "Trigger SOS from any device",        offline: true,  c: C.alert },
    { role: "Volunteer",     access: "Phone number only",      can: "SMS primary - App optional",          offline: true,  c: C.forest },
    { role: "Health Worker", access: "Email + password",       can: "Register patients & volunteers",      offline: false, c: C.sky },
    { role: "Hospital",      access: "SMS only - No login",    can: "Receive pre-alerts - Reply ARRIVED",  offline: false, c: C.gold },
    { role: "Family",        access: "URL token - No login",   can: "Read-only status - Auto-refreshes",   offline: false, c: C.purple },
    { role: "NGO Admin",     access: "Email + password",       can: "Manage zones - View all alerts",      offline: false, c: C.warmGray },
  ];

  roles.forEach((r, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.38 + col * 3.22;
    const y = 1.24 + row * 2.08;

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 3.06, h: 1.88,
      fill: { color: C.white }, line: { color: C.sandDk, pt: 1 },
      shadow: makeShadow()
    });
    // Left accent bar
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.055, h: 1.88,
      fill: { color: r.c }, line: { color: r.c }
    });
    // Role name
    s.addText(r.role, {
      x: x + 0.2, y: y + 0.16, w: 2.78, h: 0.38,
      fontSize: 16, fontFace: "Georgia", color: C.charcoal, bold: true, margin: 0
    });
    // Access
    s.addText(r.access, {
      x: x + 0.2, y: y + 0.56, w: 2.78, h: 0.28,
      fontSize: 10, color: r.c, bold: true, margin: 0
    });
    // Can do
    s.addText(r.can, {
      x: x + 0.2, y: y + 0.86, w: 2.78, h: 0.35,
      fontSize: 11, color: C.warmGray, margin: 0
    });
    // Offline badge
    if (r.offline) {
      s.addShape(pres.shapes.RECTANGLE, {
        x: x + 0.2, y: y + 1.38, w: 1.35, h: 0.28,
        fill: { color: "FEF2F2" }, line: { color: C.alert, pt: 1 }
      });
      s.addText("Offline capable", {
        x: x + 0.2, y: y + 1.38, w: 1.35, h: 0.28,
        fontSize: 8.5, color: C.alert, bold: true,
        align: "center", valign: "middle", margin: 0
      });
    } else {
      s.addText("Online only", {
        x: x + 0.2, y: y + 1.42, w: 2.78, h: 0.25,
        fontSize: 9, color: C.sandDk, margin: 0
      });
    }
  });
}

// ------------------------------------------
// SLIDE 10 - SDG 3 ALIGNMENT (FIXED STATS)
// ------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: C.cream };

  // Left dark column
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 4.1, h: 5.625,
    fill: { color: C.charcoal }, line: { color: C.charcoal }
  });

  s.addText("SDG 3", {
    x: 0.38, y: 0.52, w: 3.4, h: 1.05,
    fontSize: 66, fontFace: "Georgia", color: C.terra, bold: true, margin: 0
  });
  s.addText("Good Health\n& Well-Being", {
    x: 0.38, y: 1.62, w: 3.4, h: 1.05,
    fontSize: 23, fontFace: "Georgia", color: C.cream,
    lineSpacingMultiple: 1.2, margin: 0
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.38, y: 2.82, w: 3.2, h: 0.022,
    fill: { color: "3E3020" }, line: { color: "3E3020" }
  });
  s.addText("Target 3.1", {
    x: 0.38, y: 3.02, w: 3.4, h: 0.28,
    fontSize: 10, color: C.terra, bold: true, charSpacing: 2, margin: 0
  });
  s.addText("Reduce the global maternal mortality ratio to fewer than 70 per 100,000 live births by 2030.", {
    x: 0.38, y: 3.32, w: 3.4, h: 1.38,
    fontSize: 13, color: C.muted, lineSpacingMultiple: 1.5, margin: 0
  });

  // Right column - fixed stats layout
  s.addText("HOW MAMAALERT DELIVERS", {
    x: 4.5, y: 0.3, w: 5.2, h: 0.28,
    fontSize: 9, color: C.terra, bold: true, charSpacing: 3, margin: 0
  });

  const points = [
    { val: "42-52%", body: "of maternal deaths happen in transit or at home. MamaAlert's volunteer network closes this gap directly." },
    { val: "< 60 sec", body: "Full alert activation - PostGIS radius query, SMS to all volunteers, clinic pre-alert - in under a minute." },
    { val: "190+", body: "countries covered via SMS and USSD. No internet required. Works on any phone made since 1998." },
    { val: "3 delays", body: "collapsed simultaneously. Decision, journey, and facility preparation - one SOS trigger addresses all three." },
  ];

  points.forEach((p, i) => {
    const y = 0.72 + i * 1.14;
    // Left - stat number (fixed width, no overflow)
    s.addText(p.val, {
      x: 4.5, y: y + 0.04, w: 1.85, h: 0.72,
      fontSize: 30, fontFace: "Georgia", color: C.terra,
      bold: true, align: "left", margin: 0
    });
    // Right - description
    s.addText(p.body, {
      x: 6.45, y: y + 0.06, w: 3.2, h: 0.9,
      fontSize: 11, color: C.warmGray,
      lineSpacingMultiple: 1.42, margin: 0
    });
    // Divider (not after last)
    if (i < points.length - 1) {
      s.addShape(pres.shapes.RECTANGLE, {
        x: 4.5, y: y + 1.02, w: 5.2, h: 0.014,
        fill: { color: C.sandDk }, line: { color: C.sandDk }
      });
    }
  });
}

// ------------------------------------------
// SLIDE 11 - GNEC DEPLOYMENT
// ------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: C.cream };

  s.addText("THE GNEC ADVANTAGE", {
    x: 0.5, y: 0.25, w: 9, h: 0.28,
    fontSize: 9, color: C.terra, bold: true, charSpacing: 4, margin: 0
  });
  s.addText("1,600 NGO subsidiaries.\nThe network already exists.", {
    x: 0.5, y: 0.55, w: 7, h: 0.98,
    fontSize: 30, fontFace: "Georgia", color: C.charcoal,
    lineSpacingMultiple: 1.15, margin: 0
  });

  const dep = [
    {
      phase: "PHASE 1 - PILOT", title: "3 NGO partners,\n3 districts",
      body: "Deploy to existing ASHA and ANM field workers. They register patients at ANC visits. No new infrastructure.",
      time: "Month 1-3"
    },
    {
      phase: "PHASE 2 - SCALE", title: "50 NGO partners,\n5 countries",
      body: "Expand via GNEC's existing partner network. Multilingual SMS already built. USSD for zero-internet regions.",
      time: "Month 4-12"
    },
    {
      phase: "PHASE 3 - NETWORK", title: "1,600 subsidiaries,\nglobal coverage",
      body: "Every GNEC field worker becomes a deployment agent. Every zone creates its own volunteer network. Cost: $0.",
      time: "Year 2"
    },
  ];

  dep.forEach((d, i) => {
    const x = 0.38 + i * 3.22;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.72, w: 3.06, h: 3.65,
      fill: { color: C.white }, line: { color: C.sandDk, pt: 1 },
      shadow: makeShadow()
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.72, w: 3.06, h: 0.055,
      fill: { color: C.terra }, line: { color: C.terra }
    });
    // Phase badge
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.22, y: 1.92, w: 1.8, h: 0.3,
      fill: { color: C.terraPale }, line: { color: C.terra, pt: 1 }
    });
    s.addText(d.phase, {
      x: x + 0.22, y: 1.92, w: 1.8, h: 0.3,
      fontSize: 7.5, color: C.terra, bold: true,
      align: "center", valign: "middle", charSpacing: 0.5, margin: 0
    });
    // Title
    s.addText(d.title, {
      x: x + 0.22, y: 2.32, w: 2.64, h: 0.82,
      fontSize: 18, fontFace: "Georgia", color: C.charcoal, bold: true,
      lineSpacingMultiple: 1.18, margin: 0
    });
    // Divider
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.22, y: 3.2, w: 2.64, h: 0.016,
      fill: { color: C.sand }, line: { color: C.sand }
    });
    // Body
    s.addText(d.body, {
      x: x + 0.22, y: 3.28, w: 2.64, h: 1.52,
      fontSize: 11, color: C.warmGray, lineSpacingMultiple: 1.48, margin: 0
    });
    // Time badge
    s.addShape(pres.shapes.RECTANGLE, {
      x: x + 0.22, y: 5.0, w: 2.64, h: 0.28,
      fill: { color: C.charcoal }, line: { color: C.charcoal }
    });
    s.addText(d.time, {
      x: x + 0.22, y: 5.0, w: 2.64, h: 0.28,
      fontSize: 10, color: C.cream, bold: true,
      align: "center", valign: "middle", margin: 0
    });
  });
}

// ------------------------------------------
// SLIDE 12 - CLOSING
// ------------------------------------------
{
  const s = pres.addSlide();
  s.background = { color: C.charcoal };

  // Left accent bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.16, h: 5.625,
    fill: { color: C.terra }, line: { color: C.terra }
  });

  s.addText("We didn't build\na health app.", {
    x: 0.5, y: 0.42, w: 8.5, h: 1.65,
    fontSize: 52, fontFace: "Georgia", color: C.cream,
    lineSpacingMultiple: 1.08, margin: 0
  });

  // Divider
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 2.22, w: 5.5, h: 0.022,
    fill: { color: "3E3020" }, line: { color: "3E3020" }
  });

  s.addText([
    { text: "We built a network activation system\nfor the humans ", options: { color: C.muted } },
    { text: "already surrounding\nevery pregnant woman", options: { color: C.terra, bold: true } },
    { text: " -\nwho just need to be called.", options: { color: C.muted } }
  ], {
    x: 0.5, y: 2.38, w: 7.8, h: 1.95,
    fontSize: 19, fontFace: "Georgia", lineSpacingMultiple: 1.58, margin: 0
  });

  // Bottom divider
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.7, w: 9.18, h: 0.022,
    fill: { color: "3E3020" }, line: { color: "3E3020" }
  });

  // Badge row
  const badges = ["SMS - USSD - PWA", "Free to deploy", "Works offline", "SDG 3.1 aligned"];
  badges.forEach((b, i) => {
    s.addText(b, {
      x: 0.5 + i * 2.38, y: 4.82, w: 2.28, h: 0.28,
      fontSize: 9.5, color: C.mutedDk, align: "center", margin: 0
    });
    if (i < badges.length - 1) {
      s.addShape(pres.shapes.RECTANGLE, {
        x: 0.5 + (i + 1) * 2.38 - 0.05, y: 4.86, w: 0.014, h: 0.2,
        fill: { color: "3E3020" }, line: { color: "3E3020" }
      });
    }
  });

  // Logo + presenter
  s.addShape(pres.shapes.OVAL, {
    x: 0.5, y: 5.18, w: 0.16, h: 0.16,
    fill: { color: C.terra }, line: { color: C.terra }
  });
  s.addText([
    { text: "Mama", options: { color: C.cream, bold: false } },
    { text: "Alert", options: { color: C.terra, bold: true } }
  ], {
    x: 0.72, y: 5.14, w: 3, h: 0.35,
    fontSize: 16, fontFace: "Georgia", margin: 0
  });
  s.addText("GNEC Hackathon 2026 - Fahim Badgujar", {
    x: 6.8, y: 5.18, w: 2.88, h: 0.28,
    fontSize: 8.5, color: "3E3020", align: "right", margin: 0
  });
}

// -- WRITE --
pres.writeFile({ fileName: "MamaAlert_Presentation.pptx" })
  .then(() => console.log("Done"))
  .catch(e => console.error(e));
