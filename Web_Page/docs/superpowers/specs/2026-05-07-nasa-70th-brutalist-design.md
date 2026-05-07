# Design Document: NASA 70th Anniversary - Brutalist Web Page

**Date:** 2026-05-07
**Topic:** NASA 70th Anniversary Celebration Site
**Style:** Brutalist / Minimalist / NASA Brand Aligned
**Tech Stack:** HTML5, CSS3 (Vanilla), Pretext CSS Framework

## 1. Vision & Concept
A single-page application (SPA) celebrating 70 years of NASA exploration using a brutalist aesthetic. The design focuses on high-impact typography (NASA's official Inter font), absolute black backgrounds, and a technical, mission-control feel.

## 2. Visual Identity
- **Background:** `#000000` (Absolute Black)
- **Primary Text:** `#F9FAFB` (Ice White)
- **Secondary/Numerical Text:** `#1F2937` (Dark Gray)
- **Typography:** 
    - **Font:** `Inter` (Google Fonts).
    - **Titles:** Weight 900 (Black), Uppercase, Negative letter-spacing (`-0.05em`), Line-height `0.8` to `0.9`.
    - **Body:** Weight 400-500, tight technical reporting style inspired by Pretext.
- **Imagery:** 
    - Round "porthole" (oblò) shapes using `border-radius: 50%`.
    - NASA-themed space photography from Unsplash/NASA source.

## 3. Structure & Layout
### Section 1: Hero ("L'Intro Wow")
- **Copy:** "EXPLORING / THE UNKNOWN / FOR SEVENTY / YEARS"
- **Design:** Full-screen giant typography (`8vw`+).
- **Layout:** Text blocks broken by 2-3 overlapping circular images (portholes). No navigation links.

### Section 2: Projects List ("Cosmic Numbers")
A vertical list of 13 historical NASA missions:
1.  **01 - EXPLORER 1 (1958)**
2.  **02 - PROJECT MERCURY (1958-1963)**
3.  **03 - PROJECT GEMINI (1961-1966)**
4.  **04 - APOLLO 11 (1969)**
5.  **05 - SKYLAB (1973-1979)**
6.  **06 - VIKING 1 (1975)**
7.  **07 - VOYAGER 1 & 2 (1977)**
8.  **08 - SPACE SHUTTLE (1981-2011)**
9.  **09 - HUBBLE SPACE TELESCOPE (1990)**
10. **10 - INTERNATIONAL SPACE STATION (1998-PRESENT)**
11. **11 - MARS ROVER CURIOSITY (2011)**
12. **12 - JAMES WEBB TELESCOPE (2021)**
13. **13 - ARTEMIS I (2022)**

**Row Layout:**
- Left: Giant number in `#1F2937`.
- Right: Title + Mission Report (Description) + Minimalist "> ACCESS DATA" link.

## 4. Technical Implementation
- **Framework:** `Pretext` for raw text formatting.
- **Responsive Design:** Fluid typography using `vw` units. CSS Grid for the project list layout.
- **Animations:** Subtle hover effects on links and porthole images.

## 5. Success Criteria
- High visual impact upon loading.
- Legible but "raw" mission reports.
- Seamless integration of the brutalist style with NASA's official typography.
