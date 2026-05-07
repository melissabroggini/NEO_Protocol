# Design Document: NASA 70th - Interactive Text Displacement

**Date:** 2026-05-07
**Topic:** Interactive Hero Section with Draggable Elements and Text Displacement
**Style:** Brutalist / Physics-Based Interaction
**Tech Stack:** Pretext CSS Framework, Vanilla JavaScript (RequestAnimationFrame), CSS Transforms

## 1. Vision & Concept
Enhance the NASA 70th Anniversary hero section by making it "physically" interactive. Draggable "porthole" images act as physical objects that displace individual letters of the main title. This reinforces the "Exploring the Unknown" theme by allowing the user to literally push through the information.

## 2. Architecture: Atomic DOM Displacement
To achieve fluid interaction while maintaining accessibility and SEO:
- **Layout Calculation:** Use `pretext` to calculate the static, responsive positions of every character.
- **DOM Atomization:** Convert the `h1` text into individual `<span>` elements, each absolutely positioned at the coordinates provided by Pretext.
- **Physics Loop:** A global `requestAnimationFrame` loop calculates distances between draggable images and each letter span.

## 3. Key Interactions
### A. Draggable Portholes
- Images are no longer static; they are draggable via `mousedown/touchstart` and `mousemove/touchmove`.
- Initial size reduced to ~20vw for better maneuverability.
- On drag: Image loses grayscale filter, scales up slightly (1.1), and gains a subtle drop shadow.

### B. Text Displacement (Collision Physics)
- **Force Field:** Each draggable image has a circular "influence zone" slightly larger than its visual radius.
- **Displacement Vector:** When an image enters a letter's influence zone, the letter is moved away from the image center.
- **Spring Physics:** When the image moves away, letters use a spring animation (hooke's law) to return to their "home" position (the original Pretext coordinates).

### C. Responsiveness
- Pretext will re-calculate "home" positions on window resize.
- Atomic spans will update their target coordinates, maintaining the brutalist layout across devices.

## 4. Technical Details
- **Pretext Usage:** `prepare` for measuring the Inter Black font; `layout` to get line/glyph positions.
- **Performance:** CSS `will-change: transform` on all atomic spans to trigger GPU acceleration.
- **Events:** Global pointer event listeners to handle both mouse and touch input seamlessly.

## 5. Success Criteria
- 60fps interaction during dragging.
- No "layout thrashing" (all measurements done via Pretext, not DOM APIs).
- Letters return perfectly to their original brutalist grid layout after interaction.
