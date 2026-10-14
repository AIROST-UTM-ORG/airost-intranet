# Airost Documentation Feature — Screen Specifications (`SCREEN_SPEC.md`)

> **Status:** Complete (14 of 14 screens specified). Designed for 100% visual and behavioral fidelity when referenced by an AI Agent alongside `DESIGN.md`.

---

## 1. Global Layout & Shared Components

All 14 screens in the Documentation feature share a consistent desktop frame and navigation architecture defined in `DESIGN.md`.

### 1.1 Application Frame & Navigation Sidebar

* **Viewport / Reference Frame:** $1440 \times 1024\text{ px}$, white background (`#FFFFFF`).
* **Outer Padding:** Top `39px`, Right `81px`, Bottom `39px`, Left `22px`.
* **Navigation Sidebar:**
  * **Dimensions:** $311 \times 946\text{ px}$, background `#000000`, border-radius `10px`.
  * **Brand Logo:** "Airost" logo centered near top with multicolored circular swirl icon over the "o".
  * **Navigation Items ($285 \times 80\text{ px}$, border-radius `10px`, `Poppins` `24px` Regular `#FFFFFF`):**
    1. **Dashboard** (User circle icon) — Inactive (`#000000`)
    2. **Projects** (Checklist/edit icon) — Inactive (`#000000`)
    3. **Events** (Calendar icon) — Inactive (`#000000`)
    4. **Documentation** (Document stack icon) — **Active across all 14 screens** (Background `#ADADAD`, text/icon `#FFFFFF`)
    5. **Log Out** (Exit arrow icon, smaller icon container) — Inactive (`#000000`)
* **Sidebar-to-Workspace Gap:** `67px`.
* **Workspace Container:** `959px` width, top padding `24px`.

### 1.2 Shared UI Primitives

| Component | Visual & Structural Specification |
| :--- | :--- |
| **Back Navigation Link** | Placed above the Page Title on sub-pages. Left arrow icon (`←`, `14px`) + `8px` gap + label (`Varela Round`, `14px`, `#686868`). No underline; clickable row. |
| **Access Badge Chip** | Placed on the right side of the Space Header metadata row. Height `30px`, padding `0 12px`, background `#F5F5F5`, border-radius `6px`, `Varela Round` `13px` `#686868`. Variants:<br>• **Update Access:** Pencil outline icon (`✎`, `12px`) + `6px` gap + `"Update access"`.<br>• **Read-only:** Lock outline icon (`🔒`, `12px`) + `6px` gap + `"Read-only"`. |
| **Form Container Card** | Full workspace width (`959px`), white background (`#FFFFFF`), border-radius `10px`, shadow `0px 4px 5px rgba(0, 0, 0, 0.15)`, padding `28px` to `32px`. |
| **Form Label** | `Varela Round`, `14px`, `#171717`. Required fields append ` *` in `#171717`. Bottom margin `8px` before input. |
| **Text Input / Select Trigger** | Height `46px`, border `1px solid #DEDEDE`, border-radius `6px`, horizontal padding `16px`. Text: `Varela Round`, `15px`, `#171717` (Placeholder: `#686868`). Select trigger includes a right-aligned downward chevron (`⌄`, `#686868`). |
| **Popover Dropdown Menu** | White surface (`#FFFFFF`), border-radius `8px`, subtle border (`1px solid #F0F0F0`), shadow `0px 4px 16px rgba(0, 0, 0, 0.15)`, vertical padding `8px`. Each menu item is `40px` height, `16px` horizontal padding, `10px` icon-to-label gap, `Varela Round` `14px` `#171717`. |
| **Empty State Card** | Width `959px`, height `~300px–330px`, white surface (`#FFFFFF`), border-radius `10px`, shadow `0px 4px 5px rgba(0, 0, 0, 0.15)`. Centered vertical stack: `56x56px` circular light-gray icon badge (`#F5F5F5`) containing a `24x24px` outline icon (`#686868`), `22px` title (`Varela Round`, `#171717`), `14px` description (`Varela Round`, `#686868`, max-width `520px`, center-aligned), and an optional centered green pill CTA button (`#0DC414`). |
| **Info Banner** | Full container width, height `44px`, background `#F5F5F5`, border-radius `6px`, horizontal padding `16px`. Left-aligned info circle icon (`ⓘ`, `16px`, `#686868`) + `10px` gap + text: `"Document access and editing permissions are managed by the linked service."` (`Varela Round`, `14px`, `#686868`). |

