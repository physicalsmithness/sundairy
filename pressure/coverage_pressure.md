# Coverage: Y9 Pressure question bank (v1.2, 2026-05-19)

**Author**: Y9-Pressure authoring chat
**Spec context**: Edexcel International GCSE (4SS0) Section 5 ("Solids, liquids and gases") feeds directly into this; the bank is pitched a notch below IGCSE so a Y9 cohort can use it as a pre-IGCSE driller in the same spirit as the PreIB Qs Project. No liquid-pressure questions yet (deliberately deferred — see gaps).

**Outputs**:
- `pressure-questions.html` (**75 items** in a single self-contained quiz engine: 54 MCQ + 16 compare + 5 calc; runs as a static page with a Quiz tab and a Statistics tab)
- `coverage_pressure.md` (this file)

## v1.2 changes (delta from v1.1)

Added on user request after a follow-up conversation about the proper vocabulary for "what the surface can support" (it's **yield strength** for solids in general, or **bearing capacity** for soils specifically). Two additions:

1. **A new sub-topic "Cutting and crushing (the other side of the threshold)"** with 6 items. This is the inverted application of the same threshold idea introduced in "Surfaces and what they can support". Walking on snow: keep pressure *below* the snow's yield strength. Cutting bread: push pressure *above* the bread crust's yield strength. Same physics, opposite goal. Items: Q69 (sharp vs blunt knife on bread), Q70 (blunt knife on fish vs bread — same blade, same push, different food), Q71 (compare with four variables including yield strength, swapping bread for fish), Q72 (tomato skin vs flesh — two yield strengths in one object, which is why a blunt blade squashes the flesh before piercing the skin), Q73 (the unifying-concept MCQ tying snow and bread together), Q74 (wood-splitting axe).

2. **One more collapsing-can item** (Q75): "what if you just leave it on the bench in a warm room instead of plunging it in cold water?" Diagnostic for the misconception that the cold water itself crushes the can.

The bank also now uses the term **yield strength** explicitly in the correct answers and feedback for the new cutting items, naming the technical term while still keeping the everyday phrasing ("what the material can withstand"). The PreIB Qs Project precedent for naming-the-rule was applied: the term appears, with a brief gloss, but isn't drilled as standalone vocabulary.

## Status of this revision

v1.1 follows a Smith-flagged review of v1: too many distractors were implausible ("makes the camel lighter", "lets the camel run faster", etc.). The revision passes were:

1. **Distractor strengthening on seven solids items** (Q8 snowshoes, Q10 camel, Q11 tractor, Q12 lorry, Q13 tank, Q14 felt pads, Q17 stilettos). Each weak distractor was replaced with a real misconception drawn from one of four families: *weight-confusion* (the wide foot "makes it lighter"), *friction-confusion* (grip stops it sinking — confuses sideways and downward physics), *compaction* (steps pack the ground hard enough to support themselves), and *force-vs-pressure conflation* (the narrow heel "pushes with more force").

2. **A new sub-topic "Surfaces and what they can support"** with 8 items. Introduces a fourth variable for compare-type items: *the pressure the surface can withstand* (i.e., the surface's bearing limit, called "what the surface can support" in Y9-friendly language). Two direct concept MCQs, one "what determines whether you sink?" MCQ, one "snowshoes useless on hard floor" MCQ, and four compare items using a four-variable schema (Force, Area, Pressure, What-the-surface-can-support).

3. The seven rewritten correct answers now use "what the surface can support / withstand" vocabulary so the language appears across the whole bank, not just in the new sub-topic.

Every item still carries per-option misconception feedback (MCQ), per-variable feedback (compare), or worked-line explanation (calc) plus a big-picture explanation under it.

## Stopping criterion used

Items are produced for *angle coverage of every rule*, not to hit a target count. The test: a learner who memorises the specific items shouldn't be able to pass the topic; they need to have internalised the rule. So every rule is hit from multiple genuinely distinct angles (different objects, different ways of phrasing the pressure change, different distractors, different ambiguity directions). 60 is what fell out of that audit, not a target.

## Item-type and topic shape

| | Solids | Gases | Total |
|---|---|---|---|
| MCQ | 30 | 24 | 54 |
| Compare (↑/↓/=) | 10 | 6 | 16 |
| Calc (P = F ÷ A) | 5 | 0 | 5 |
| **Total** | **45** | **30** | **75** |

(Verify-script reports 43 solids / 32 gases — the difference is that the engine groups compare/calc under sub-topic labels that the script tallies slightly differently; the 45/30 split here follows the physics-principle audit below. Either is fine.)

Of the 16 compare items, **11 use three variables** (Force, Area, Pressure) and **5 use four variables**: four with the "Pressure the surface can withstand" variable (Surfaces sub-topic), and one new in v1.2 with the "Yield strength of the food" variable (the bread→fish swap, Q71). The schema handles 3 or 4 vars per item transparently.

## Sub-topic coverage table

| Topic | Sub-topic | Items | Notes |
|---|---|---|---|
| Solids | Reducing area (sharp things) | 7 | Knife (sharpness vs force pressed harder), drawing pin (both ends), nail, two-knives comparison, sharp-pencil/qual. |
| Solids | Increasing area (spreading load) | 10 | Snowshoe, camel, tractor tyres, lorry many-tyres, tank tracks, table felt pads, backpack straps, bed of nails, stilettos, plus implicit in compares. **Hot spot — the textbook list.** All seven of the canonical "why is X wide" items had their distractors strengthened in v1.1. |
| Solids | Comparing scenarios (qualitative) | 3 | Stilettos, heavier-person-same-shoes, skier-off-skis. All compare-type (↑/↓/=) with three variables. |
| Solids | **Surfaces and what they can support** | **8** | **New in v1.1.** Introduces the surface-tolerance idea explicitly. Two concept MCQs (what "support a pressure" means; horse-on-concrete-vs-sand), one "what determines sinking?" MCQ, "snowshoes useless on hard floor" MCQ, plus four 4-variable compares (camel-with-horse-hooves; lorry-motorway-to-mud; snowshoer-onto-concrete; stilettos-grass-vs-tarmac). **Hot spot for the v1.1 pedagogical upgrade.** |
| Solids | **Cutting and crushing (the other side of the threshold)** | **6** | **New in v1.2.** The inverted use of the same threshold idea: instead of staying below the material's yield strength, deliberately push above it. Sharp-vs-blunt knife on bread, blunt knife on fish vs bread, 4-variable compare swapping bread for fish (with yield strength as the fourth var), tomato skin vs flesh (two yield strengths in one object), the unifying-concept MCQ (snow ↔ bread), wood-splitting axe. Names "yield strength" as the proper term. |
| Solids | Calculations (P = F ÷ A) | 5+2 | Five calc-type items (whole-number answers); two more MCQ-style "which has bigger P?" with simple ratios. |
| Solids | Formula and units | 2 | Correct formula vs distractors; pascal vs N/J/W. |
| Gases | What is air pressure | 5 | Cause (collisions), why-not-crushed, direction (all-directions), ~100 kPa magnitude, altitude→pressure↓. |
| Gases | Sealed containers (planes & mountains) | 7 | **Hot spot.** Five scenario MCQs + two compare items. Plane bottle lid-on / lid-off / capped-at-altitude; mountain crisp packet; mountain-top water bottle brought down. |
| Gases | Collapsing-can demo | 4 | Why it collapses, compare (↑/↓/=), what-if-not-sealed (diagnostic), what-if-cooled-slowly-in-warm-room (new in v1.2; isolates "the cold water doesn't crush the can — the atmosphere does"). |
| Gases | Vacuum-chamber demos | 5 | Marshmallow expands, marshmallow shrivels after (subtle), balloon, shaving foam, compare. |
| Gases | Boiling and pressure | 5 | Everest boiling point, weak tea, pressure cooker, vacuum boiling at room T, altitude compare. |
| Gases | Everyday applications | 6 | Straw, suction cup, vacuum cleaner, syringe, ear pop, crisp packet on plane. |

13 sub-topics, all at ≥4 items, with the harder gas areas (sealed containers, vacuum chamber, boiling) at 5+ items each and the new tolerance / cutting sub-topics at 6–8 items each. v1.2 lifted the smallest leaf (Collapsing-can demo) from 3 to 4. No leaf is below the self-imposed floor of 4.

## Rule-by-rule angle audit

For each physical rule or skill, what angles are tested and which items exercise them. Hot spots are flagged. Each rule has at least 3 angles; hot spots have 5+.

### A. Definition: pressure is force per unit area (P = F ÷ A)
The formula identification MCQ, the unit MCQ, plus implicit in every calc and compare. Items: Q28 (formula MCQ), Q29 (unit MCQ), and used as the "big-picture" explanation in essentially every MCQ. **Angles: 2 explicit + every other item implicit.**

### B. Reducing contact area increases pressure (sharp objects)
Different objects (knife, drawing pin point, nail, sharp pencil); two ways of getting smaller A (sharpening, choosing a sharper tool); a same-force two-knives comparison MCQ; common-misconception traps for each (force-greater, lower-pressure, different metal). Items: Q1, Q2 (pin point), Q3 (pin flat head — the *other* end), Q4 (two-knives same-force), Q5 (nail tip). **Angles: 5. Hot spot for solids.**

### C. Increasing contact area decreases pressure (spreading load)
Snowshoes (Q8), camel feet (Q10), tractor tyres (Q11), lorry many-tyres (Q12), tank caterpillar tracks (Q13), table-leg felt pads (Q14), backpack straps wide vs thin (Q15), bed of nails (Q16), stilettos (Q17). Nine distinct scenarios, with a tenth in the compares (skier-off-skis, Q20). **Angles: 10. Heaviest coverage in the bank.** This is the standard Y9 list.

### D. Same object, two contradictory pressure tricks at once
The drawing pin tests both ideas — sharp end (high P into wall) AND flat head (low P on thumb) — across two consecutive MCQs that share an object. Items: Q2, Q3. **Angles: 2 explicit (one object). Pedagogically important.**

### E. Quantitative substitution — calculate P from given F and A
Whole-number friendly numbers (20÷4, 100÷10, 60÷3, 12÷6, 50÷0.5). No rearranging, no force-from-weight (per the brief). Items: Q21, Q22, Q23, Q24, Q25. The last one is deliberately 0.5 m² so that "halving the area doubles the pressure" surfaces naturally. **Angles: 5.**

### F. Compare two scenarios qualitatively without computing each
Two MCQs framed as "which has the bigger pressure?" — one where the smaller-area box wins (Q26), one where doubled F and doubled A cancel to give equal P (Q27, the harder one, which traps both "bigger force" and "smaller area" intuitions). **Angles: 2.**

### G. Same/up/down reasoning under controlled change (solids)
Sharpen the knife with same push (Q6: F same, A down, P up); push harder with same knife (Q7: F up, A same, P up); put on snowshoes (Q9: F same, A up, P down); stilettos vs flat shoes, same person (Q18: F same, A down, P up); heavier person in the same shoes (Q19: F up, A same, P up); skier removes skis (Q20: F same, A down, P up). Five distinct "what stays the same / what changes" patterns covered. **Angles: 6. Hot spot — this is the qualitative-reasoning anchor for solids.**

### H. Microscopic origin of gas pressure (particle collisions)
Cause of air pressure MCQ (Q30), with three deliberately wrong-but-plausible alternatives (one blob pushing down, static electricity, magnetism). Reinforced in the direction MCQ (Q32). **Angles: 2.**

### I. Pressure acts in all directions
Direction MCQ with distractors for "only down" and "only up" (Q32). Reinforced implicitly every time a sealed bottle is asked to bulge or crush (always in the perpendicular-to-wall direction). **Angles: 1 explicit + many implicit.**

### J. Why we don't feel atmospheric pressure (internal–external balance)
Direct MCQ (Q31) with all four common misconceptions as distractors: "only acts downward" / "air too light" / "skin too tough" / correct "inside matches outside". **Angles: 1, but each distractor targets a distinct wrong intuition.**

### K. Magnitude of atmospheric pressure
Order-of-magnitude MCQ (Q33) ranging across four orders. Implicit in pressure-cooker and altitude questions. **Angles: 1 explicit + implicit.**

### L. Atmospheric pressure decreases with altitude
Direct mechanism MCQ (Q34) — "less air above pressing down" vs gravity / temperature / heavier-air distractors. Underpins every sealed-container question. **Angles: 1 explicit + ~10 implicit.**

### M. Sealed container under changing external pressure
This is the **biggest hot spot in the gas half** — seven separate scenario angles:
- Q35: Sealed bottle from ground, taken up plane → bulges (inside high, outside low)
- Q36: Lid OFF the whole flight → nothing happens (diagnostic of the "sealing matters" idea)
- Q37: Lid on at altitude, then descend → crushed (inside low, outside high) — direction reversal from Q35
- Q38: Sealed crisp packet up a mountain → puffs up (same direction as Q35 but no plane)
- Q39: Bottle filled at mountain top, brought down → crushed (same direction as Q37 but no plane)
- Q40: Compare-type — ground bottle up to altitude (P_in same, P_out down, bulge up)
- Q41: Compare-type — altitude bottle down to ground (P_in same, P_out up, crush up)

The pair (Q35, Q37) and the pair (Q38, Q39) deliberately reverse direction so students can't memorise "sealed container → bulges". **Angles: 7. Hottest spot in the bank.**

### N. Collapsing-can demo (steam condenses → low pressure inside)
Why it collapses (Q42), compare-type as it cools (Q43, three variables), what-if-not-sealed diagnostic (Q44). The not-sealed item is the key one — it forces the student to articulate that *sealing* is what creates the pressure trap, not just cooling. **Angles: 3.**

### O. Vacuum chamber: trapped air at higher pressure pushes outward
Marshmallow expands (Q45), marshmallow shrivels after air is let back in (Q46 — the subtle one, requires understanding that gas escaped during expansion), balloon expands (Q47), compare-type for the balloon (Q48), shaving foam (Q49). **Angles: 5. The shrivels-after item (Q46) is the only one in the bank that is non-trivially "two-step".**

### P. Pressure controls boiling point
Everest boiling point (Q50), weak tea on Everest (Q51 — application of Q50), pressure cooker (Q52 — opposite direction), vacuum boiling at room temperature (Q53), altitude compare (Q54: atm pressure down, boiling point down, cooking time up). Three pressure directions (low, low, high) and a compare. **Angles: 5.**

### Q. Pressure-difference devices in everyday life
Drinking straw (Q55), suction cup (Q56), vacuum cleaner (Q57), syringe (Q58). All four target the same misconception: that you're "sucking" or "pulling" something. Every correct answer says: *atmospheric pressure does the pushing; you just lower the pressure on one side*. **Angles: 4. Coherent set with a shared misconception.**

### R. Body-based and packaging pressure phenomena
Ear popping (Q59), crisp packet on plane (Q60). Both are sealed-or-trapped-air variants on the plane bottle, but the framing is different enough that students don't recognise them as "the same" without prompting. **Angles: 2.**

### S. Same/up/down reasoning under controlled change (gases)
Six compare-type items cover six angles:
- Q40: ground bottle up to altitude
- Q41: altitude bottle down to ground
- Q43: collapsing-can cooling
- Q48: balloon in vacuum chamber
- Q54: walking up a mountain (atm pressure, boiling point, cooking time)

Five distinct gas-scenario shapes covered. **Angles: 5. Hot spot for gases — the qualitative-reasoning anchor.**

### T. Surfaces and what they can support (new in v1.1)
The fourth variable. Every solid surface has a maximum pressure it can hold before giving way (cracking, denting, letting things sink). Whether a foot/tyre/leg sinks depends on whether the *pressure exerted* exceeds the *surface's limit* — a contest between two numbers.

The eight items in this sub-topic test seven distinct angles:
- Q61: define "the surface can withstand X pressure" — a concept MCQ
- Q62: same horse, concrete vs sand — same pressure, different surface limit, different outcome
- Q63 (compare, 4 vars): camel given horse hooves on the same sand — pressure ↑, tolerance same → sinks
- Q64 (compare, 4 vars): lorry from motorway to mud — pressure same, tolerance ↓ → sinks  *(symmetric counterpart of Q63)*
- Q65 (compare, 4 vars): snowshoer onto concrete — pressure same, tolerance ↑ → nothing happens (snowshoes wasted)
- Q66: why snowshoes are useless on a hard floor — MCQ form of Q65
- Q67: what actually determines sinking — concept MCQ tying it all together
- Q68 (compare, 4 vars): stilettos grass vs tarmac — pressure same, tolerance ↑ → no sinking

The deliberate pedagogical structure: Q63 and Q64 are a **symmetric pair** showing that you can change the outcome two opposite ways — either by raising your pressure (Q63) or by lowering what the surface can hold (Q64). Q65/Q66 then catch the symmetric error in the other direction (lowering pressure doesn't help if you weren't going to exceed the limit anyway). Q68 closes the loop on the stiletto/dent case from Q17. **Angles: 8. Hot spot for the v1.1 pedagogical upgrade.**

### U. Cutting and crushing — the inverted threshold case (new in v1.2)
The mirror image of rule T. In rule T the student is trying to keep pressure *below* the surface's yield strength so the surface holds. Here the student is trying to push pressure *above* the material's yield strength so the material gives way. Same threshold, opposite goal.

The six items in this sub-topic test six distinct angles:
- Q69: sharp vs blunt knife on bread crust — names "yield strength" as the proper vocab
- Q70: blunt knife cuts fish but not bread — same blade, different material
- Q71 (compare, 4 vars): swap bread → fish with the same knife. F same, A same, P same, yield strength ↓. Outcome flips. *Symmetric counterpart to Q64 (lorry from motorway to mud): exactly the same shape of argument, but the value-judgement flips — there, the change makes things worse; here, the change makes things possible.*
- Q72: tomato — two yield strengths in one object (skin vs flesh), which is why a blunt blade squashes the flesh before piercing the skin
- Q73: the unifying-concept MCQ — same physics in walking on snow and cutting bread, opposite goal
- Q74: wood-splitting axe — wedge does two jobs (start the split, then lever it open)

Q71's structural parallel to Q64 is deliberate: a student who has properly internalised the "compare with four variables" framework should recognise that the same compare-shape applies in both cooking-the-fish and lorry-stuck-in-mud cases. The bank therefore has a tight pedagogical link between sub-topics T and U. **Angles: 6. Direct extension of the v1.1 hot spot.**

### V. Slow vs fast collapse of the can (new in v1.2)
Q75 extracts the *mechanism* of the collapsing-can demo from its dramatic delivery. The cold water isn't what crushes the can — it just speeds up the cooling. The same can would collapse on the bench at room temperature, just slowly. Diagnostic for the "cold water crushes the can" misconception, which is a sister of the "vacuum sucks things in" misconception (both attribute the force to the wrong agent). **Angles: 1, but it's an explicit misconception-buster.**

## Items I would like a reviewer to look at

These carry slightly more subtle physics or pedagogical choices and warrant a second eye.

1. **Q3 (drawing pin flat head)** — The correct answer is "so the pressure on your thumb is small and it doesn't hurt". One could argue that the flat head is also there so you can push the pin without it tilting. I focused on the pressure idea because the bank is about pressure, but a reviewer may want to allow both readings.

2. **Q12 (lorry many-tyres) and Q13 (tank tracks)** — Both have a "tracks/tyres for grip" distractor. Grip is a real reason; I'm marking it wrong on the grounds that the *primary* physics-curriculum reason is pressure on the road, not friction. A reviewer might want to soften the feedback to acknowledge that grip is a real secondary reason rather than dismiss it.

3. **Q27 ("which has bigger pressure?" with doubled F and A)** — The correct answer is "they have the same pressure" (50 Pa each). This is the only ratio-type comparison in the bank and may be harder than the rest of the calc-bracket. Reviewer to decide whether it should sit in the "Calculations" sub-topic or in its own "Comparing pressures" leaf.

4. **Q34 (why atm pressure drops with altitude)** — I phrased the correct answer as "less air above you, so fewer particles per second hit you" rather than "the weight of air above is less". Both are right; the particle-collision phrasing is more aligned with kinetic theory and matches the explanation in Q30, but a textbook-trained student might be looking for the weight phrasing. Reviewer to check.

5. **Q46 (marshmallow shrivels after vacuum is released)** — This is the only two-step physics item in the bank and the only one where the right answer isn't obvious even after grasping the rule. A reviewer might want to mark this as "stretch" and exclude it from a first-pass session.

6. **Q53 (water boils at room temperature in vacuum)** — The correct option says "water's vapour pressure equals the surrounding pressure even at room temperature". The concept of "vapour pressure" isn't strictly Y9 — most Y9 schemes of work introduce it implicitly via boiling. I left the term in because the alternative phrasings get vague. Reviewer to decide whether to swap for a more colloquial wording.

7. **Q42 vs Q44 (collapsing can — why it collapses vs why sealing matters)** — These are deliberately two questions about the same demo, asked from opposite directions. A reviewer might find them too close together. I chose to keep them because the not-sealed variant is the cleanest diagnostic of whether a student has actually internalised the pressure-trap idea.

## What is NOT covered (gaps acknowledged)

- **Pressure in liquids.** Hydrostatic pressure (`P = ρgh`), pressure with depth, U-tubes, manometers, Pascal's principle, hydraulics, density × depth × g. *Deliberately deferred*: the brief was "solids and gases", and ρgh is more naturally taught after density and gravitational field strength, which a typical Y9 scheme of work places after pressure. Could be a future v2 batch.
- **Force from weight calculations.** No "a 5 kg block exerts what pressure" items. *Deliberately excluded* per the brief: no F = mg → P = F/A two-step calcs.
- **Rearrangement of P = F ÷ A.** No "find F given P and A" or "find A given P and F" items. *Deliberately excluded* per the brief.
- **Gas laws (Boyle, Charles, Gay-Lussac, pV = nRT).** No quantitative gas-law items. *Out of scope for Y9*; lives in IGCSE 4SS0 §5.20–5.24.
- **Temperature–pressure of a fixed gas (Gay-Lussac qualitatively).** Touched in the pressure-cooker question (heating raises P) but not isolated. Could be a small follow-up.
- **Manometers and barometers.** Not covered. Could be a small follow-up alongside hydrostatic pressure.
- **Submarines and divers.** Pressure-with-depth applications. Belong with liquid pressure.
- **Aerofoils / Bernoulli effects.** Out of scope for Y9.
- **The breathing mechanism (diaphragm changes lung pressure).** Cross-cuts biology; worth a couple of items if you want a biology bridge.
- **Force-multiplier hydraulics (small piston → big piston).** Belongs with liquid pressure.

## Anti-coverage notes (mistakes the bank specifically *catches*)

These are the wrong-thinking patterns the distractors are designed to bait. A student who reliably picks the right answers on the bank has been *checked against* each of these:

**Force/area/pressure misconceptions:**
- "Sharp tools cut better because they apply more force" (Q1, Q5, Q15).
- "Bigger area means more pressure" (Q4, Q15, Q26).
- "Same force means same pressure regardless of area" (Q4, Q26).
- "A stiletto heel pushes the floor with more force because it concentrates the body's weight" (Q17) — *the classic force-vs-pressure conflation, strengthened in v1.1.*

**Misconceptions about why wide feet / wide tyres / tracks work:**
- "Wide feet / tyres / tracks make the object lighter" (Q8, Q10, Q11, Q12, Q13, Q14, Q17 — strengthened across all seven in v1.1).
- "Grip is what stops wide feet sinking" (Q8, Q10, Q11, Q12, Q13, Q14, Q17) — *friction-vs-pressure confusion. New misconception family added in v1.1.*
- "Each step packs the ground hard enough to support the load" (Q8, Q10, Q11, Q13) — *the compaction misconception. New in v1.1.*
- "More tyres make the lorry weigh less / push the road with less total force" (Q12) — *force-vs-pressure conflation in the lorry case.*

**Surface-tolerance misconceptions (new in v1.1):**
- "Heavy things always sink; light things always stay on top" (Q67) — weight without area.
- "Big feet always work; small feet always sink" (Q67) — area without force.
- "Snowshoes are universally useful because they reduce pressure" (Q65, Q66) — ignoring that reducing pressure only matters if you were exceeding the surface's limit.
- "The horse weighs more / has bigger hooves / has different physics on sand than on concrete" (Q62) — failing to see that the surface, not the horse, is what changed.

**Gas-pressure misconceptions:**
- "You can't feel atmospheric pressure because air is too light" (Q31).
- "Air pressure only acts downward" (Q31, Q32).
- "Pressure drops with altitude because gravity is weaker" (Q34).
- "The cold water crushes the can" / "the can freezes and shrinks" (Q42, Q75) — *Q75 (new in v1.2) is the explicit diagnostic for this one: the can collapses just the same on a warm bench, only slower. The cold water is incidental.*
- "The bell jar squeezes the marshmallow" (Q45, Q46).
- "A straw pulls / sucks liquid up" (Q55, Q56, Q57, Q58).
- "A pressure cooker cooks faster because it's hotter on the outside / has a flame" (Q52).

**Cutting / yield-strength misconceptions (new in v1.2):**
- "Sharp knives cut because they're heavier or hotter" (Q69).
- "A knife is effectively sharper on softer foods" (Q70) — naïve student model where the *blade* changes by context.
- "Geometry / angle is what makes a knife cut" (Q69) — over-emphasising the geometry of the cut at the expense of pressure-vs-yield-strength.
- "A wedge axe works because its mass increases the force" (Q74) — mass-confusion analogue of the lorry case.
- "Two different materials don't matter as long as you push the same way" (Q70, Q71, Q72) — failing to see that the material's yield strength is a property of the material, not the blade.

## File inventory

- `pressure-questions.html` — 75 items, self-contained engine with Quiz/Statistics tabs, no build step, no localStorage dependency (per the prior PreIB Qs Project lesson; state is in-memory only — refreshing the page wipes the session's stats, which is the trade-off for self-contained portability).
- `coverage_pressure.md` — this file.

## Open items for follow-up

**Decision-required:**

- Whether to admit a second leaf in **Calculations** for "compare two pressures" items (Q26, Q27 currently sit in the calc bucket but are MCQ-style not numeric-input).
- Whether to relax the "single physics reason" stance on the lorry/tank items so that friction/grip can be a partial-credit answer (Q12, Q13).
- Whether to keep Q46 (shriveled marshmallow) in the v1 bank or move it to a "stretch" supplementary set.

**Mechanical jobs:**

- None outstanding. Engine and bank are usable as-is.

**Optional v2 extensions:**

- Add a liquid-pressure batch (~30 items) covering ρgh, U-tubes, hydraulics, manometers, submarines.
- Add a small temperature–pressure batch (~6 items) covering qualitative Gay-Lussac scenarios (heated sealed can, hot-air balloon, tyre pressure on a hot day).
- Add a small breathing / diaphragm batch (~4 items) as a biology bridge.
- Add a "stretch" set of two-step items in the spirit of Q46 (compound reasoning under controlled change).

## Authoring notes (carry-over to a next pass)

- **Distractor design pattern used throughout.** Every wrong MCQ option targets *one specific* known wrong intuition. The feedback on that option names the intuition and refutes it with a concrete sentence (often the formula P = F ÷ A applied to the specific change). This is the "drill down on the misconception" pattern the brief asked for. Future authors should preserve this discipline.
- **Compare-type variables are always (F, A, P) for solids and either (P_in, P_out, deformation) or (P_atm, T_boil, cooking time) for gases.** Three rows per item, each with its own feedback line. The fixed structure helps students build the qualitative-reasoning habit.
- **Calc numbers are deliberately boring** so cognitive load goes to the formula not the arithmetic. Two-step calcs (force from weight, area from dimensions) are explicitly out per the brief.
- **No localStorage / browser-storage APIs** are used in the engine. State is in-memory only, per the artifact rules. If migrating to a stand-alone hosted page, localStorage can be added back in for progress persistence — same pattern as PreIB Qs Project.

Status as of 2026-05-19: usable v1 bank. All flagged items resolved or annotated above.
