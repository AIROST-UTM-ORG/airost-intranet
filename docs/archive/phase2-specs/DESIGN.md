# Airost Design System

## Scope
This document captures design values observed in the Documentation screen. Token names are suggested; values come from the selected design. Measurements are in pixels.

> **Note:** Responsive layouts, hover states, focus states, disabled states, and error treatments are not defined in this screen.

---

## 1. Visual Language
* White workspace with a black navigation sidebar.
* Rounded typography and softly rounded controls.
* Coral page headings and green primary actions.
* Neutral text hierarchy with subtle borders and shadows.
* Repeated horizontal cards with details on the left and actions on the right.

---

## 2. Colors
Hex values are rounded to the nearest 8-bit RGB value.

| Suggested Token | Value | Observed Usage |
| :--- | :--- | :--- |
| `background-page` | `#FFFFFF` | Page background |
| `surface-card` | `#FFFFFF` | Documentation cards |
| `background-navigation` | `#000000` | Sidebar and inactive navigation items |
| `background-navigation-active` | `#ADADAD` | Selected navigation item |
| `background-action-secondary` | `#F5F5F5` | Open buttons |
| `text-primary` | `#171717` | Card titles, section heading, project metadata |
| `text-secondary` | `#686868` | Descriptions, counts, search placeholder |
| `text-inverse` | `#FFFFFF` | Navigation labels and primary action label |
| `accent-heading` | `#FF7B7B` | Page title |
| `accent-action` | `#0DC414` | Add button |
| `border-default` | `#DEDEDE` | Search field outline |
| `shadow-color` | Black at ~15% opacity | Cards and Add button |

*Do not infer success, warning, error, or other semantic palettes from this screen.*

---

## 3. Typography
All observed text uses regular weight.

| Role | Family | Size (px) | Line Height | Color |
| :--- | :--- | :--- | :--- | :--- |
| **Page title** | Varela Round | `48` | 115% / ~55.2 | Heading accent (`accent-heading`) |
| **Card title** | Varela Round | `28` | Auto | Primary (`text-primary`) |
| **Sidebar label** | Poppins | `24` | Auto | Inverse (`text-inverse`) |
| **Section heading** | Varela Round | `20` | Auto | Primary (`text-primary`) |
| **Search placeholder** | Varela Round | `16` | Auto | Secondary (`text-secondary`) |
| **Secondary button label** | Varela Round | `15` | Auto | Primary (`text-primary`) |
| **Primary button label** | Outfit | `15` | Auto | Inverse (`text-inverse`) |
| **Metadata and totals** | Varela Round | `14` | Auto | Primary or secondary |
| **Supporting description** | Varela Round | `14` | 150% / 21 | Secondary (`text-secondary`) |

### Text Rules
* Use **Varela Round** for workspace headings and content.
* Use **Poppins** for sidebar labels.
* Use **Outfit** for the uppercase primary action label.
* Letter spacing is `0` except the primary action label, which uses approximately `0.6px`.
* Preserve the distinction between primary project metadata and secondary document counts.
* Descriptions use sentence case; the primary Add action uses uppercase.

---

## 4. Layout and Spacing

### Observed Desktop Composition
| Property | Value (px) |
| :--- | :--- |
| **Reference screen** | $1440 \times 1024$ |
| **Outer padding (top / right / bottom / left)** | `39 / 81 / 39 / 22` |
| **Sidebar** | $311 \times 946$ |
| **Sidebar-to-workspace gap** | `67` |
| **Workspace width** | `959` |
| **Workspace top padding** | `24` |
| **Workspace section gap** | `28` |
| **Heading-to-supporting-text gap** | `12` |
| **Card-list gap** | `24` |

*These dimensions describe the observed desktop screen, not confirmed responsive constraints.*

### Reusable Spacing Values
| Value (px) | Usage |
| :--- | :--- |
| `8` | Card detail spacing; button icon-to-label gap |
| `12` | Search icon-to-text gap; metadata gap; heading support gap |
| `16` | Search horizontal padding |
| `18` | Secondary button horizontal padding; card action-stack gap |
| `24` | Card padding; card-list gap; primary button horizontal padding |
| `28` | Workspace section spacing |

*The sidebar uses uneven item placement; a single navigation spacing token cannot be established from this screen.*

---

## 5. Radius, Borders, and Elevation

### Corner Radii
* **`6px`**: Search field and secondary buttons.
* **`10px`**: Sidebar, navigation items, and documentation cards.
* **`30px`**: Primary Add button, producing a pill shape at its observed height.

### Borders
* **Search field**: `1px solid #DEDEDE`.
* **Cards and buttons**: No visible border.

### Shadows
| Surface | X Offset | Y Offset | Blur | Spread | Color |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Documentation card** | `0` | `4` | `5` | `0` | Black, ~15% |
| **Primary action** | `0` | `4` | `16` | `0` | Black, ~15% |

---

## 6. Component Rules

### Navigation Sidebar
* Black rounded container with a logo above the navigation.
* Navigation items measure $285 \times 80$.
* Labels and icons are white.
* Selected item uses a gray background while retaining white content.
* Labels share a consistent left alignment.
* Most icon containers are approximately $40 \times 40$; the logout icon is smaller.
* Navigation icons and logo are image assets in the observed design.

### Page Header
* Page title on the left; Add action on the right.
* Supporting description beneath the title row.
* Primary action measures $106 \times 46$.
* Primary action uses green fill, white label, a plus icon, and pill rounding.
* Plus icon container: $17 \times 17$; icon-to-label gap: `8px`.

### Search Field
* Full workspace width and `50px` height.
* `16px` horizontal padding and `6px` corner radius.
* Leading search icon container: $20 \times 20$.
* `12px` gap between icon and placeholder.
* Placeholder uses secondary text color.
* No separate filled background is applied.

### List Heading
* Section title on the left.
* Space and document totals on the right.
* Totals use the smaller secondary text style.

### Documentation Card
* Observed size: $959 \times 149$.
* White surface, `10px` radius, and subtle shadow.
* `24px` padding on all sides.
* Horizontal layout with `24px` between details and actions.
* **Detail stack contains:**
  * Title.
  * Project association and document count.
  * Supporting description.
* Detail-stack spacing: `8px`.
* Metadata-row spacing: `12px`.
* Support both project-linked and standalone spaces.
* Use a middle dot to separate metadata.

### Card Actions
* Right-side vertical action stack.
* Overflow icon appears above the Open button and aligns right.
* Overflow icon container: $26 \times 26$.
* Action-stack gap: `18px`.
* Open button measures $76 \times 40$.
* Open button uses a light gray fill, dark label, `6px` radius, and `18px` horizontal padding.

---

## 7. Implementation Gaps
The following require separate design decisions:
* Responsive breakpoints and mobile navigation.
* Hover, pressed, focus, disabled, and loading states.
* Empty lists, no-result search, errors, and long-content handling.
* Overflow menu presentation and behavior.
* **Accessibility treatments:** Verify contrast before adopting the observed coral heading, green button, and gray active navigation combination.