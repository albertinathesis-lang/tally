# Grit (iOS) — feature and screen analysis

Source: screen recording 2026-09-25 (236 s, 1284×2778 @3x, iPhone 13 Pro Max,
frames in `frames/`, contact sheets in `sheets/`) plus 13 screenshots in
`shots/`. Grit version 6.0.1 (1559). Measurements are in points (px ÷ 3).
Screen is 428×926 pt.

Purpose of this file: the complete inventory to rebuild Tally as a
pixel-level replica first, then diverge (own icons, template list, name,
palette) before App Store submission.

---------------------------------------------------------------------------

## 1. App structure

Four tabs in a floating glass tab bar: **Habits · Statistics · Sharing ·
Settings**. Everything else is pushed pages (Settings sub-pages, Add Habit)
or sheets (Templates, habit detail, menus).

Appearance: Automatic / Light / Dark. Theme = accent colour (blue default,
red in the recording) + optional **Custom Background** gradient (Start
Color → End Color, 15 preset swatches per colour, "Randomize"). The user's
current theme: red accent, background blue (top) → orange (bottom), which
renders as a pale gradient `#A2CBF8 → #D4D4E2 (50%) → #EFCDAE`.

Alternate app icons (3 in the recording).

---------------------------------------------------------------------------

## 2. Habits screen (main)

### 2.1 Header (fixed, over the gradient)
- Left pill (glass, 44 pt tall, ~78 pt wide, 20 pt from left): two icons —
  **list** (☰ bullets: opens Sort / Progress View / Hide filters menu) and
  **sort/reorder** (≡ lines: opens "Reorder Habits" full-screen modal).
- Centre: title **Today / Yesterday / Tomorrow / weekday name**, 22 pt
  semibold, follows the selected day.
- Right: **+** (44 pt circle, tinted accent, opens Templates sheet) and
  **search** (44 pt glass circle).
- Below: **week strip**, 7 columns across full width, weekday name (13 pt,
  tertiary) over day number (17 pt). Today is bold. Selected day gets a
  44 pt accent circle behind the number with a **progress ring** around it
  (completion of that day). Other days with progress get a tinted circle
  scaled by completion. Strip scrolls horizontally by week (swipe left/right
  moves the selected day; header title follows).
- Free tier: "Waiting for sync to start…" caption under the list.

