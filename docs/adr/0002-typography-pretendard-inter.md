---
name: adr-0002-typography-pretendard-inter
status: accepted
---

# Pretendard + Inter as the only fonts

We are a sans-serif site (no serif, no mono outside code blocks). The bilingual **Identity Statement** ([[adr-0001-language-strategy]]) places Korean and English text side-by-side, and most Latin-Korean font pairings have a visible weight mismatch — the Korean glyphs read heavier than the Latin ones, or vice versa, producing an uneven block of text.

**Decision:** Pretendard for Korean glyphs, Inter for Latin glyphs, both at the same weight and size. These two families are deliberately tuned as a humanist-modern sans pair; their x-height, stroke contrast, and visual weight align closely enough that the bilingual block reads as one cohesive paragraph rather than two languages stitched together.

**Considered and rejected:**

- *System fonts only (0KB)* — saves bundle weight but produces an inconsistent appearance across OSes, and Korean defaults (Malgun on Windows, Apple SD Gothic Neo on macOS) pair poorly with Latin system fonts.
- *Noto Sans KR + Inter* — the canonical "free Korean sans" choice but Noto's Korean glyphs read noticeably heavier than Inter, breaking the Identity Statement.
- *Serif (Tiempos, Charter, EB Garamond)* — visually appealing but no Korean serif pairs cleanly with any of these; the Korean fallback would look like a different document.

**Consequences:** Any new typographic surface uses these two fonts. No third font (display, mono variant, decorative) is introduced without revisiting this ADR. Code blocks may use a separate mono font; that is a different concern and not covered here.
