

## Plan: Hide Elfsight Branding with CSS

### Change: `src/index.css`

Add a global CSS rule to hide the Elfsight branding link that appears at the bottom of the widget:

```css
a[href*="elfsight.com"] {
  display: none !important;
}
```

This targets any anchor element linking to elfsight.com and hides it. Simple, no component changes needed.

