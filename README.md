This script highlights new comments since your last visit, and collapses all comments that are older.
It also adds a button to load all comments hidden behind a "load more comments" or "" link. This can take some time, so an alert popup will be shown when it's done.
This script only works on Old Reddit.

[Install/Update](https://raw.githubusercontent.com/Yay295/Reddit-Highlight-Newest-Comments/refs/heads/main/Reddit%20Highlight%20Newest%20Comments.user.js)

Based on https://greasyfork.org/en/scripts/1868-reddit-highlight-newest-comments v1.5.7 by [JonnyRobbie](https://github.com/jonnyrobbie).

## Changelog
- 1.10.0
  - add note about the most recent comment
- 1.9.6
  - support uncollapsing "contest mode" replies
- 1.9.5
  - speed up loading all comments
- 1.9.4
  - run on old.reddit.com pages too
- 1.9.3
  - give comment links a different ID from their post
- 1.9.2
  - fix collapsing comments when they have a new comment reply that is not collapsed
  - alert when done loading all comments
- 1.9.1
  - only add the "load all comments" button if there are more comments to load
  - fix collapsing comments when they have a new comment reply that is collapsed
- 1.9.0
  - add button to load all comments
  - fix comments being uncollapsed when loading more
- 1.8.1
  - check comment edited time instead of post time if it's been edited
- 1.8.0
  - remove mod/gold check, instead checking that the box exists
  - replace existing box with our own box so it calls our functions
  - unhighlight posts when "no highlighting" is selected
- 1.7.6
  - fix adding time selector on archived pages
  - fix uncollapsing all comments when "no highlighting" is selected
- 1.7.5
  - uncollapse all comments when "no highlighting" is selected
- 1.7.4
  - more efficient code for "load more comments" buttons
  - uncollapse comments before checking if they should be collapsed
- 1.7.3
  - changed history expiration from one week to one month
- 1.7.2
  - fixed "load more comments" links on the first time viewing a page
- 1.7.1
  - fixed hideReadComments() (bug in Firefox?)
- 1.7.0
  - more refactoring
  - now re-highlights comments when a "load more comments" link is clicked (including previously dismissed new comments)
  - now collapses previously read comments that don't have new replies
  - fixed highlightBetterChild()
- 1.6.1
  - major refactoring
  - localStorage now stores the date of the last 5 visits, oldest first
  - highlighting now uses subreddit defaults
- 1.6.0
  - "use strict" added
  - formatting cleaned up
  - missing semicolons added
  - used more ES6 features
  - reduced comment spam
- 1.5.7
  - expand subreddit names
- 1.5.6
  - fix double UI when viewing thread as a mod
- 1.5.5
  - now works on subdomains
  - now works in subreddits with alphanumeric characters
  - some minor style changes
- 1.5.4
  - fixed not working
- 1.5.3
  - fixed a bug which caused the script to halt when the comment was too young to display score
- 1.5.2
  - some more bugs resulting from Reddit changes
- 1.5.1
  - fixed Reddit changes
- 1.4.2
  - tweaked some colors and timing
- 1.4.1
  - added highlighting comment with negative karma
  - added color shading dependent on the new comment age
  - added an option to manually edit the time of the last thread visit
- 1.3.1
  - Added expiration for localstorage, defaulted to 14 days. It won't grow indefinitely now.
  - Reduced the amount of console.log clutter
