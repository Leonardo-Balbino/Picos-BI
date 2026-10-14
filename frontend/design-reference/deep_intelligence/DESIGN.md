---
name: Deep Intelligence
colors:
  surface: '#faf9fc'
  surface-dim: '#dadadc'
  surface-bright: '#faf9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f6'
  surface-container: '#eeedf0'
  surface-container-high: '#e8e8eb'
  surface-container-highest: '#e3e2e5'
  on-surface: '#1a1c1e'
  on-surface-variant: '#4a454e'
  inverse-surface: '#2f3033'
  inverse-on-surface: '#f1f0f3'
  outline: '#7b757f'
  outline-variant: '#ccc4cf'
  surface-tint: '#6d528c'
  primary: '#2f154c'
  on-primary: '#ffffff'
  primary-container: '#452c63'
  on-primary-container: '#b395d4'
  inverse-primary: '#d9bafb'
  secondary: '#006c4c'
  on-secondary: '#ffffff'
  secondary-container: '#7ef9c5'
  on-secondary-container: '#007351'
  tertiary: '#331e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#4f3200'
  on-tertiary-container: '#d79426'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#eedbff'
  primary-fixed-dim: '#d9bafb'
  on-primary-fixed: '#270d44'
  on-primary-fixed-variant: '#543b73'
  secondary-fixed: '#7ef9c5'
  secondary-fixed-dim: '#60dcaa'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005138'
  tertiary-fixed: '#ffddb4'
  tertiary-fixed-dim: '#ffb952'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#633f00'
  background: '#faf9fc'
  on-background: '#1a1c1e'
  surface-variant: '#e3e2e5'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-display:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  sidebar-width: 260px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style
The design system is engineered for a premium Business Intelligence environment where clarity and authority are paramount. The brand personality is **Sober, Executive, and Analytical**. It targets high-level decision-makers who require data density without cognitive overload.

The visual style follows a **Modern Corporate** aesthetic with a strong emphasis on **Functional Minimalism**. It utilizes high-quality geometric typography and a structured grid to convey reliability. The contrast between the deep purple brand elements and the vibrant green functional accents creates a "High-Value" atmosphere, where insights are highlighted against a clean, stable background.

## Colors
This design system uses a strategic hierarchy of color to direct user attention:
- **Primary Brand (#452C63):** Used for structural navigation (Sidebar) and primary headings to establish authority.
- **Action/Success Gradient:** A vibrant green gradient reserved exclusively for positive outcomes, primary CTA buttons, and reaching targets.
- **Background & Surfaces:** A soft grey-lavender background (#F5F4F7) provides a low-strain canvas for pure white cards (#FFFFFF).
- **Chart Palette:** A specialized 6-color categorical sequence designed for maximum differentiation in complex data visualizations.

## Typography
The system relies on **Montserrat** for its geometric precision and modern feel. 
- **Headings:** Always use Bold or Semi-Bold weights to create a clear information hierarchy against the purple text color (#2E1F42).
- **Data & Numerals:** Essential for BI, all numeric displays must use `font-variant-numeric: tabular-nums` to ensure columns of figures align perfectly for easy scanning.
- **Labels:** Small labels use uppercase with slight letter spacing to maintain legibility at 12px.

## Layout & Spacing
The layout follows a strict **8px grid system**. 
- **Structure:** A fixed sidebar of 260px is anchored to the left. The main content area is fluid but maintains a maximum readable width of 1440px.
- **Dashboard Grid:** Cards should utilize 24px (lg) spacing for external margins and 16px (md) for internal padding.
- **Mobile Adaptivity:** On mobile devices, the sidebar collapses into a hamburger menu, and the 24px gutters reduce to 16px to maximize data real estate.

## Elevation & Depth
Depth is achieved through **Tonal Layering** rather than heavy shadows.
- **Level 0:** The Background (#F5F4F7) is the lowest layer.
- **Level 1:** White Cards (#FFFFFF) use a subtle "Shadow-SM" (0px 2px 4px rgba(46, 31, 66, 0.05)) to separate from the background.
- **Level 2:** Overlays, Dropdowns, and Modals use a more pronounced shadow (0px 10px 20px rgba(46, 31, 66, 0.1)) and 1px border (#E1DFE5).
- **Sidebar:** The purple sidebar is treated as a solid monolith with no shadow, acting as the structural anchor.

## Shapes
The shape language is refined and consistent. 
- **Cards & Primary Containers:** Use a fixed **14px** corner radius.
- **Buttons & Inputs:** Use an 8px (rounded-md) radius to maintain a professional look that is softer than sharp edges but sharper than pills.
- **Active Indicators:** The sidebar active state uses a 4px wide vertical pill-bar on the extreme left of the active menu item.

## Components
- **Sidebar:** Background #452C63. Text/Icons should be at 70% opacity white, moving to 100% white on active. Active item features a #3FBF8F vertical bar (4px width) on the left edge.
- **Buttons:**
    - *Primary:* Uses the Green Gradient, white text, 8px radius.
    - *Secondary:* Transparent background, #452C63 border and text.
- **Cards:** White background, 14px radius, Shadow-SM. Used for grouping metrics, charts, and table views.
- **Global Filter Bar:** Positioned at the top of the content area. White background or subtle light grey (#EBE9F0) with 8px radius.
- **Inputs:** White background, #D1CFD7 border. On focus, the border changes to #452C63 with a 2px outer glow of the same color at 10% opacity.
- **Icons:** Use thin-stroke line icons (Bootstrap Icons) at 1.25pt stroke weight to maintain the sophisticated aesthetic.
- **KPI Indicators:** Positive trends in #3FBF8F, negative in #E05260. Always accompanied by a small trend icon.