---

## 2. Screen-by-Screen Specifications (14 Screens)

### Screen 1: `Documentation — All spaces.png`

**Purpose:** Default populated state showing both project-linked and standalone documentation spaces.

* **Page Header:**
  * **Left:** Title `"Documentation"` (`Varela Round`, `48px`, `#FF7B7B`, line-height `115%`).
  * **Right:** Primary pill button `"+ ADD"` ($106 \times 46\text{ px}$, background `#0DC414`, radius `30px`, shadow `0 4px 16px rgba(0,0,0,0.15)`, `17x17px` `+` icon, `8px` gap, `Outfit` `15px` uppercase `#FFFFFF`, letter-spacing `0.6px`).
  * **Subtitle (`12px` below title):** `"Keep project knowledge together. Store and open links to Google Docs and Drive."` (`Varela Round`, `14px`, `#686868`).
* **Search Field (`28px` below header):**
  * $959 \times 50\text{ px}$, border `1px solid #DEDEDE`, radius `6px`, `16px` horizontal padding.
  * Leading magnifying glass icon ($20 \times 20\text{ px}$, `#686868`) + `12px` gap + placeholder `"Search documentation spaces"` (`Varela Round`, `16px`, `#686868`).
* **List Heading (`28px` below search):**
  * **Left:** `"Documentation Spaces"` (`Varela Round`, `20px`, `#171717`).
  * **Right:** `"4 spaces · 20 documents"` (`Varela Round`, `14px`, `#686868`).
* **Documentation Cards Stack (`24px` vertical gap between cards):**
  * Each card is $959 \times 149\text{ px}$, `#FFFFFF`, radius `10px`, padding `24px`, shadow `0 4px 5px rgba(0,0,0,0.15)`.
  * **Right Action Stack (identical on all 4 cards):** Top-right horizontal 3-dot overflow icon (`⋯`, $26 \times 26\text{ px}$, `#171717`), `18px` vertical gap, secondary button `"Open"` ($76 \times 40\text{ px}$, background `#F5F5F5`, radius `6px`, `Varela Round` `15px` `#171717`).
  * **Card 1:**
    * Title: `"Engineering Handbook"` (`28px`, `#171717`)
    * Metadata: `"Project: Airost Intranet"` (`#171717`) + `·` + `"8 documents"` (`#686868`)
    * Description: `"Technical references and delivery guides for the Airost Intranet team."` (`14px`, `#686868`)
  * **Card 2:**
    * Title: `"Property App Handbook"`
    * Metadata: `"Project: Property App"` (`#171717`) + `·` + `"5 documents"` (`#686868`)
    * Description: `"Product requirements, interface designs and implementation references."`
  * **Card 3:**
    * Title: `"Solver Research"`
    * Metadata: `"Project: Rubik's Cube Solver"` (`#171717`) + `·` + `"4 documents"` (`#686868`)
    * Description: `"Research notes, model experiments and testing resources for the solver."`
  * **Card 4 (Standalone format):**
    * Title: `"Team Handbook"`
    * Metadata: `"No project · Standalone space"` (`#171717`) + `·` + `"3 documents"` (`#686868`)
    * Description: `"Shared onboarding, team practices and resources for every Airost member."`

---

### Screen 2: `Documentation — First use.png`

**Purpose:** Empty state when the organization/user has zero documentation spaces created.

* **Page Header & Search Field:** Identical to **Screen 1**.
* **List Heading:**
  * **Left:** `"Documentation Spaces"` (`Varela Round`, `20px`, `#171717`).
  * **Right:** `"0 spaces"` (`Varela Round`, `14px`, `#686868` — document count is omitted when 0 spaces exist).
* **Empty State Card (`24px` below list heading):**
  * Uses the standard **Empty State Card** container ($959 \times 330\text{ px}$).
  * **Icon:** `56x56px` circle (`#F5F5F5`) with outline folder icon (`#686868`).
  * **Heading (`18px` below icon):** `"A home for your documentation"` (`Varela Round`, `22px`, `#171717`).
  * **Description (`12px` below heading):** `"Create your first Documentation Space, then add links to Google Docs or Drive. Connect it to a project or keep it open to the team."` (`Varela Round`, `14px`, line-height `150%`, `#686868`, two lines centered).
  * **Primary CTA (`24px` below description):** Pill button `"+ Create Documentation Space"` (Height `42px`, width `~244px`, background `#0DC414`, radius `30px`, shadow `0 4px 16px rgba(0,0,0,0.15)`, `Varela Round` `14px` sentence case `#FFFFFF`).

