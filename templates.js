/* Tally — habit templates, four kinds like Grit: Good, Health, Bad, To-do.
   Each entry: name, icon (Lucide), type (check/count/timer), target, unit,
   group (time of day), color (optional). Kind decides the default colour and
   how the habit behaves (to-dos are one-off). */
window.TEMPLATES = {
  good: { label: 'Good', color: '', sections: [
    ['Most popular', [
      ['Make your bed', 'bed', 'check'], ['Drink water', 'droplet', 'count', 8, 'glasses', 'Anytime'], ['Take a cold shower', 'snowflake', 'check'],
      ['Take vitamins', 'pill', 'check'], ['Wake up on time', 'alarm-clock', 'check'], ['Eat a healthy meal', 'salad', 'check', 1, '', 'Afternoon'],
      ['Brush your teeth', 'sparkles', 'count', 2, 'times', 'Anytime'], ['Read a book', 'book-open', 'timer', 15, '', 'Evening'], ['Take a shower', 'shower-head', 'check'],
      ['Go for a walk', 'footprints', 'timer', 20, '', 'Afternoon'], ['Plan tomorrow', 'list-checks', 'check', 1, '', 'Evening'], ['Meditate', 'brain', 'timer', 10]]],
    ['Mind', [
      ['Journal', 'pen-line', 'check', 1, '', 'Evening'], ['Learn a language', 'languages', 'timer', 15, '', 'Anytime'], ['Practice music', 'music', 'timer', 20, '', 'Evening'],
      ['Study', 'graduation-cap', 'timer', 30, '', 'Anytime'], ['Draw or paint', 'palette', 'timer', 20, '', 'Evening'], ['Gratitude', 'heart', 'check', 1, '', 'Evening']]],
    ['Home & people', [
      ['Tidy up', 'sparkles', 'check', 1, '', 'Evening'], ['Call family', 'phone', 'check', 1, '', 'Evening'], ['Cook at home', 'utensils', 'check', 1, '', 'Evening'],
      ['Walk the dog', 'dog', 'check', 1, '', 'Anytime'], ['Save money', 'piggy-bank', 'check', 1, '', 'Anytime'], ['Skincare', 'sun', 'check', 1, '', 'Evening']]],
  ] },
  health: { label: 'Health', color: '#34c759', sections: [
    ['Activity', [
      ['Steps', 'footprints', 'count', 8000, 'steps', 'Anytime'], ['Run', 'activity', 'timer', 30, '', 'Morning'], ['Cycle', 'bike', 'timer', 30, '', 'Anytime'],
      ['Swim', 'activity', 'timer', 30, '', 'Anytime'], ['Ski', 'mountain-snow', 'timer', 60, '', 'Anytime'], ['Yoga', 'heart-pulse', 'timer', 20, '', 'Morning'],
      ['Dance', 'music', 'timer', 20, '', 'Evening'], ['Pilates', 'activity', 'timer', 20, '', 'Morning'], ['Tennis', 'target', 'timer', 60, '', 'Anytime'],
      ['Strength training', 'dumbbell', 'timer', 45, '', 'Anytime'], ['Stretch', 'activity', 'timer', 5, '', 'Morning'], ['Hike', 'mountain-snow', 'timer', 60, '', 'Anytime']]],
    ['Body', [
      ['Sleep 8 hours', 'moon', 'count', 8, 'hours', 'Evening'], ['Weigh in', 'scale', 'check', 1, '', 'Morning'], ['Eat fruit', 'apple', 'count', 2, 'pieces', 'Anytime'],
      ['Eat vegetables', 'salad', 'count', 3, 'portions', 'Anytime'], ['Take a bath', 'bath', 'check', 1, '', 'Evening'], ['Stand up and move', 'activity', 'count', 6, 'times', 'Anytime']]],
  ] },
  bad: { label: 'Bad', color: '#ff3b30', sections: [
    ['Body', [
      ["Don't snack", 'candy-off', 'check', 1, '', 'Anytime'], ["Don't bite your nails", 'hand', 'check', 1, '', 'Anytime'], ["Don't smoke", 'cigarette-off', 'check', 1, '', 'Anytime'],
      ["Don't drink alcohol", 'wine-off', 'check', 1, '', 'Evening'], ['No junk food', 'ban', 'check', 1, '', 'Anytime'], ['No soda', 'glass-water', 'check', 1, '', 'Anytime'],
      ['No late-night eating', 'moon', 'check', 1, '', 'Evening'], ['No sugar', 'candy-off', 'check', 1, '', 'Anytime']]],
    ['Mental wellbeing', [
      ["Don't swear", 'circle-slash', 'check', 1, '', 'Anytime'], ["Don't get angry", 'ban', 'check', 1, '', 'Anytime'], ["Don't complain", 'message-square', 'check', 1, '', 'Anytime'],
      ['Reduce negative self-talk', 'brain', 'check', 1, '', 'Anytime'], ['Stop overcommitting', 'calendar', 'check', 1, '', 'Anytime'], ['No doomscrolling', 'smartphone', 'check', 1, '', 'Anytime'],
      ['No phone in bed', 'smartphone', 'check', 1, '', 'Evening'], ['Less TV', 'tv', 'check', 1, '', 'Evening'], ['Less gaming', 'gamepad-2', 'check', 1, '', 'Evening']]],
  ] },
  todo: { label: 'To-do', color: '#5856d6', sections: [
    ['Most popular', [
      ['File taxes', 'file-text'], ['Renew passport', 'briefcase'], ['Plan a vacation', 'plane'], ['Update passwords', 'key'], ['Print documents', 'printer'],
      ['Buy a gift', 'gift'], ['Sign up for a gym', 'dumbbell'], ['Schedule a meeting', 'calendar'], ['Set up a budget', 'wallet'], ['Update résumé', 'file-text'],
      ["Renew driver's licence", 'car'], ["Book a doctor's appointment", 'heart-pulse'], ['Clean the garage', 'sparkles'], ['Call the bank', 'phone'], ['Back up photos', 'camera']]],
    ['Errands', [
      ['Grocery shopping', 'shopping-cart'], ['Return a package', 'briefcase'], ['Pay a bill', 'dollar-sign'], ['Get a haircut', 'shirt'], ['Visit a friend', 'users'], ['Book travel', 'map-pin']]],
  ] },
};
