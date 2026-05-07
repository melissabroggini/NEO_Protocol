# NASA 70th - Interactive Text Displacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a high-performance interactive hero section where draggable images physically displace individual letters of the title using the Pretext framework.

**Architecture:** 
1. **Pretext Engine:** Measures and positions text characters.
2. **Atomizer:** Replaces static `h1` with absolutely positioned spans.
3. **Physics Engine:** `requestAnimationFrame` loop for collision and spring-back logic.
4. **Draggable System:** Pointer events for image manipulation.

**Tech Stack:** HTML5, CSS3, Vanilla JS, Pretext (Canvas-based measurements).

---

### Task 1: Pretext Integration & Character Atomization

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Import Pretext and define the atomizer function**

```javascript
/* Inside a <script> tag at the end of body */
// Mocking Pretext core if not available via CDN for measurement logic
// In a real scenario, we'd include the pretext script.
const Pretext = {
    prepare: (text, font) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = font;
        return text.split('').map(char => ({
            char,
            width: ctx.measureText(char).width
        }));
    },
    layout: (prepared, maxWidth, lineHeight) => {
        let x = 0, y = 0;
        return prepared.map(item => {
            if (item.char === '\n' || x + item.width > maxWidth) {
                x = 0; y += lineHeight;
            }
            const pos = { x, y, char: item.char };
            x += item.width;
            return pos;
        });
    }
};

function atomizeTitle() {
    const title = document.querySelector('.hero h1');
    const text = title.innerText;
    const font = "900 10vw Inter, sans-serif";
    const prepared = Pretext.prepare(text, font);
    const layout = Pretext.layout(prepared, window.innerWidth * 0.9, window.innerWidth * 0.085);
    
    title.innerHTML = '';
    title.style.position = 'relative';
    
    return layout.map(item => {
        const span = document.createElement('span');
        span.innerText = item.char;
        span.style.position = 'absolute';
        span.style.left = `${item.x}px`;
        span.style.top = `${item.y}px`;
        span.style.willChange = 'transform';
        title.appendChild(span);
        return { el: span, x: item.x, y: item.y, vx: 0, vy: 0, curX: 0, curY: 0 };
    });
}
```

- [ ] **Step 2: Commit atomization logic**

```bash
git add index.html
git commit -m "feat: implement character atomization using Pretext measurement logic"
```

---

### Task 3: Draggable Image System

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Implement basic drag-and-drop for portholes**

```javascript
/* Add to script */
const draggables = [];
document.querySelectorAll('.porthole').forEach(el => {
    let isDragging = false;
    let offset = { x: 0, y: 0 };
    
    const data = {
        el,
        x: el.offsetLeft,
        y: el.offsetTop,
        radius: el.offsetWidth / 2
    };
    
    el.style.cursor = 'grab';
    
    el.addEventListener('pointerdown', e => {
        isDragging = true;
        el.style.cursor = 'grabbing';
        offset.x = e.clientX - data.x;
        offset.y = e.clientY - data.y;
        el.setPointerCapture(e.pointerId);
    });
    
    window.addEventListener('pointermove', e => {
        if (!isDragging) return;
        data.x = e.clientX - offset.x;
        data.y = e.clientY - offset.y;
        el.style.left = `${data.x}px`;
        el.style.top = `${data.y}px`;
    });
    
    window.addEventListener('pointerup', () => {
        isDragging = false;
        el.style.cursor = 'grab';
    });
    
    draggables.push(data);
});
```

- [ ] **Step 2: Update porthole styles for better dragging**

```css
/* Update CSS */
.porthole {
    position: absolute; /* Ensure they are absolute */
    width: 20vw; /* Smaller initial size */
    height: 20vw;
    touch-action: none; /* Prevent scrolling during drag */
}
```

- [ ] **Step 3: Commit draggable system**

```bash
git add index.html
git commit -m "feat: add pointer-based draggable system for porthole images"
```

---

### Task 4: Physics Engine (Displacement & Spring)

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Implement the animation loop**

```javascript
/* Add to script */
function updatePhysics(letters, draggables) {
    const springK = 0.15;
    const friction = 0.8;
    const influenceRadius = window.innerWidth * 0.15;

    letters.forEach(letter => {
        let dx = 0;
        let dy = 0;

        draggables.forEach(drag => {
            const lx = letter.x + letter.curX + 20; // Letter center approx
            const ly = letter.y + letter.curY + 40;
            const dist = Math.hypot(drag.x + drag.radius - lx, drag.y + drag.radius - ly);

            if (dist < influenceRadius) {
                const force = (influenceRadius - dist) / influenceRadius;
                const angle = Math.atan2(ly - (drag.y + drag.radius), lx - (drag.x + drag.radius));
                dx += Math.cos(angle) * force * 50;
                dy += Math.sin(angle) * force * 50;
            }
        });

        // Spring back to home
        const ax = (0 - letter.curX) * springK + dx;
        const ay = (0 - letter.curY) * springK + dy;

        letter.vx = (letter.vx + ax) * friction;
        letter.vy = (letter.vy + ay) * friction;

        letter.curX += letter.vx;
        letter.curY += letter.vy;

        letter.el.style.transform = `translate(${letter.curX}px, ${letter.curY}px)`;
    });

    requestAnimationFrame(() => updatePhysics(letters, draggables));
}

// Initialization
const letters = atomizeTitle();
updatePhysics(letters, draggables);
```

- [ ] **Step 2: Commit physics engine**

```bash
git add index.html
git commit -m "feat: implement physics-based text displacement and spring-back"
```

---

### Task 5: Final Polish & Responsive Re-Atomization

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Handle window resize**

```javascript
window.addEventListener('resize', () => {
    // Simply reload for prototype or re-run atomizer
    location.reload(); 
});
```

- [ ] **Step 2: Commit final interactive prototype**

```bash
git add index.html
git commit -m "style: final interactive polish and resize handling"
```