---

### Screen 3: `Documentation — No search results.png`

**Purpose:** Empty search results state when a query matches zero spaces.

* **Page Header:** Identical to **Screen 1**.
* **Search Field (Active Query State):**
  * Left: Magnifying glass icon + `12px` gap + active input text `"marketing"` (`Varela Round`, `16px`, `#171717`).
  * Right: Clear input icon button (`✕`, `16x16px`, `#686868`, aligned `16px` from right edge).
* **List Heading:**
  * **Left:** `"Search results"` (`Varela Round`, `20px`, `#171717`).
  * **Right:** `"0 spaces found"` (`Varela Round`, `14px`, `#686868`).
* **No Results Card (`24px` below list heading):**
  * Uses the standard **Empty State Card** container ($959 \times 315\text{ px}$).
  * **Icon:** `56x56px` circle (`#F5F5F5`) with magnifying glass icon (`#686868`).
  * **Heading:** `"No spaces found for “marketing”"` (`Varela Round`, `22px`, `#171717`, dynamic query wrapped in curly quotes).
  * **Description:** `"Try another space title or project name, or clear your search to see all Documentation Spaces."` (`Varela Round`, `14px`, `#686868`).
  * **Primary CTA:** Pill button `"✕ Clear search"` (Height `42px`, width `~140px`, background `#0DC414`, radius `30px`, shadow `0 4px 16px rgba(0,0,0,0.15)`, `14px` `#FFFFFF`).

---

### Screen 4: `Documentation — Manager space menu.png`

**Purpose:** Displays the overflow menu (`⋯`) open on a Documentation Space card for users with manager permissions.

* **Base Screen:** Identical to **Screen 1** (`Documentation — All spaces.png`).
* **Active Overflow Menu (on Card 1: `"Engineering Handbook"`):**
  * Triggered by clicking the top-right `⋯` icon on Card 1.
  * **Menu Container:** Width `190px`, height `~92px`, background `#FFFFFF`, radius `8px`, shadow `0 4px 16px rgba(0,0,0,0.15)`. Positioned directly below the `⋯` icon, right-aligned with the card's inner right padding edge (overlapping the `"Open"` button of Card 1).
  * **Menu Items (`Varela Round`, `14px`, `#171717`, left icon `16x16px` `#171717` + `10px` gap):**
    1. **Edit space** (Pencil outline icon)
    2. **Manage permissions** (User with group/gear outline icon)

---

### Screen 5: `Create Documentation Space — Project linked.png`

**Purpose:** Form screen for creating a new Documentation Space linked to an existing project.

* **Page Header:**
  * **Title:** `"Create Documentation Space"` (`Varela Round`, `48px`, `#FF7B7B`).
  * **Subtitle (`12px` below title):** `"Organize external document links and choose who can access and update them."` (`Varela Round`, `14px`, `#686868`).
