This script highlights new comments since your last visit, and collapses all comments that are older.
It also adds a button to load all comments that are hidden behind a "load more comments" or "[show replies]"
link. This can take some time, so an alert popup will be shown when it's done. This script does not
follow "continue this thread" links since those actually lead to a new page. However, if you follow
one of those links yourself (or go to a comment permalink), this script will recognize comments on
that page.

All features are available on Old Reddit.  
No features are available on New Reddit.  
Only new comment highlighting is available on New New Reddit.

This script currently only works on New Reddit and New New Reddit if you open the post in a new tab,
because clicking on a post doesn't reload the page, so the script doesn't get triggered.

[Install/Update](https://raw.githubusercontent.com/Yay295/Reddit-Highlight-Newest-Comments/refs/heads/main/Reddit%20Highlight%20Newest%20Comments.user.js)

Based on https://greasyfork.org/en/scripts/1868-reddit-highlight-newest-comments v1.5.7 by [JonnyRobbie](https://github.com/jonnyrobbie).

## Changelog
- 1.12.3
  - Fix detecting new comments on New New Reddit.
- 1.12.2
  - Attach the `unhighlightComment` listener to the comment body instead of the full comment on New New Reddit.
- 1.12.1
  - Fix times shown in time selector on New New Reddit.
- 1.12.0
  - Add highlighting new comments to New New Reddit.
- 1.11.4
  - Fix getting the post ID for deleted posts on Old Reddit.
- 1.11.3
  - Add functions to get the thread ID for New Reddit and New New Reddit.
- 1.11.2
  - Add code to detect New Reddit and New New Reddit.
- 1.11.1
  - Refactor code to potentially support New Reddit in the future.
- 1.11.0
  - Store data in the script's storage rather than `localStorage`.
- 1.10.1
  - Mark all events as "passive".
- 1.10.0
  - Add note about when the most recent comment was made/edited.
- 1.9.6
  - Support uncollapsing "contest mode" replies.
- 1.9.5
  - Speed up loading all comments.
- 1.9.4
  - Run on old.reddit.com pages too.
- 1.9.3
  - Give comment links a different ID from their post.
- 1.9.2
  - Fix collapsing comments when they have a new comment reply that is not collapsed.
  - Alert when done loading all comments.
- 1.9.1
  - Only add the "load all comments" button if there are more comments to load.
  - Fix collapsing comments when they have a new comment reply that is collapsed.
- 1.9.0
  - Add button to load all comments.
  - Fix comments being uncollapsed when loading more.
- 1.8.1
  - Check comment edited time instead of post time if it's been edited.
- 1.8.0
  - Remove mod/gold check, instead checking that the box exists.
  - Replace existing box with our own box so it calls our functions.
  - Unhighlight posts when "no highlighting" is selected.
- 1.7.6
  - Fix adding time selector on archived pages.
  - Fix uncollapsing all comments when "no highlighting" is selected.
- 1.7.5
  - Uncollapse all comments when "no highlighting" is selected.
- 1.7.4
  - More efficient code for "load more comments" buttons.
  - Uncollapse comments before checking if they should be collapsed.
- 1.7.3
  - Changed history expiration from one week to one month.
- 1.7.2
  - Fixed "load more comments" links on the first time viewing a page.
- 1.7.1
  - Fixed `hideReadComments()` (bug in Firefox?).
- 1.7.0
  - More code refactoring.
  - Now re-highlights comments when a "load more comments" link is clicked (including previously dismissed new comments).
  - Now collapses previously read comments that don't have new replies.
  - Fixed `highlightBetterChild()`.
- 1.6.1
  - Major refactoring of script code.
  - `localStorage` now stores the date of the last 5 visits, oldest first.
  - Highlighting now uses subreddit defaults.
- 1.6.0
  - Script code cleaned up.
    - "use strict" added.
    - Formatting cleaned up.
    - Missing semicolons added.
    - Used more ES6 features.
  - Reduced comment spam in the console.
- 1.5.7
  - Expand subreddit names.
- 1.5.6
  - Fix double UI when viewing thread as a mod.
- 1.5.5
  - Now works on subdomains.
  - Now works in subreddits with alphanumeric characters.
  - Some minor style changes.
- 1.5.4
  - Fixed not working.
- 1.5.3
  - Fixed a bug which caused the script to halt when the comment was too young to display score.
- 1.5.2
  - Some more bugs resulting from Reddit changes.
- 1.5.1
  - Fixed Reddit changes.
- 1.4.2
  - Tweaked some colors and timing.
- 1.4.1
  - Added highlighting of comments with negative karma.
  - Added color shading dependent on the new comment age.
  - Added an option to manually edit the time of the last thread visit.
- 1.3.1
  - Added expiration for `localStorage`, defaulted to 14 days. It won't grow indefinitely now.
  - Reduced the amount of console.log clutter
