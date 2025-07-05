# Genux SDK – Styling Guide
_Last updated: July 2025_

## 1. Why this document exists  
Genux ships **logic and UI**. Without the correct style sheets your UI will degrade (e.g. the un-styled table bug). This guide tells you **exactly which CSS must be loaded, in what order, and how to extend it safely**.

---

## 2. Mandatory CSS imports  

| Layer | Source | Purpose | Where it is pulled in |
|-------|--------|---------|-----------------------|
| **Base** | `@crayonai/react-ui/styles/index.css` | Complete design system – tables, buttons, typography, layout primitives. | **Imported automatically** at the top of `src/index.ts` and `src/components/Genux.tsx`. |
| **Genux overrides** | `./thesys-css.css` | Minor tweaks / additional C1-specific classes (image wrappers, markdown, think steps). | Imported in `Genux.tsx` **after** the base sheet. |

**Do not remove either import**. If you tree-shake CSS or configure side-effects incorrectly, tables and other C1 components will break.

---

## 3. Load order & precedence  

1. `@crayonai/react-ui/styles/index.css` (lowest specificity)  
2. Tailwind utilities from the host app (if any)  
3. `thesys-css.css` (higher specificity – overrides)  
4. Consumer overrides (your own `.css`/CSS-in-JS)

Keep this sequence to avoid accidental style clashes.

---

## 4. Build & bundling requirements  

Genux is pre-built with **tsup** and the following guarantees:

| Config key | Value | Reason |
|------------|-------|--------|
| `"sideEffects": ["*.css"]` | Stops CSS from being tree-shaken by consumers’ bundlers. |
| `"injectStyle": true` + esbuild `loader: { ".css": "css" }` | Ensures CSS imported in source is emitted into the bundle. |

### For consumer apps  
No extra config is needed if you use **Vite**, **Next.js (App Router)** or **CRA**. Just import Genux:

```tsx
import { Genux } from 'genux-sdk';
```

If your bundler prunes side-effectful imports, whitelist the Genux package or import the base sheet manually:

```ts
import '@crayonai/react-ui/styles/index.css';
```

---

## 5. Theming & CSS variables  

Genux leverages **Crayon theme tokens** exposed as CSS custom properties:

```
--crayon-primary-text
--crayon-secondary-text
--crayon-rounded-m
--crayon-spacing-m
...
```

You can override them via:

```css
:root {
  --crayon-primary-text: #1e293b;
  --crayon-accent: #6366f1;
}
```

or by passing a partial theme object:

```tsx
<Genux options={{ theme: { colors: { primary: '#6366f1' } } }} />
```

---

## 6. Tailwind CSS usage  

Genux itself **does not bundle Tailwind** but is compatible with Tailwind utilities used by the host. Recommended configuration:

```js
// tailwind.config.ts
content: [
  './node_modules/genux-sdk/dist/**/*.js',
  './src/**/*.{js,ts,jsx,tsx}',
]
```

This lets Tailwind detect classes present in Genux default components.

---

## 7. Component-level style overrides  

Every public component accepts a `className` prop plus the **Component Override System**.

Example – custom table stripe:

```tsx
const StripedTable: React.FC<ChatMessageProps> = (p) => (
  <DefaultChatMessage
    {...p}
    className="odd:bg-gray-50 even:bg-white"
  />
);

<Genux options={{ components: { ChatMessage: StripedTable } }} />
```

---

## 8. Adding new CSS safely  

1. Create a file beside your override component (e.g. `MyButton.css`).  
2. Import **after** Genux:

```ts
import '@crayonai/react-ui/styles/index.css';
import 'genux-sdk/dist/thesys-css.css';
import './MyButton.css';
```

3. Use BEM or Tailwind to avoid name collisions (Genux uses `.c1-*` and `.crayon-*` prefixes).

---

## 9. Troubleshooting checklist  

| Symptom | Probable cause | Fix |
|---------|----------------|-----|
| Tables render unstyled / no borders | Base Crayon CSS missing | Ensure `@crayonai/react-ui/styles/index.css` is imported and not tree-shaken. |
| Fonts/colors wrong in fullscreen mode | CSS variables overridden incorrectly | Verify you haven’t shadowed `--crayon-*` tokens. |
| Custom styles not applied | Load order wrong | Import your CSS **after** Genux. |
| Build warns “side-effects excluded” | Consumer bundler removed CSS | Add `"sideEffects": ["*.css"]` in your app’s `package.json` or import styles manually. |

---

## 10. Version compatibility  

| Genux version | Required `@crayonai/react-ui` | Notes |
|---------------|-------------------------------|-------|
| `>=0.1.0`     | `^0.7.9`                      | Full table styling support |

---

### Keep this file updated when:  
- Upgrading `@crayonai/react-ui`  
- Adding / deleting internal CSS files  
- Changing build tooling

Happy styling!  
— Genux Team