* **Main Form Card (`24px` below subtitle, width `959px`):**
  * **Row 1 (2-Column Grid, `24px` horizontal gap):**
    * **Left Column (~65% / `580px` width):** Label `"Title *"` → Text Input value `"Engineering Handbook"`.
    * **Right Column (~35% / `303px` width):** Label `"Project"` (not required) → Select Dropdown showing `"Airost Intranet"` with right chevron `⌄`.
  * **Row 2 (`20px` below Row 1, Full Width):**
    * Label `"Description *"` → Textarea Input (Height `68px`, border `1px solid #DEDEDE`, radius `6px`, padding `16px`) containing `"Technical references and delivery guides for the Airost Intranet team."`.
  * **Row 3 (`24px` below Row 2, 2-Column Permissions Grid, `48px` gap):**
    * **Left Column — Access:**
      * Heading: `"Access"` (`Varela Round`, `18px`, `#171717`).
      * Helper text (`6px` below): `"Who can view and open document links?"` (`13px`, `#686868`).
      * Radio Group (`16px` below helper, `14px` vertical gap between options, `16x16px` radio circles):
        * `○ All`
        * `⦿ Project members` (**Selected:** green outer ring `#0DC414` with green center dot)
        * `○ Selected members`
    * **Right Column — Update permissions:**
      * Heading: `"Update permissions"` (`Varela Round`, `18px`, `#171717`).
      * Helper text (`6px` below): `"Who can add, edit and archive document links?"` (`13px`, `#686868`).
      * Radio Group:
        * `○ All`
        * `○ Project members`
        * `⦿ Selected members` (**Selected:** `#0DC414`)
      * **Member Multi-Select Component (`12px` below `"Selected members"`):**
        * **Selected Pills Input Box:** Height `44px`, border `1px solid #DEDEDE`, radius `6px`, padding `8px 12px`. Shows gray member pills (`background: #F5F5F5`, radius `12px`, padding `4px 10px`, `13px` `#171717` with `✕` remove button): `"Jess ✕"`, `"Chang Xi ✕"`, followed by an inline downward chevron `⌄`.
        * **Member Picker Dropdown Box (`8px` below input box):** Border `1px solid #DEDEDE`, radius `6px`, padding `12px`.
          * Search row at top: Magnifying glass icon (`14px`) + `"Search members"` placeholder (`13px`, `#686868`).
          * Checkbox list (`10px` vertical gap, `14x14px` rounded checkboxes, green `#0DC414` border/checkmark when checked):
            * `[✓] Jess` (Checked)
            * `[✓] Chang Xi` (Checked)
            * `[ ] Yu Jing` (Unchecked)
            * `[ ] Wesley` (Unchecked)
  * **Row 4 (`24px` below permissions):** Shared **Info Banner** (`"Document access and editing permissions are managed by the linked service."`).
  * **Row 5 (Footer Actions, `24px` below Info Banner, right-aligned, `12px` gap):**
    * Secondary Button: `"Cancel"` ($84 \times 42\text{ px}$, background `#F5F5F5`, radius `6px`, `Varela Round` `14px` `#171717`).
    * Primary Button: `"Create Space"` ($126 \times 42\text{ px}$, background `#0DC414`, radius `30px`, shadow `0 4px 16px rgba(0,0,0,0.15)`, `Varela Round` `14px` `#FFFFFF`).

---

### Screen 6: `Create Documentation Space — Standalone.png`

**Purpose:** Form screen when `"No project"` is selected in the Project dropdown, adjusting subtitle copy and available permission radio options.

* **Differences from Screen 5 (`Project linked`):**
  1. **Page Subtitle:** Changes dynamically to `"A standalone space brings shared knowledge together without linking to a project."` (`Varela Round`, `14px`, `#686868`).
  2. **Title Input Value:** `"Team Handbook"`.
  3. **Project Select Value:** `"No project"`.
  4. **Description Input Value:** `"Shared onboarding, team practices and resources for every Airost member."`.
  5. **Access & Update Permissions Radio Options:** The `"Project members"` radio option is **removed** from both columns because no project is linked. Only two radio options appear in each column:
     * **Access:** `⦿ All` (Selected) and `○ Selected members`.
     * **Update permissions:** `○ All` and `⦿ Selected members` (Selected, showing pills `"Jess ✕"` and `"Yu Jing ✕"`, with `Jess` and `Yu Jing` checked in the member list below).

---

### Screen 7: `Edit Documentation Space — Manager.png`

**Purpose:** Form screen for editing an existing Documentation Space and its access/update permissions (triggered via `"Edit space"`, `"Manage permissions"`, or `"Update access"`).

* **Differences from Screen 5 (`Create Documentation Space — Project linked`):**
  1. **Page Title:** `"Edit Documentation Space"` (`Varela Round`, `48px`, `#FF7B7B`).
  2. **Context Subtitle (`12px` below title):** `"Engineering Handbook · Manager access"` (`Varela Round`, `14px`, `#686868`).
  3. **Form Inputs & Permissions State:** Pre-populated with the space's existing values (`Title *`: `"Engineering Handbook"`, `Project`: `"Airost Intranet"`, `Description *`: `"Technical references and delivery guides for the Airost Intranet team."`, `Access`: `⦿ Project members`, `Update permissions`: `⦿ Selected members` with `Jess` and `Chang Xi` selected).
  4. **Footer Actions (Right-aligned, `12px` gap):**
     * Secondary Button: `"Cancel"` ($84 \times 42\text{ px}$, `#F5F5F5`, radius `6px`, `#171717`).
     * Primary Button: `"Save Changes"` ($132 \times 42\text{ px}$, background `#0DC414`, radius `30px`, shadow `0 4px 16px rgba(0,0,0,0.15)`, `Varela Round` `14px` `#FFFFFF`).

---

### Screen 8: `Documentation Space — Update access.png`

**Purpose:** Default inside view of a Documentation Space (`"Engineering Handbook"`) for a user with update permissions, showing area filter tabs and document cards in their default (closed menu) state.

