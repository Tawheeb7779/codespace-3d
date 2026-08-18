---
name: CodeSpace 3D Technical Design System
colors:
  surface: '#0e131d'
  surface-dim: '#0e131d'
  surface-bright: '#343944'
  surface-container-lowest: '#090e18'
  surface-container-low: '#171c26'
  surface-container: '#1b202a'
  surface-container-high: '#252a35'
  surface-container-highest: '#303540'
  on-surface: '#dee2f1'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dee2f1'
  inverse-on-surface: '#2b303b'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#a4c9ff'
  on-secondary: '#00315d'
  secondary-container: '#0267b8'
  on-secondary-container: '#d6e5ff'
  tertiary: '#ffb786'
  on-tertiary: '#502400'
  tertiary-container: '#df7412'
  on-tertiary-container: '#461f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#d4e3ff'
  secondary-fixed-dim: '#a4c9ff'
  on-secondary-fixed: '#001c39'
  on-secondary-fixed-variant: '#004883'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#0e131d'
  on-background: '#dee2f1'
  surface-variant: '#303540'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 20px
  container-max: 1440px
---

## Brand & Style
The design system is engineered for high-performance spatial programming environments. The aesthetic is defined by **Futuristic Minimalism** with a **Glassmorphic Technical** overlay. It evokes the feeling of a high-end physical laboratory console—precise, dark, and immersive. 

The visual narrative relies on depth created through light-source simulation rather than heavy shadows. Components should feel like machined glass interfaces, utilizing semi-transparent layers and subtle internal glows to denote active states. Every interaction must feel intentional, professional, and sophisticated, avoiding unnecessary flourish in favor of technical clarity.

## Colors
This design system utilizes a "Deep Space" palette. The foundation is a multi-layered dark blue-black that prevents pure-black crushing on OLED screens while maintaining high contrast for code legibility.

- **Primary Accent (#3B82F6):** Used for primary actions, active states, and critical paths.
- **Bright Accent (#60A5FA):** Used for hover states and subtle light-leak effects on glass edges.
- **Surface Hierarchy:** Depth is communicated through increasing brightness. The deeper the background, the further back it sits in the Z-space.
- **Glass Effects:** Use the `border_subtle` for all container edges to simulate the "rim-light" of a physical glass panel.

## Typography
The typography system prioritizes legibility in low-light environments. **Inter** provides a clean, neutral canvas for the interface, while **JetBrains Mono** is utilized for all technical data, coordinates, and code snippets to reinforce the developer-centric nature of the tool.

- **Hierarchy:** Use `label-caps` for section headers and small metadata to create a "blueprint" feel.
- **Contrast:** Always use `text_primary` for headlines and `text_secondary` for long-form body copy to reduce eye strain.
- **Code Rendering:** Ensure anti-aliasing is set to `grayscale` for mono fonts to maintain sharpness on dark backgrounds.

## Layout & Spacing
The layout follows a strict **4px baseline grid** to ensure mathematical precision across all technical components. 

- **Grid System:** A 12-column fluid grid is used for the main workspace, but sidebars and utility panels should be fixed-width (e.g., 280px or 320px) to prevent layout shifting during intensive 3D rendering tasks.
- **Density:** Provide a "Compact" and "Default" spacing mode. Developer-heavy views (like logs or file trees) should use 4px/8px increments, while marketing or landing pages should use 24px/40px increments.
- **Safe Zones:** Always maintain a 24px margin from the edge of the viewport for technical data overlays.

## Elevation & Depth
Elevation in this design system is achieved through **Backdrop Filtering** and **Luminous Outlines** rather than traditional drop shadows.

- **Level 0 (Base):** Background Base (#05070D). No border.
- **Level 1 (Panels):** Background Surface (#090D16). 1px solid border at 8% opacity.
- **Level 2 (Modals/Popovers):** Surface Elevated (#111827). 1px solid border at 12% opacity with a `backdrop-filter: blur(12px)`.
- **Active State Glow:** When an element is focused or active, apply a 2px outer glow using `accent_glow` and increase the border opacity to 30%.

## Shapes
The shape language is "Soft-Technical." Sharp corners are avoided to prevent a dated look, but large radii are avoided to maintain a professional, space-efficient feel.

- **Base Radius:** 4px (0.25rem) for inputs, small buttons, and tags.
- **Large Radius:** 8px (0.5rem) for cards and main containers.
- **Interactive Elements:** Buttons should never be fully pill-shaped; they should maintain the 4px radius to feel structural.

## Components
Consistent styling for the core technical toolkit:

- **Buttons:** Primary buttons use a solid blue background with a white label. Secondary buttons use a transparent background with a 1px `border_subtle` and a subtle hover transition that increases background brightness.
- **Input Fields:** Use the Surface Elevated color. On focus, the border transitions to Primary Accent and a faint blue glow appears.
- **Chips / Tags:** Monospaced font. Use a dark grey background with a 1px border. For status tags (e.g., 'Compiling'), add a pulsing 4px dot.
- **Cards:** No shadows. Use 1px `border_subtle`. Header area should be separated by a thin horizontal line.
- **Code Blocks:** Background should be slightly darker than the surrounding surface. Line numbers should be `muted_text`. Highlighted lines use a 10% opacity primary accent background.
- **Technical Lists:** Use subtle 1px dividers. Hovering over a list item should slightly brighten the background and show a chevron in `text_secondary`.