### 2.2 Menu from the list icon (popover, glass, dark in dark mode)
- **Sort ›** — Default / By Progress / Completed Last (checkmark on
  current, caption under each: "Sort habits in your custom order", "Sort
  habits by current progress", "Keep unfinished habits above completed ones")
- **Progress View ›** — Default / Off / Grid / Bars / Line ("Default follows
  your choice in Settings")
- **Hide Completed**, **Hide Failed**, **Hide Skipped** (toggles with
  icons ✓ ✕ ⏩)
- **Clear Filters** (red) when any is on.

### 2.3 Reorder Habits (modal)
Title "Reorder Habits", ✕ left, ✓ (accent) right, **Groups** pill. List of
habits under group headers ("Ungrouped"), each row: red ⊖, emoji, name,
subtitle, drag handle ≡.

### 2.4 Habit card
Width 396 pt (16 pt margins), corner radius ~22 pt, vertical gap ~14 pt.
Height 164 pt with the Grid progress view, ~64 pt without (Off).

Layout (Grid view):
- top-left corner **badge**: streak `🔥 1` (12 pt semibold) or negative
  streak `− 1` in red.
- row: **emoji/icon** (28 pt box, 20 pt from left), **name** 20 pt semibold,
  **subtitle** 15 pt: repeat text + goal, e.g. "Every day", "Every day, 2/1",
  "Every day, 25 minutes/5 minutes", "Every day, 0/5 minutes",
  "Every day, 1,25/2 litres".
- right: 44 pt **action circle**. Not done: ring (2.5 pt, tinted lighter)
  with **+** (or ▶ for timer, ◼ while running). Done: solid white circle
  with a coloured ✓ (colour = habit colour). Running timer: progress ring.
- **heat grid**: 7 rows × ~40 columns (Dec → Aug, one column per week, one
  cell per day), cell ~7.5 pt square, pitch 9.2 pt, radius ~1.5 pt, starts
  16 pt inside the card. Cells: translucent white (12 %) on done cards,
  translucent habit colour on undone cards; a **done day = solid white
  cell**. Month labels under the grid (13 pt) aligned to first week of
  each month: Dec Jan Feb Mar Apr May Jun Jul Aug.
- Other progress views: **Bars** (one bar per day for the last 8 days with
  day-of-month labels 18…25), **Line** (line chart across the last 8 days
  with dots), **Off** (no chart, card is 64 pt).

Card colours (light theme in the screenshots):
- Done: solid habit colour, white text — teal `#59C2B1`, orange `#EC9142`,
  green `#5CC15C`.
- Not done: glass tint of the habit colour over the gradient (~35 %
  colour + blur), black text.
Dark theme: not done = dark card (`#1C1C1E`-ish with a colour tint at
~15 %); done = solid colour; text white.

Tap on the card body → **habit detail sheet**. Tap on the circle → done /
increment / start timer. Left swipe / long press: (not recorded).

### 2.5 Habit detail sheet (bottom sheet, ~half height, glass over gradient)
- ✕ (left), **note** icon (add note) and **⋯** (right).
- centre: `emoji Name` 32 pt bold, subtitle "Every day" 15 pt.
- big **ring counter**: 200 pt ring (accent colour, thin track), value in
  the centre 96 pt regular ("0"), a dot knob on the ring; **−** (left,
  glass circle 56 pt) and **+** (right, tinted circle) beside it; streak
  badge "− 1" to the top right.
- bottom row: **⏩ skip**, **✕ fail**, and a wide **Complete** pill button
  (accent).
- for timer habits the counter is a running timer with start/stop.

### 2.6 Timer
Timer habits show "0/5 minutes" and a ▶ button; running shows the elapsed
in the subtitle ("5 seconds/5 minutes"), a ring on the button, a green
tint on the card, a **Live Activity** on the lock screen (name, subtitle,
elapsed, stop button) and a mini bar above the tab bar ("Stretch · Every
day, 5 minutes · 0:05 ◼"). Completing plays a **confetti** animation and
may pop **New Achievement!** (blue flag "100%", "View all achievements").

### 2.7 Free tier
"Unlock everything — With Grit Premium" card (purple, crown icon) at the
bottom of the list; **Unlock Unlimited Habits** pill over the templates
list; template rows beyond the free limit are dimmed.

---------------------------------------------------------------------------

## 3. Templates sheet (from +)
Title "Templates", ✕ left. Segmented control **Good · Health · Bad ·
To-do**. First row **Create a Custom Habit** (green rosette icon; "Create a
Custom Task" under To-do). Sections with grouped rows (emoji, name, ›);
Health rows carry a red ♥ (Apple Health) badge; Bad rows a red ⊖; To-do
rows a blue ● badge; some carry both ♥ and ⊖ (Limit Coffee). Pinned
**search field** at the bottom ("Search templates").

Sections and rows (as recorded — to be REPLACED with our own list before
release):

**Good**: Most Popular (Make Your Bed, Drink Water, Take a Cold Shower, Take
Vitamins, Wake Up on Time, Eat a Healthy Meal, Brush Your Teeth, Read a
Book, Take a Shower, Go for a Walk, Pray, Plan Tomorrow, Learn) · Body (Eat a
Healthy Meal, Take a Cold Shower, Take a Shower, Drink Tea, Cook at Home,
Take Vitamins, Eat Breakfast, Take a Selfie, Wash Your Face, Take the
Stairs, Health Checkup, Log Menstrual Cycle, Take Contraceptive Pill, Skin
Care, Dental Checkup, Mobility Stretching, Gentle Exercise, Meal Prep, Skin
Care Routine, Track Blood Pressure, Floss Your Teeth, Take Your Medication,
Apply Sunscreen, Eat Fruits and Vegetables, Check Your Posture, Take a
Screen Break, Log Your Meals, Have an Alcohol-Free Day) · Mind (Read a Book,
Play an Instrument, Learn a Language, Homework, Listen to a Podcast, Listen
to an Audiobook, Focused Study, Brain Puzzles, Hobby Time) · Mental
Wellbeing (Meditate, Smile, Journal Your Thoughts, Practice a Breathing
Exercise, Spend Time in Nature) · Sleep (Go to Sleep on Time, Wake Up on
Time, Wind Down Before Bed) · Productivity (Clean Up Email, Plan Tomorrow,
Set Daily Goals, Deep Work, Make Your Bed) · Social (Smile at a Stranger,
Give a Compliment, Leave the House, Start a Conversation, Give Someone a
Hug, Help Someone, Call Your Parents, Attend a Social Club, Volunteer) ·
Family & Pets (Family Time, Call a Loved One, Walk Your Dog, Spend Time
with Your Partner) · Home & Chores (Wash the Dishes, Laundry, Take the
Trash Out, Vacuum, Dust, Mop the Floor, Cleaning, Clear the Fridge, Grocery
Shopping, Water Plants, Declutter) · Money (Track Expenses, Pay Bills) ·
Other (Walk Your Dog, Dress Well).

**Health** (Apple Health linked): Activity (Steps, Run, Cycle, Swim, Ski,
Yoga, Dance, Pilates, Tennis, Traditional Strength Training, Boxing, Climb
Flights of Stairs, Burn Calories, Stand, Calorie Deficit, Work Out,
Exercise Minutes, Hiking, High Intensity Interval Training, Jump Rope,
Rowing, Elliptical, Core Training, Flexibility, Walking, Functional
Strength Training) · Sports (Basketball, Soccer, Martial Arts, Climbing,
Badminton, Volleyball, Pickleball) · Body Measurements (Record Weight, Lean
Body Mass, Fat Percentage, Height, Blood Glucose) · Sleep (Sleep) · Heart
(Record Blood Pressure) · Mental Wellbeing (Mindful Session, State of Mind)
· Nutrition (Drink Water, Limit Coffee, Limit Alcoholic Drinks) · Other
(Wash Your Hands, Brush Your Teeth, Time in Daylight).

**Bad**: Body (Don't Snack, Don't Bite Your Nails, Don't Pick Your Nose…) ·
Mental Wellbeing (Don't Swear, Don't Get Angry, Don't Complain, Reduce
Negative Self-Talk, Stop Overcommitting, Avoid Isolation) · Productivity
(Don't Procrastinate, Don't Play Games, Less Social Media, Less TV) ·
Nutrition (Don't Skip Breakfast, Don't Skip Lunch, Avoid Late Heavy Meals,
Don't Skip Meals) · Digital Habits (Don't Play Games, Less Social Media,
Less TV, Don't Compare Online, Avoid Work Email at Night, Phone-Free
Dinner, Less Daily News, Don't Use Your Phone While Driving) · Sleep (Don't
Snooze, Limit Late Caffeine, Avoid Bedtime Procrastination) · Health (Avoid
Binge Drinking, Don't Smoke or Vape, Don't Ignore Symptoms) · Money (Avoid
Impulse Shopping, Don't Gamble).

**To-do**: Most Popular (File Taxes, Renew Passport, Plan a Vacation, Update
Passwords, Print Documents, Buy a Gift, Sign Up for a Gym, Schedule a
Meeting, Set Up a Budget, Update Resume, Read a Book, Renew Driver's
License, Check Insurance, Car Maintenance) · Money & Paperwork · Home (Car
Maintenance, Test Smoke Alarms, Donate Unused Clothes, Build an Emergency
Kit, Make an Emergency Plan) · Career (Schedule a Meeting, Update Resume,
Apply for a Job, Ask for Feedback on a Project, Prepare for a Job
Interview) · Health (Schedule a Doctor's Appointment, Schedule an Eye
Exam…).

---------------------------------------------------------------------------

## 4. Add Habit / Edit Habit (pushed page)
Header: ‹ back, "Add Habit", ✓ save (green circle, dimmed until a name).
- **Preview card** (live, habit colour): icon, name field placeholder
  "Habit name", "Every day", pencil; counter "8/100" under it.
- **Appearance** group: Color (dot + ⌃⌄ picker), Icon (emoji ›), Description
  (Empty › → page with text area, "Leave the field blank to remove the
  description."), Progress View (Default › → Default/Off/Grid/Bars/Line
  with a live preview card).
- **General** group: Type (Good ✓ › → page: **Good** "Starts as not
  completed. Each mark increases the habit value." / **Bad** "…two statuses:
  completed or missed…" / **Track** "A habit without a goal, reminders, or
  missed badge." / **To-Do** "One-time habit that disappears after
  completion."), Groups (No group › → Groups page, empty state "No Groups
  Yet — Create a group to organize related habits." + "Create New Group"),
  Goal (1 › → page: Apple Health toggle "Sync the habit data with the Health
  app.", Goal number field, Unit (Count ›), Step (1) "When you tap the
  habit, this amount is added.", Exclude from daily progress toggle, Goal
  Plan "Add Goal Plan" with explanation), Average (None ›), Repeat (Every
  day › → page: Goal Period Daily ⌃⌄ "The time window in which the goal is
  measured."; Frequency: Specific days of the week ✓ with Mo–Su green
  chips / Specific days of the month / Flexible Days per Week / Flexible
  Days per Month / Every N days; Repeat Plan "Add Repeat Plan"),
  Notifications ("Enable notifications to use this feature." orange,
  Automatic), Block selected apps (Off › → Screen Time page), URL (None ›
  → text field, explanation about Shortcuts), Starts on (date chip → inline
  month calendar), Set end date (toggle → Ends on date).

---------------------------------------------------------------------------

## 5. Statistics tab
Header: "Statistics" + **Last 28 Days** pill (menu: Today, Last 7 Days,
Last 28 Days ✓, Last 3 Months, Last 6 Months, Last Year, All Time, Custom
Range…). Floating stats icon button bottom-left.
- **Habits** chip row (horizontal scroll, "Choose Habits" link): each chip
  64×64 rounded square with emoji + name; selected chips get a coloured
  outline. Multi-select filters every block below.
- **Completion** card: bar icon, "33%", "2 of 6", green/orange split bar,
  legend "2 completed · 4 not completed".
- **Streak** card: flame, "0 days", "Broken · start again today" / "1 day
  · New best · every day extends it", orange progress line.
- **Amount** (timer/count habits): "#", "25 minutes, 5 seconds", "average
  12 minutes, 32 seconds".
- **When you complete**: histogram of completion hour (12 AM–6 PM axis),
  legend "Morning · 0, Afternoon · 1, Evening · 0, Night · 0" with coloured
  dots.
- **Gaps this period**: rows "24–25 Sep ———— 2 days".
- **Month calendar** "September 2026 ‹ ›": Mon–Sun grid, day numbers,
  selected days with accent circles.
- **Week table** "21–27 Sep ‹ ›": "2 of 6 · 33%", column headers M T W T F
  S S, one row per habit with 7 dots (grey / coloured / ✓ on completion).
- **Year heat grid** "2026 ‹ ›": tiny 7-row grid across Jan–Nov.
- **Progress** line chart: dashed 100% line, filled area, x labels with
  dates, legend "29 Aug – 25 Sep".
- **Comparison**: multi-line chart per habit (habit colours), legend with
  emoji + names, right axis 0–400%.
- **Performance**: rows per habit "Stretch 1 of 2 50%" with green/red pill.

---------------------------------------------------------------------------

## 6. Sharing tab
Empty state: people icon, "Share Habits", "Share your habits with others
and see theirs.", how-it-works text, buttons "Share with Someone" and "Ask
Someone to Share" (tinted).

---------------------------------------------------------------------------

## 7. Settings tab
Grouped iOS lists with coloured square icons; floating gear button.
- **Appearance**: Appearance (Automatic/Light/Dark ⌃⌄), Theme › (Color ⌃⌄,
  Custom Background toggle, swatch row, Start Color, End Color, preview
  phone), Icon › (3 icons; alert "You have changed the icon for Grit"), Sort
  › (same as menu, plus Collapse completed groups), Progress View › (Off ✓
  / Grid / Bars / Line, warning "Using this feature for every habit can
  affect performance…", live preview card), More › (Confetti Animation,
  Show Note After Skip, Rescheduling Suggestions, Show Recap Popups,
  Streaks, Negative Streaks toggles; Name).
- **General**: Badges (toggle, "Enable notifications to use this feature."),
  Day Starts At (4:00 AM), Language (English ↗), Week Starts On (Monday
  ⌃⌄), Calendar Integration (None › → toggle + All-day Events ✓ /
  Automatic / Based on Reminder Time), Block selected apps (On (0) › →
  toggle, Choose apps and categories, Unlock at 100% slider), Allow Future
  Dates (toggle, "Allow habit logging on future dates.").
- **Sounds**: Sounds toggle, Completion Sound (Default, Completion 1–7),
  Notification Sound (Default, Notification 1–14).
- **Data**: Groups › (empty state + "Create New Group"; groups Templates
  sheet: Create a Custom Group, Most Popular: Morning, Afternoon, Evening,
  Night, Health, Daily, School, Fitness; Parts of the Day; Time Periods:
  Weekends, Daily, Weekly, Monthly, Yearly; Health), Vacations › ("No
  Vacations Yet — Plan a vacation to pause habits for selected dates.",
  "Create New Vacation"), Achievements › (hexagon badges: Longest Streak 2,
  5, 7, 14, 30, 60, 90, 180, 365 days; Goals 100–600%; timer 10/30/60
  minutes; Habits: Good, Bad, Track, To-do, Health; "Reset earned
  achievements"), Archived Habits › ("No Archived Habits Yet").
- **Sync & Export**: iCloud Sync (toggle + error text), Export for
  Analysis ›, Fresh Start (orange), Delete All Data (red).
- **Help & Support**: Review on the App Store ↗, Get Support ›, Redeem
  Offer Code, Share App, Shortcuts ›. Footer: "Current version: 6.0.1
  (1559)", "User ID: …" with copy icon.

---------------------------------------------------------------------------

## 8. Motion and feel (from the recording)
- Sheets slide up with an iOS spring; popover menus scale in from their
  button (origin-aware) with a glass blur.
- Tab switch: no transition on content; tab pill highlight moves.
- Completing a habit: circle flips to white with a ✓, card fills with the
  colour, the week-strip ring advances, confetti burst, haptic.
- Week strip: horizontal paging by week with the title following.
- Statistics chips: outline animates in on select.

---------------------------------------------------------------------------

## 9. Build plan for the replica (Tally, web + Capacitor)
1. Habits screen: gradient ground, header, week strip with rings, cards
   with grid/bars/line/off views, badges, action circle, tab bar.
2. Habit detail sheet with the ring counter.
3. Templates sheet in Grit's layout (content to be replaced later).
4. Add/Edit Habit page (grouped list form).
5. Statistics page, all blocks.
6. Settings page and sub-pages (those that apply: appearance, theme,
   sort, progress view, more, day start, week start, sounds, groups,
   achievements, archived, export, delete).
7. Sharing placeholder, reorder modal, menus.
8. Compare every screen against the reference screenshot at 428×926 and
   iterate to pixel parity.

Then diverge before release: new name and icon, own icon set instead of
emoji, own template list, own palette, remove Sharing/Premium copy.