* **Back Link:** `"← Back to Documentation"` at top-left.
* **Space Header (`12px` below back link):**
  * **Left Stack:**
    * Title: `"Engineering Handbook"` (`Varela Round`, `48px`, `#FF7B7B`).
    * Metadata (`10px` below title): `"Project: Airost Intranet"` (`#171717`) + `·` + `"8 documents"` (`#686868`).
    * Description (`12px` below metadata): `"Technical references and delivery guides for the Airost Intranet team."` (`14px`, `#686868`).
  * **Right Action Stack:**
    * Top: Pill button `"+ Add Document"` ($148 \times 44\text{ px}$, background `#0DC414`, radius `30px`, shadow `0 4px 16px rgba(0,0,0,0.15)`, `14px` `#FFFFFF`).
    * Bottom (`12px` below `+ Add Document`, right-aligned): **Access Badge Chip** `"✎ Update access"` (Height `30px`, padding `0 12px`, background `#F5F5F5`, radius `6px`, `12px` pencil icon + `6px` gap + `Varela Round` `13px` `#686868`).
* **Area Filter Tabs Bar (`24px` below description):**
  * Horizontal row of rounded-rectangle tabs (`8px` gap between tabs, height `38px`, padding `0 16px`, border-radius `6px`, `Varela Round` `14px`), followed by a `1px solid #EDEDED` horizontal divider line `16px` below the tabs.
  * **Inactive Tab Style:** Background `#F5F5F5`, Area name in `#686868` + `8px` gap + count in `#686868`.
  * **Active Tab Style:** Background `#EBF9EC` (soft light green tint), Area name and count in `#158019` (dark green).
  * **Tabs Observed:**
    1. `General  2` (Inactive)
    2. `Requirements  1` (Inactive)
    3. `Design  1` (Inactive)
    4. `Development  2` (**Active**)
    5. `Testing  2` (Inactive)
    6. `Deployment  0` (Inactive)
* **Area Section Header (`20px` below divider):**
  * **Left:** Area title `"Development"` (`Varela Round`, `22px`, `#171717`) + `12px` gap + `"2 documents"` (`14px`, `#686868`).
  * **Right:** Archive link button with archive box icon (`16px`) + `6px` gap + `"Archived Documents (2)"` (`Varela Round`, `14px`, `#686868`).
* **Document Cards List (`20px` below Area header, `20px` gap between cards):**
  * **Card Dimensions & Style:** $959 \times 104\text{ px}$, `#FFFFFF`, radius `10px`, padding `24px`, shadow `0 4px 5px rgba(0,0,0,0.15)`.
  * **Left Content:**
    * Leading Icon Box: $44 \times 44\text{ px}$, background `#F5F5F5`, radius `8px`, centered document lines outline icon (`20x20px`, `#686868`).
    * `16px` horizontal gap to text stack:
      * Document Title (`Varela Round`, `22px`, `#171717`)
      * Source Label (`6px` below title, `Varela Round`, `14px`, `#686868`): `"Google Docs"` or `"Google Drive"`.
  * **Right Controls (Horizontal row, vertically centered):**
    * `"Open"` button ($86 \times 38\text{ px}$, background `#F5F5F5`, radius `6px`, `14px` external-link icon `↗` + `6px` gap + `"Open"` in `Varela Round` `14px` `#171717`).
    * `12px` gap + Horizontal 3-dot overflow button (`⋯`, `26x26px`, `#171717`).
  * **Cards Observed:**
    1. `"Database Schema"` / `"Google Docs"`
    2. `"API Reference"` / `"Google Drive"`
* **Footer Helper & Info Banner (`20px` below last card):**
  * Helper line: External-link icon (`↗`, `14px`, `#686868`) + `8px` gap + `"Open launches the linked document in a new tab."` (`Varela Round`, `13px`, `#686868`).
  * `16px` below helper line: Shared **Info Banner**.

---

### Screen 9: `Documentation Space — Document menu.png`

**Purpose:** Inside view of a Documentation Space (`"Engineering Handbook"`) when a user with update permissions clicks the `⋯` menu on a document card.

