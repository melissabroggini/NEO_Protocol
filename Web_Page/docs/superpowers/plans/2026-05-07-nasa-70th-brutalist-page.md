# NASA 70th Anniversary Brutalist Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-impact, brutalist single-page website for NASA's 70th anniversary featuring historical missions.

**Architecture:** Single-page HTML/CSS using Pretext for text structure and custom CSS for the brutalist "NASA Mission Control" aesthetic.

**Tech Stack:** HTML5, CSS3, Pretext CSS, Google Fonts (Inter).

---

### Task 1: Scaffolding and Base Styles

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create index.html with base Pretext and Google Fonts setup**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NASA 70 — EXPLORING THE UNKNOWN</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;900&display=swap" rel="stylesheet">
    <style>
        /* Pretext Base Rules (Simplified/Inline) */
        html { background: #000; color: #f9fafb; font-family: 'Inter', sans-serif; }
        body { margin: 0; padding: 0; line-height: 1.5; -webkit-font-smoothing: antialiased; }
        * { box-sizing: border-box; }
        
        /* Brutalist Base */
        h1, h2, h3 { margin: 0; text-transform: uppercase; font-weight: 900; line-height: 0.85; letter-spacing: -0.05em; }
        a { color: inherit; text-decoration: none; border-bottom: 1px solid currentColor; }
        a:hover { background: #f9fafb; color: #000; }
        
        .container { padding: 4vw; }
        .porthole { border-radius: 50%; object-fit: cover; background: #1f2937; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Content will go here -->
    </div>
</body>
</html>
```

- [ ] **Step 2: Commit base structure**

```bash
git add index.html
git commit -m "feat: initial scaffold with NASA typography and base styles"
```

---

### Task 2: Hero Section Implementation

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Implement the giant typography Hero Section**

```html
<!-- Inside .container -->
<section class="hero" style="min-height: 90vh; display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden;">
    <h1 style="font-size: 10vw; z-index: 2;">EXPLORING<br>THE UNKNOWN<br>FOR SEVENTY<br>YEARS</h1>
    
    <!-- Portholes -->
    <img src="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=800&q=80" 
         class="porthole" 
         style="position: absolute; width: 30vw; height: 30vw; top: 0; right: 5vw; z-index: 1;" 
         alt="Earth from space">
    
    <img src="https://images.unsplash.com/photo-1454789548928-9efd52dc4031?auto=format&fit=crop&w=800&q=80" 
         class="porthole" 
         style="position: absolute; width: 20vw; height: 20vw; bottom: 10vh; right: 25vw; z-index: 3;" 
         alt="Astronaut">
</section>
```

- [ ] **Step 2: Add responsive adjustments for Hero**

```css
/* Inside <style> */
@media (max-width: 768px) {
    .hero h1 { font-size: 15vw; }
    .hero .porthole { width: 40vw !important; height: 40vw !important; }
}
```

- [ ] **Step 3: Commit hero section**

```bash
git add index.html
git commit -m "feat: add giant brutalist hero section with porthole images"
```

---

### Task 3: Projects List - Mission Data Generation

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Create the grid structure for the project list**

```css
/* Inside <style> */
.project-list { margin-top: 10vh; border-top: 2px solid #1f2937; }
.project-row { 
    display: grid; 
    grid-template-columns: 1fr 3fr; 
    padding: 4vh 0; 
    border-bottom: 1px solid #1f2937; 
    align-items: start;
}
.project-number { font-size: 8vw; color: #1f2937; font-weight: 900; line-height: 1; }
.project-content h2 { font-size: 3vw; margin-bottom: 1rem; }
.project-report { max-width: 600px; font-size: 1rem; color: #d1d5db; white-space: pre-wrap; margin-bottom: 1.5rem; font-family: 'Inter', sans-serif; font-weight: 400; }
```

- [ ] **Step 2: Populate all 13 missions (Batch 1: 01-07)**

```html
<!-- Inside .project-list -->
<div class="project-row">
    <div class="project-number">01</div>
    <div class="project-content">
        <h2>EXPLORER 1 (1958)</h2>
        <div class="project-report">MISSION STATUS: SUCCESSFUL. 
LAUNCH VEHICLE: JUNO I. 
OBJECTIVE: ORBITAL DEPLOYMENT. 
FINDINGS: DISCOVERY OF VAN ALLEN RADIATION BELTS. 
FIRST U.S. SATELLITE TO REACH EARTH ORBIT.</div>
        <a href="#">> ACCESS DATA</a>
    </div>
</div>
<!-- ... Repeat for 02 to 07 ... -->
```

- [ ] **Step 3: Populate all 13 missions (Batch 2: 08-13)**

```html
<!-- ... Repeat for 08 to 13 ... -->
<div class="project-row">
    <div class="project-number">13</div>
    <div class="project-content">
        <h2>ARTEMIS I (2022)</h2>
        <div class="project-report">MISSION STATUS: SUCCESSFUL. 
VEHICLE: SPACE LAUNCH SYSTEM (SLS). 
CAPSULE: ORION. 
OBJECTIVE: LUNAR ORBIT TEST FLIGHT. 
RESULTS: RECORD-BREAKING DISTANCE FROM EARTH FOR HUMAN-RATED CRAFT.</div>
        <a href="#">> ACCESS DATA</a>
    </div>
</div>
```

- [ ] **Step 4: Commit project list**

```bash
git add index.html
git commit -m "feat: implement mission list with all 13 historical projects"
```

---

### Task 4: Final Refinement & Accessibility

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add a footer and global layout polish**

```html
<footer style="padding: 8vh 0; border-top: 2px solid #1f2937; color: #4b5563; font-size: 0.8rem; text-transform: uppercase;">
    <p>NASA 70TH ANNIVERSARY / FOR INFORMATIONAL PURPOSES ONLY / SYSTEM STATUS: NOMINAL</p>
</footer>
```

- [ ] **Step 2: Final CSS check for "porthole" shapes and brutalist spacing**

```css
.porthole { 
    filter: grayscale(100%) contrast(120%); 
    transition: filter 0.5s ease;
}
.porthole:hover { filter: grayscale(0%) contrast(100%); }
```

- [ ] **Step 3: Final verification and commit**

```bash
git add index.html
git commit -m "style: final brutalist polish, hover effects and footer"
```