* **Base Screen:** Identical to **Screen 8** (`Documentation Space — Update access.png`).
* **Active Document Overflow Menu (on Card 1: `"Database Schema"`):**
  * Triggered by clicking the `⋯` icon to the right of `"Open"` on Card 1.
  * **Menu Container:** $156 \times 88\text{ px}$, `#FFFFFF`, radius `8px`, shadow `0 4px 16px rgba(0,0,0,0.15)`, positioned directly below the right action controls of Card 1 (overlapping the right edge of Card 2).
  * **Menu Items (`Varela Round`, `14px`, `#171717`, `16x16px` outline icon + `10px` gap):**
    1. **Edit** (Pencil outline icon)
    2. **Archive** (Archive box outline icon)

---

### Screen 10: `Documentation Space — Read-only.png`

**Purpose:** Inside view of a Documentation Space (`"Engineering Handbook"`) for a user who only has view/open access (`Read-only`) and does not have update permissions.

* **Differences from Screen 8 (`Documentation Space — Update access.png`):**
  1. **Primary `+ Add Document` Button Hidden:** The top-right green `"+ Add Document"` button is **not rendered**.
  2. **Read-Only Badge Chip:** In the right column of the Space Header (aligned horizontally with the `"Project: Airost Intranet · 8 documents"` metadata row), displays the `"🔒 Read-only"` badge chip (Height `30px`, padding `0 12px`, background `#F5F5F5`, radius `6px`, `12px` lock outline icon + `6px` gap + `"Read-only"` in `Varela Round` `13px` `#686868`).
  3. **Archived Documents Link Hidden:** In the Area Section Header (`"Development  2 documents"`), the right-aligned `"Archived Documents (2)"` link button is **not rendered**.
  4. **Document Card Overflow (`⋯`) Hidden:** On each Document Card (`"Database Schema"` and `"API Reference"`), the `⋯` button is **not rendered**; the `"↗ Open"` button ($86 \times 38\text{ px}$) is flush-right against the card's `24px` right padding.

---

### Screen 11: `Documentation Space — Empty Deployment area.png`

**Purpose:** Inside view of a Documentation Space when selecting an Area tab that has `0` documents (`Deployment 0`).

* **Back Link, Space Header, and Area Filter Tabs:** Identical to **Screen 8**, except:
  * `Development  2` is **Inactive** (`#F5F5F5` / `#686868`).
  * `Deployment  0` is **Active** (`#EBF9EC` background / `#158019` text).
* **Area Section Header:**
  * **Left:** `"Deployment"` (`22px`, `#171717`) + `12px` gap + `"0 documents"` (`14px`, `#686868`).
  * **Right:** `"Archived Documents (2)"` with archive icon (`14px`, `#686868`). *(Hidden if user is in Read-only mode).*
* **Empty Area Card (`20px` below Area header):**
  * Uses the standard **Empty State Card** ($959 \times 300\text{ px}$).
  * **Icon:** `56x56px` circle (`#F5F5F5`) with outline folder icon (`#686868`).
  * **Heading:** `"No documents in <Area Name> yet"` (e.g., `"No documents in Deployment yet"`, `Varela Round`, `22px`, `#171717`).
  * **Description:**
    * For `Deployment`: `"Add a link to a release checklist, hosting guide or deployment runbook in Google Docs or Drive."` (`Varela Round`, `14px`, `#686868`).
    * **Fallback for all other empty Areas (`General`, `Requirements`, `Design`, `Development`, `Testing`):** Fall back to a generic sentence: `"Add a link to a document or folder in Google Docs or Drive for this area."`
  * **Primary CTA:** Pill button `"+ Add Document"` ($148 \times 42\text{ px}$, background `#0DC414`, radius `30px`, shadow `0 4px 16px rgba(0,0,0,0.15)`, `14px` `#FFFFFF`). *(Hidden if user is in Read-only mode).*
* **Footer:** Shared **Info Banner** (`20px` below the Empty Area Card; the `"Open launches the linked document in a new tab."` helper line is hidden when 0 documents are displayed).

---

### Screen 12: `Add Document — External link.png`

**Purpose:** Form screen to add an external document link into a specific Area of a Documentation Space.

* **Back Link:** `"← Back to Engineering Handbook"` (`14px`, `#686868`).
* **Page Header (`12px` below back link):**
  * **Title:** `"Add Document"` (`Varela Round`, `48px`, `#FF7B7B`).
  * **Context Subtitle (`10px` below title):** `"Engineering Handbook · Airost Intranet"` (`Varela Round`, `14px`, `#686868`).
* **Form Container Card (`24px` below subtitle, width `959px`):**
  * **Field 1 — Title:**
    * Label: `"Title *"`
    * Input: Placeholder `"Enter a document title"` (`46px` height, `1px solid #DEDEDE`, radius `6px`).
  * **Field 2 — Link (`20px` below Title):**
    * Label: `"Link *"`
    * Input: Placeholder `"Paste the Document Link"` *(implementation override applied per specification; visual mockup shows `"Paste a Google Docs or Google Drive link"`)* (`46px` height).
    * Helper text (`8px` below input): `"Only the external link is stored. Document content is never imported."` (`Varela Round`, `13px`, `#686868`).
  * **Field 3 — Area (`20px` below Link helper):**
    * Label: `"Area *"`
    * Select Trigger: Displays `"Development"` with right chevron `⌄`.
    * **Open Dropdown Menu (`6px` below trigger):** Full input width, border `1px solid #DEDEDE`, radius `6px`, padding `6px`, background `#FFFFFF`.
      * Each option is `36px` height, padding `0 12px`, radius `4px`, `Varela Round` `14px`:
        1. `General` (`#171717`)
        2. `Requirements` (`#171717`)
        3. `Design` (`#171717`)
        4. `Development` (**Selected:** background `#EBF9EC`, text `#158019`, right-aligned green checkmark `✓`)
        5. `Testing` (`#171717`)
        6. `Deployment` (`#171717`)
  * **Info Banner (`20px` below Area dropdown):** Shared **Info Banner**.
  * **Footer Actions (`24px` below Info Banner, right-aligned, `12px` gap):**
    * Secondary Button: `"Cancel"` ($84 \times 42\text{ px}$, `#F5F5F5`, radius `6px`, `#171717`).
    * Primary Button: `"Add Document"` ($132 \times 42\text{ px}$, `#0DC414`, radius `30px`, shadow `0 4px 16px rgba(0,0,0,0.15)`, `#FFFFFF`).

---

### Screen 13: `Edit Document — Link record.png`

**Purpose:** Form screen to update an existing document's title, optionally replace its external link, or move it to another Area.

* **Back Link:** `"← Back to Engineering Handbook"` (`14px`, `#686868`).
* **Page Header (`12px` below back link):**
  * **Title:** `"Edit Document"` (`Varela Round`, `48px`, `#FF7B7B`).
  * **Context Subtitle (`10px` below title):** `"Engineering Handbook · Development"` (`Varela Round`, `14px`, `#686868`).
* **Form Container Card (`24px` below subtitle, width `959px`):**
  * **Field 1 — Title:**
    * Label: `"Title *"`
    * Input (`46px` height): Pre-filled value `"Database Schema"`.
  * **Field 2 — Saved Link Summary (`20px` below Title):**
    * Label: `"Link *"`
    * **Saved Link Read-only Box:** Full input width, height `60px`, background `#F5F5F5`, radius `6px`, horizontal padding `16px`.
      * Left: Document outline icon (`18x18px`, `#686868`).
      * Right of icon (`12px` gap, vertical stack):
        * Line 1: `"Google Docs"` (`Varela Round`, `14px`, `#171717`).
        * Line 2 (`4px` below): `"An external document link is saved."` (`Varela Round`, `12px`, `#686868`).
  * **Field 3 — Replace Link (`16px` below Saved Link Box):**
    * Label: `"Replace link"` (Optional — no asterisk).
    * Input (`46px` height): Placeholder `"Paste the Document Link"` *(implementation override applied; visual mockup shows `"Paste a new Google Docs or Google Drive link"`)*.
    * Helper text (`8px` below input): `"Leave empty to keep the current link. Only the link record is updated."` (`Varela Round`, `13px`, `#686868`).
  * **Field 4 — Area (`20px` below Replace Link helper):**
    * Label: `"Area *"`
    * Select Trigger (`46px` height, closed state): Displays `"Development"` on the left and downward chevron `⌄` on the right.
  * **Info Banner (`20px` below Area select):** Shared **Info Banner**.
  * **Footer Actions (`24px` below Info Banner, right-aligned, `12px` gap):**
    * Secondary Button: `"Cancel"` ($84 \times 42\text{ px}$, `#F5F5F5`, radius `6px`, `#171717`).
    * Primary Button: `"Save Changes"` ($132 \times 42\text{ px}$, `#0DC414`, radius `30px`, shadow `0 4px 16px rgba(0,0,0,0.15)`, `#FFFFFF`).

---

### Screen 14: `Archived Documents — Restore access.png`

**Purpose:** Dedicated view listing archived document links within a Documentation Space and allowing users with update access to restore them.

* **Back Link:** `"← Back to Engineering Handbook"` (`14px`, `#686868`).
* **Page Header (`12px` below back link):**
  * **Title:** `"Archived Documents"` (`Varela Round`, `48px`, `#FF7B7B`).
  * **Context Metadata (`10px` below title):** `"Engineering Handbook · Project: Airost Intranet"` (`Varela Round`, `14px`, `#686868`).
  * **Supporting Description (`16px` below metadata):** `"Archived links are hidden from their Areas. Restore a link to return it to its original Area; the external document is not changed."` (`Varela Round`, `14px`, `#686868`).
* **List Heading (`24px` below description):**
  * **Left:** `"2 archived documents"` (`Varela Round`, `18px`, `#171717`).
  * **Right:** `"Update access"` (`Varela Round`, `13px`, `#686868`).
* **Archived Document Cards Stack (`16px` below list heading, `20px` vertical gap between cards):**
  * **Card Dimensions & Style:** $959 \times 104\text{ px}$, `#FFFFFF`, radius `10px`, padding `24px`, shadow `0 4px 5px rgba(0,0,0,0.15)`.
  * **Left Content:**
    * Leading Icon Box: $44 \times 44\text{ px}$, background `#F5F5F5`, radius `8px`, document icon (`20x20px`, `#686868`).
    * Text Stack (`16px` right of icon box):
      * Title (`Varela Round`, `22px`, `#171717`)
      * Metadata (`6px` below title, `Varela Round`, `14px`, `#686868`): `<Source>  ·  <Original Area>`
  * **Right Control:**
    * Secondary Button `"Restore"` ($100 \times 38\text{ px}$, background `#F5F5F5`, radius `6px`, archive-restore icon with upward arrow `15px` + `8px` gap + `"Restore"` in `Varela Round` `14px` `#171717`).
  * **Cards Observed:**
    1. `"Database Schema (legacy)"` / `"Google Docs  ·  Development"`
    2. `"API Reference (legacy)"` / `"Google Drive  ·  Development"`
* **Footer (`24px` below last card):** Shared **Info Banner**.

---

## 3. UI State & Navigation Flow Matrix

| Trigger Element | Source Screen | Target Screen / Behavior |
| :--- | :--- | :--- |
| `+ ADD` or `+ Create Documentation Space` | Screen 1, 2 | Navigates to **Screen 5** (`Create Documentation Space — Project linked`) |
| Project Select toggled to `"No project"` | Screen 5 | Updates form view to **Screen 6** (`Create Documentation Space — Standalone`) |
| Search Input typed with no matches | Screen 1 | Updates view to **Screen 3** (`Documentation — No search results`) |
| `✕` (Search input) or `✕ Clear search` | Screen 3 | Clears query and restores **Screen 1** |
| Space Card `⋯` button | Screen 1 | Opens popover menu in **Screen 4** (`Edit space`, `Manage permissions`) |
| `Edit space` or `Manage permissions` | Screen 4 | Navigates to **Screen 7** (`Edit Documentation Space — Manager`) |
| `✎ Update access` chip | Screen 8, 9, 11 | Navigates to **Screen 7** (`Edit Documentation Space — Manager`) |
| Space Card `Open` button (with Update access) | Screen 1 | Navigates to **Screen 8** (`Documentation Space — Update access`) |
| Space Card `Open` button (with Read-only access) | Screen 1 | Navigates to **Screen 10** (`Documentation Space — Read-only`) |
| Document Card `⋯` button | Screen 8 | Opens popover menu in **Screen 9** (`Edit`, `Archive`) |
| Document Menu `Edit` | Screen 9 | Navigates to **Screen 13** (`Edit Document — Link record`) |
| Document Menu `Archive` | Screen 9 | Moves document to archived list and updates counts |
| Area Tab `Deployment 0` clicked | Screen 8 | Updates view to **Screen 11** (`Empty Deployment area`) |
| `+ Add Document` button | Screen 8, 11 | Navigates to **Screen 12** (`Add Document — External link`) |
| `Archived Documents (2)` button | Screen 8, 9, 11 | Navigates to **Screen 14** (`Archived Documents — Restore access`) |
| `Restore` button on Archived Card | Screen 14 | Restores document link to its original Area and decrements archived count |
| `← Back to Documentation` | Screen 8, 9, 10, 11 | Navigates back to **Screen 1** |
| `← Back to Engineering Handbook` | Screen 12, 13, 14 | Navigates back to **Screen 8** |