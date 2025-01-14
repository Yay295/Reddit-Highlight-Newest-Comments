// ==UserScript==
// @name          Reddit highlight newest comments
// @description   Highlights new comments in a thread since your last visit
// @namespace     https://greasyfork.org/users/98-jonnyrobbie
// @author        JonnyRobbie and Yay295
// @match         *://*.reddit.com/*
// @grant         GM.setValue
// @grant         GM.getValue
// @grant         GM.listValues
// @grant         GM.deleteValue
// @version       1.15.10
// ==/UserScript==

"use strict";

/*-----settings-----*/
const expiration = 30 * 7 * 24 * 60 * 60 * 1000; // expiration time in milliseconds
const betterChildStyle = "3px solid #9AE"; // border of said comment
/*-----settings-----*/

// time durations in milliseconds
const oneMinute = 60 * 1000;
const oneHour = 60 * oneMinute;
const oneDay = 24 * oneHour;
const oneWeek = 7 * oneDay;
const timeZoneOffset = new Date().getTimezoneOffset() * 60000;

// most recent comment time
const mostRecentTime = document.createElement("time");
	mostRecentTime.classList.add("live-timestamp");
	mostRecentTime.timestamp = 0;
const mostRecentSpan = document.createElement("span");


/**
 * Sorts the given list of elements so that an element that is the child of
 * another element in the list will be before its parent. Returns an array.
 */
function sortElementsChildrenFirst(elements) {
	return Array.from(elements).sort((c1,c2) => {
		if (c1 === c2) return 0;
		// https://developer.mozilla.org/en-US/docs/Web/API/Node/compareDocumentPosition
		return c1.compareDocumentPosition(c2) & Node.DOCUMENT_POSITION_FOLLOWING ? 1 : -1;
	});
}

// converts the time difference to a nice string to use in the time selector
function prettify(time) {
	if (time === 0) return "no highlighting";

	let timeString = "", difference = Date.now() - time;

	if (difference > oneDay) {
		const days = (difference / oneDay) | 0;
		timeString += days + " day" + (days > 1 ? "s" : "");
		difference -= days * oneDay;
	}
	if (difference > oneHour) {
		const hours = (difference / oneHour) | 0;
		timeString += (timeString ? ", " : "") + hours + " hour" + (hours > 1 ? "s" : "");
		difference -= hours * oneHour;
	}
	if (difference > oneMinute) {
		const minutes = (difference / oneMinute) | 0;
		timeString += (timeString ? ", " : "") + minutes + " minute" + (minutes > 1 ? "s" : "");
		difference -= minutes * oneMinute;
	}

	return (timeString || difference + "ms") + " ago";
}

/**
 * Generates the elements for the selector to choose how long ago to highlight comments from.
 * Does not add any styling or event listeners.
 */
function generateTimeSelector(times) {
	let timeSelect = document.createElement("div");

	let timeSelectTitle = document.createElement("div");
		timeSelectTitle.innerHTML = "Highlight comments posted since previous visit: ";

	let timeSelectSelect = document.createElement("select");

	for (let time of times) {
		let option = document.createElement("option");
			option.classList.toggle("live-timestamp", time !== 0);
			option.innerText = prettify(time);
			option.value = time;
		timeSelectSelect.appendChild(option);
	}

	timeSelectTitle.appendChild(timeSelectSelect);

	timeSelect.appendChild(timeSelectTitle);
	timeSelect.appendChild(mostRecentSpan);

	return timeSelect;
}

/**
 * Updates the most recent comment note in the time selector element based on the "mostRecentTime" global variable.
 */
function updateMostRecentComment() {
	if (mostRecentTime.timestamp === 0) {
		mostRecentSpan.innerText = "";
	} else {
		let datetime = new Date(mostRecentTime.timestamp-timeZoneOffset).toISOString().replace("T"," ").replace(/\..+/,"");
		mostRecentTime.dateTime = datetime;
		mostRecentTime.innerText = prettify(mostRecentTime.timestamp);
		mostRecentSpan.replaceChildren("The most recent comment was made/edited ", mostRecentTime, " at " + datetime + ".");
	}
}


const OLD_REDDIT = {
	getThreadID: function() {
		const post_id = document.querySelector('div[id^="siteTable_t3"]').id.split("_")[2];
		let comment_id = null;
		const permalinked_comment = document.querySelector("body.comment-permalink-page .commentarea > div > .comment");
		if (permalinked_comment !== null) {
			comment_id = permalinked_comment.dataset.fullname.split("_")[1];
		}
		return "redd_id_" + post_id + (comment_id ? "_" + comment_id : "");
	},

	init: function(times) {
		// MutationObserver
		let mo = null;

		/**
		 * Highlights the given comment if it was posted/edited more recently than the given time.
		 * Unhighlights the given comment if the given time is 0.
		 * Does nothing if the given comment is deleted.
		 * @return True if the comment is now highlighted.
		 */
		function highlightNewComment(comment,time) {
			if (comment.classList.contains("deleted")) {
				return false;
			}

			// we may have previously removed this class in "unhighlightComment()"
			comment.querySelector(":scope > .entry > form > div").classList.add("usertext-body");

			// the first element is the post time, the second element is the edit time
			const time_elements = comment.children[2].getElementsByTagName("time");
			const comment_time = Date.parse(time_elements[time_elements.length-1].dateTime);
			if (comment_time > mostRecentTime.timestamp) mostRecentTime.timestamp = comment_time;
			return comment.classList.toggle("new-comment", time !== 0 && comment_time > time);
		}

		function unhighlightCommentHandler(event) {
			let comment_body = event.target.closest(".usertext-body");
			if (comment_body) {
				let comment = comment_body.parentElement.parentElement.parentElement;
				if (comment.classList.contains("comment")) {
					comment.classList.remove("new-comment");
					// If we don't remove "usertext-body" a "new-comment" parent comment
					// will affect the styling of this comment.
					comment_body.classList.remove("usertext-body");
				}
			}
		}

		/**
		 * Collapses the given comment.
		 * @param comment - An element with the "comment" class.
		 * @return If the comment was collapsed.
		 */
		function collapseComment(comment) {
			let changed = comment.classList.replace("noncollapsed","collapsed");
			if (changed) comment.querySelector(".expand").textContent = "[+]";
			return changed;
		}

		/**
		 * Uncollapses the given comment.
		 * @param comment - An element with the "comment" class.
		 * @return If the comment was uncollapsed.
		 */
		function uncollapseComment(comment) {
			let changed = comment.classList.replace("collapsed","noncollapsed");
			if (changed) comment.querySelector(".expand").textContent = "[–]";
			return changed;
		}

		/**
		 * Gets the current score of the given comment element.
		 */
		function getCommentScore(comment) {
			let score_element = comment.querySelectorAll(":scope > .entry.dislikes .score.dislikes, :scope > .entry.unvoted .score.unvoted, :scope > .entry.likes .score.likes");
			return score_element ? parseInt(score_element.title,10) : 0;
		}

		/**
		 * Mark the given comment element if it has better karma than its parent.
		 */
		function markBetterChild(child) {
			let parent = child.parentElement.closest(".comment");
			if (parent && getCommentScore(parent) < getCommentScore(child)) {
				child.style.setProperty("border-left", betterChildStyle, "important");
			}
		}

		/**
		 * @return True if the given comment has replies that are new or not yet loaded,
		 *         and the replies have not been collapsed.
		 */
		function commentHasNewRepliesNotHidden(comment) {
			let potential_unhidden_replies = comment.querySelectorAll(".new-comment.noncollapsed,.morecomments,.showreplies");
			for (let to_check of potential_unhidden_replies) {
				// get the closest comment; possibly this same element
				to_check = to_check.closest(".comment");
				// "to_check" is a direct descendant of "comment"
				if (to_check === comment) {
					return true;
				}
				// look for a comment that is collapsed
				while (to_check !== comment && !to_check.classList.contains("collapsed")) {
					to_check = to_check.parentElement.closest(".comment");
				}
				// none of the comments are collapsed
				if (to_check === comment) {
					return true;
				}
			}
			return false;
		}

		/**
		 * @param comments - A collection of comment elements to process.
		 * @param parents - A collection of comment elements to process for collapsing/uncollapsing only.
		 */
		function processComments(comments,parents=[]) {
			const time = parseInt(document.getElementById("comment-visits").value,10);

			let num_highlighted = 0;
			let num_uncollapsed = 0;
			let num_collapsed = 0;

			let sorted_comments = sortElementsChildrenFirst(comments);
			let parent_comments = new Set(parents);

			for (let comment of sorted_comments) {
				let comment_is_new = highlightNewComment(comment,time);
				if (comment_is_new) ++num_highlighted;

				let visibility_changed = false;
				if (time === 0 || comment_is_new || commentHasNewRepliesNotHidden(comment)) {
					visibility_changed = uncollapseComment(comment);
					if (visibility_changed) ++num_uncollapsed;
				} else {
					visibility_changed = collapseComment(comment);
					if (visibility_changed) ++num_collapsed;
				}

				markBetterChild(comment);

				if (comment_is_new || visibility_changed) {
					// Since we changed this comment, we now need to also check its parent, if it has one.
					let parent = comment.parentElement.closest(".comment")
					if (parent) {
						parent_comments.add(parent);
					}
				}
			}

			// For the parent comments we only need to check if they should be collapsed;
			// they should not have their highlighting changed.
			parent_comments = new Set(sortElementsChildrenFirst(parent_comments));
			for (let comment of parent_comments) {
				let visibility_changed = false;
				if (commentHasNewRepliesNotHidden(comment)) {
					visibility_changed = uncollapseComment(comment);
					if (visibility_changed) ++num_uncollapsed;
				} else if (time !== 0 && !comment.classList.contains("new-comment")) {
					visibility_changed = collapseComment(comment);
					if (visibility_changed) ++num_collapsed;
				}

				// Remove this comment from the set so that - in case we somehow
				// try to add it back in the future - it will be re-processed.
				parent_comments.delete(comment);
				if (visibility_changed) {
					// Since we changed this comment, we now need to also check its parent, if it has one.
					let parent = comment.parentElement.closest(".comment")
					if (parent) {
						parent_comments.add(parent);
					}
				}
			}

			// The most recent comment time is updated in "highlightNewComment()".
			updateMostRecentComment();

			console.log("highlighted %i, uncollapsed %i, and collapsed %i comments", num_highlighted, num_uncollapsed, num_collapsed);
		}

		function mutationObserverCallback(mutations) {
			for (let mutation of mutations) {
				// If comments were added we can process them directly, but
				// sometimes comments aren't added when clicking the button to
				// load more comments, so in that case we should process the
				// parent of the "load more comments" button.
				let added_comments = Array.from(mutation.addedNodes).filter(node => node.classList && node.classList.contains("comment"))
				if (added_comments.length > 0) {
					processComments(added_comments);
				} else if (
					// a "load more comments" button was removed
					Array.from(mutation.removedNodes).some(node => node.classList && node.classList.contains("morechildren"))
					&& mutation.target.classList
					&& mutation.target.classList.contains("listing")
				) {
					let parent_comment = mutation.target.parentElement.parentElement;
					if (parent_comment.classList.contains("comment")) {
						processComments([],[parent_comment]);
					}
				}
			}
		}

		/**
		 * Adds a selector to choose how long ago to highlight comments from.
		 * Replaces the existing selector if there is one.
		 */
		function addTimeSelector(times) {
			// Remove the "comment-visits" box if it exists.
			const cv = document.getElementById("comment-visits");
			if (cv !== null) cv.parentElement.parentElement.remove();

			let timeSelect = generateTimeSelector(times);
				timeSelect.className = "rounded gold-accent comment-visits-box";

			let timeSelectTitle = timeSelect.children[0];
				timeSelectTitle.className = "title";

			let timeSelectSelect = timeSelectTitle.children[0];
				timeSelectSelect.id = "comment-visits";
				timeSelectSelect.addEventListener(
					"change",
					event => processComments(document.getElementsByClassName("comment")),
					{"passive":true}
				);

			let commentarea = document.querySelector(".commentarea");
			let commentContainer = commentarea.querySelector(":scope > div.sitetable");
			commentarea.insertBefore(timeSelect,commentContainer);
		}

		function addLoadAllCommentsButton() {
			let btn = document.createElement("button");

			function callback() {
				// These replies are just hidden using CSS, so we don't have
				// to wait for them to be downloaded from the server.
				let showRepliesButtons = document.querySelectorAll(".showreplies");
				for (let showRepliesButton of showRepliesButtons) {
					showRepliesButton.style.display = "none";
					for (let child of showRepliesButton.parentElement.children) {
						if (child.classList.contains("comment")) {
							child.style.display = null;
						}
					}
				}

				// Loading more comments can add a new morecomments link, so we need to wait
				// for all of them to be gone, even the ones that are currently loading.
				if (document.querySelector(".morecomments")) {
					let moreCommentsButton = document.querySelector(".morecomments:not(.loading)");
					if (moreCommentsButton) {
						// Add a class so we can skip this one next time.
						moreCommentsButton.classList.add("loading");
						// calls https://github.com/reddit-archive/reddit/blob/master/r2/r2/public/static/js/reddit.js#L464-L478
						moreCommentsButton.firstElementChild.click();
					}
					// The default Old Reddit rate limit is 333ms, so we have to do them one at a time.
					// https://github.com/reddit-archive/reddit/blob/master/r2/r2/public/static/js/jquery.reddit.js#L254-L279
					setTimeout(callback,334);
				} else {
					mutationObserverCallback(mo.takeRecords());
					mo.disconnect();
					mo = null;
					btn.remove();
					btn = null;
					alert("done loading all comments");
				}
			}

			btn.innerHTML = "load all comments";
			btn.style.margin = "0px 5px 15px";
			btn.style.padding = "7px 10px 7px 7px";
			btn.addEventListener("click",callback,{"passive":true});

			let commentarea = document.querySelector(".commentarea");
			let commentContainer = commentarea.querySelector(":scope > div.sitetable");
			commentarea.insertBefore(btn,commentContainer);
		}


		let comment_area = document.querySelector(".commentarea");
		let has_hidden_comments = comment_area.querySelector(".morecomments,.showreplies") !== null;

		// Add function to unhighlight comments when their body is clicked on.
		comment_area.addEventListener("click",unhighlightCommentHandler,{"passive":true});

		// The last time is now, so we don't want to show that in the selector.
		let selector_times = times.toReversed().slice(1);
		// Add the "no highlighting" time.
		selector_times.push(0);
		// Create a new "comment-visits" box.
		addTimeSelector(selector_times);

		if (has_hidden_comments) {
			addLoadAllCommentsButton();
		}

		processComments(comment_area.getElementsByClassName("comment"));

		if (has_hidden_comments) {
			mo = new MutationObserver(mutationObserverCallback);
			mo.observe(comment_area,{subtree:true,childList:true});
		}
	}
};

const NEW_NEW_REDDIT = {
	APP_ELEMENT: document.querySelector("shreddit-app"),
	APP_ELEMENT_MUTATION_OBSERVER: null,
	LAST_OBSERVED_THREAD_ID: null,

	getThreadID: function() {
		const comment_tree_element = document.querySelector("shreddit-comment-tree");
		if (comment_tree_element === null) {
			return null;
		}
		const post_id = document.querySelector("shreddit-post").id.split("_")[1];
		let comment_id = null;
		if (comment_tree_element.hasAttribute("thingid")) {
			comment_id = comment_tree_element.getAttribute("thingid").split("_")[1];
		}
		return "redd_id_" + post_id + (comment_id ? "_" + comment_id : "");
	},

	init: function(times) {
		const MORE_REPLIES_BUTTON_QUERY = 'faceplate-partial[loading="action"]';
		const COMMENT_BODY_SYMBOL = Symbol();
		const COMMENT_HIGHLIGHTED_SYMBOL = Symbol();

		let loading_all_comments = false;

		/**
		 * Adds a property to the given comment that is a reference to its body.
		 * This allows easier access to the comment body in other functions.
		 * @param comment - A <shreddit-comment> element.
		 */
		function linkCommentToCommentBody(comment) {
			// It seems like "targetElement" doesn't get set right away, so it's not available when this script first runs.
			comment[COMMENT_BODY_SYMBOL] = comment.targetElement || comment.querySelector(":scope > div.md");
		}

		/**
		 * Highlights a comment and adds an event listener to unhighlight it on click.
		 * New New Reddit does not currently support highlighting new comments natively,
		 * so this uses the same background color as Old Reddit.
		 * @param comment - A <shreddit-comment> element.
		 */
		function highlightComment(comment) {
			let comment_body = comment[COMMENT_BODY_SYMBOL];
			comment_body.style.backgroundColor = "#E5EFFF";
			comment_body.style.marginBottom = "0.25rem";
			comment_body.addEventListener("click",unhighlightCommentCallback,{"passive":true});
			comment[COMMENT_HIGHLIGHTED_SYMBOL] = true;
		}

		/**
		 * Unhighlights a comment and removes the event listener to unhighlight it on click.
		 * @param comment - A <shreddit-comment> element.
		 */
		function unhighlightComment(comment) {
			let comment_body = comment[COMMENT_BODY_SYMBOL];
			comment_body.style.backgroundColor = null;
			comment_body.style.marginBottom = null;
			comment_body.removeEventListener("click",unhighlightCommentCallback);
			comment[COMMENT_HIGHLIGHTED_SYMBOL] = false;
		}

		/**
		 * @param event - An event whose current target a <shreddit-comment> element.
		 */
		function unhighlightCommentCallback(event) {
			event.stopPropagation();
			unhighlightComment(event.currentTarget.parentElement);
		}

		/**
		 * @param comment - A <shreddit-comment> element.
		 * @return The submit/edit time of the given comment.
		 */
		function getCommentTime(comment) {
			// There might be more than one if the comment has been edited.
			// The <time> elements appear to be created dynamically, so we have to parse the <faceplate-timeago> elements instead.
			let times = comment.querySelectorAll(':scope > div[slot=commentMeta] faceplate-timeago');
			return Math.max(...Array.from(times).map(e => Date.parse(e.getAttribute("ts"))));
		}

		/**
		 * Goes through the given list of comments highlighting those that are
		 * newer than the selected time, and unhighlighting those that aren't.
		 * @param comments - The list of comments to highlight/unhighlight.
		 */
		function highlightNewComments(comments) {
			let time = parseInt(time_selector_selector.value,10);
			if (time === 0) {
				for (let comment of comments) {
					unhighlightComment(comment);
				}
			} else {
				console.log("highlighting " + comments.length + " comments from " + time_selector_selector.selectedOptions[0].innerText);
				for (let comment of comments) {
					let comment_time = getCommentTime(comment);
					if (comment_time >= time) {
						highlightComment(comment);
					} else {
						unhighlightComment(comment);
					}
				}
			}
		}

		/**
		 * Goes through the given list of comments collapsing those that are
		 * not highligted, do not have any highlighted children, and do not
		 * have any unloaded children. Highlighted comments and their ancestors
		 * will be uncollapsed. If the current selected time is 0, all comments
		 * will be uncollapsed.
		 * @param comments - The list of comments to hide/unhide.
		 */
		function hideOldComments(comments) {
			let collapsed = 0, uncollapsed = 0;
			if (parseInt(time_selector_selector.value,10) === 0) {
				for (let comment of comments) {
					if (comment.hasAttribute("collapsed")) {
						comment.removeAttribute("collapsed");
						++uncollapsed;
					}
				}
			} else {
				let sorted_comments = sortElementsChildrenFirst(comments);
				// Use a Set so that if we add more comments, we won't add one that's already in the list.
				let comment_set = new Set(sorted_comments);
				for (let comment of comment_set) {
					let changed = false;
					if (
						// this comment is not highlighted
						!comment[COMMENT_HIGHLIGHTED_SYMBOL]
						// this comment does not have any unloaded replies
						&& !comment.querySelector(MORE_REPLIES_BUTTON_QUERY)
						// all of this comment's direct children are not highlighted and are collapsed
						&& Array.from(comment.querySelectorAll(":scope > shreddit-comment")).every(reply => !reply[COMMENT_HIGHLIGHTED_SYMBOL] && reply.hasAttribute("collapsed"))
					) {
						if (!comment.hasAttribute("collapsed")) {
							comment.setAttribute("collapsed","");
							++collapsed;
							changed = true;
						}
					} else {
						if (comment.hasAttribute("collapsed")) {
							comment.removeAttribute("collapsed");
							++uncollapsed;
							changed = true;
						}
					}
					// Remove this comment from the set so that - in case we somehow
					// try to add it back in the future - it will be re-processed.
					comment_set.delete(comment);
					if (changed) {
						// Since we collapsed/uncollapsed this comment,
						// we now need to also check its parent, if it has one.
						if (comment.parentElement.tagName === "SHREDDIT-COMMENT") {
							comment_set.add(comment.parentElement);
						}
					}
				}
			}
			console.log("collapsed %i and uncollapsed %i comments", collapsed, uncollapsed);
		}

		function loadAllComments() {
			loading_all_comments = true;
			load_all_comments_button.remove();
			let moreRepliesButtons = document.querySelectorAll(MORE_REPLIES_BUTTON_QUERY);
			if (moreRepliesButtons.length > 0) {
				for (let btn of moreRepliesButtons) {
					btn.click();
				}
				setTimeout(loadAllComments,100);
			} else {
				alert("done loading all comments");
				loading_all_comments = false;
			}
		}

		// The last time is now, so we don't want to show that in the selector.
		let selector_times = times.toReversed().slice(1);
		// Add the "no highlighting" time.
		selector_times.push(0);

		// TODO Move this above the "Sort by" element? If so, add "my-sm" to the container classes.
		let time_selector_container = generateTimeSelector(selector_times);
			time_selector_container.className = "bg-neutral-background-container p-md xs:rounded-[16px]";

		let time_selector_label = time_selector_container.children[0];
			time_selector_label.className = "font-semibold";

		let time_selector_selector = time_selector_container.children[0].children[0];
			time_selector_selector.className = "button button-bordered cursor-auto m-0 px-[2px] py-[1px]";
			time_selector_selector.style.borderRadius = "var(--radius-sm)";
			time_selector_selector.addEventListener(
				"change",
				event => {
					let comments = document.querySelectorAll("shreddit-comment");
					highlightNewComments(comments);
					hideOldComments(comments);
				},
				{"passive":true}
			);

		let load_all_comments_button = document.createElement("button");
			load_all_comments_button.innerHTML = "load all comments";
			load_all_comments_button.className = "button button-bordered my-sm px-sm";
			load_all_comments_button.addEventListener("click",loadAllComments,{"passive":true});

		/**
		 * @param comments - The list of <shreddit-comment> elements to process.
		 */
		function processChanges(comments) {
			let comment_body_header = main_content.querySelector("comment-body-header") || main_content.querySelector("shreddit-comments-page-tools").shadowRoot.firstElementChild;
			if (comment_body_header) {
				// Add the time selector to the page.
				if (!comment_body_header.contains(time_selector_container)) {
					comment_body_header.appendChild(time_selector_container);
				}
				// Add the "load all comments" button to the page.
				if (!loading_all_comments && document.querySelector(MORE_REPLIES_BUTTON_QUERY) !== null && !comment_body_header.contains(load_all_comments_button)) {
					comment_body_header.appendChild(load_all_comments_button);
				}
			}

			for (let comment of comments) {
				linkCommentToCommentBody(comment);
				let comment_time = getCommentTime(comment);
				if (comment_time > mostRecentTime.timestamp) {
					mostRecentTime.timestamp = comment_time;
				}
			}
			updateMostRecentComment();

			highlightNewComments(comments);
			hideOldComments(comments);
		}

		// New New Reddit loads comments as you scroll, so we need to detect that.
		// No comment data is in the initial page HTML.
		const main_content = document.getElementById("main-content");
		new MutationObserver(mutations => {
			for (let mutation of mutations) {
				let all_added_comments = new Set();
				for (let node of mutation.addedNodes) {
					if (node.tagName === "SHREDDIT-COMMENT") {
						all_added_comments.add(node);
						let replies = node.querySelectorAll("shreddit-comment");
						for (let reply of replies) {
							all_added_comments.add(reply);
						}
					}
				}
				// If comments were added we can process them directly, but
				// sometimes comments aren't added when clicking the button to
				// load more replies, so in that case we should process the
				// parent of the "# more replies" button.
				if (all_added_comments.size > 0) {
					let all_added_comments_array = Array.from(all_added_comments);
					// Make sure all newly added comments start uncollapsed.
					// For some reason some load collapsed, but they're new, or have hidden replies,
					// so their parent doesn't get auto-collapsed, which can be confusing.
					for (let comment of all_added_comments_array) comment.removeAttribute("collapsed");
					processChanges(all_added_comments_array);
				} else if (mutation.target.tagName === "SHREDDIT-COMMENT") {
					// We only want to possibly collapse/uncollapse this comment, not change anything else about it.
					hideOldComments([mutation.target]);
				}
			}
		}).observe(main_content,{subtree:true,childList:true});

		// Some of the page may have already loaded, so we need to process anything the MutationObserver missed.
		let comments = main_content.querySelectorAll("shreddit-comment");
		if (comments.length > 0) {
			processChanges(comments);
		}
	}
}
// If we're on New New Reddit we need to watch for SPA navigations.
if (NEW_NEW_REDDIT.APP_ELEMENT !== null) {
	NEW_NEW_REDDIT.APP_ELEMENT_MUTATION_OBSERVER = new MutationObserver(mutations => {
		let new_thread_id = NEW_NEW_REDDIT.getThreadID();
		if (new_thread_id !== NEW_NEW_REDDIT.LAST_OBSERVED_THREAD_ID) {
			NEW_NEW_REDDIT.LAST_OBSERVED_THREAD_ID = new_thread_id;
			init().catch(error => console.error(error));
		}
	});
	NEW_NEW_REDDIT.APP_ELEMENT_MUTATION_OBSERVER.observe(NEW_NEW_REDDIT.APP_ELEMENT,{subtree:true,childList:true});
	NEW_NEW_REDDIT.LAST_OBSERVED_THREAD_ID = NEW_NEW_REDDIT.getThreadID();
}


// For Old Reddit we can get "now" when the script loads, but because New Reddit and New New Reddit are SPA's,
// we need to re-get "now" when we detect one of their comment pages.
let now = Date.now();
async function init() {
	let reddit = null;

	// Check if we're on a comment page.
	if (/^\/r\/[a-zA-Z0-9_-]+\/comments\//.test(location.pathname)) {
		if (document.querySelector("body.comments-page") !== null) {
			console.log("detected old reddit comment page");
			reddit = OLD_REDDIT;
		} else if (document.querySelector("shreddit-comment-tree") !== null) {
			console.log("detected new new reddit comment page");
			reddit = NEW_NEW_REDDIT;
			now = Date.now();
		}
	}

	if (reddit === null) {
		return;
	}

	console.log("current time " + now);

	// Get the current thread ID.
	const thread_id = reddit.getThreadID();
	console.log("thread id " + thread_id);

	// Migrate localStorage to script storage.
	for (const key in localStorage) {
		if (key.indexOf("redd_id_") == 0) {
			const value = localStorage.getItem(key);
			if (Number.isInteger(value)) {
				await GM.setValue(key,"["+value+"]");
			} else {
				await GM.setValue(key,value);
			}
			localStorage.removeItem(key);
		}
	}

	// Update the stored values for the current thread and get the previous value.
	const times = JSON.parse(await GM.getValue(thread_id,"[]"));
	times.push(now);
	// Sort smallest (oldest) to largest (newest).
	times.sort((a,b) => a-b);
	// Only store the latest five entries.
	await GM.setValue(thread_id,JSON.stringify(times.slice(-5)));
	let last_visit = now;
	if (times.length === 1) {
		console.log("thread has not been visited before");
	} else {
		last_visit = times[times.length-2];
	}
	console.log("last visit " + last_visit);

	// Remove old stored values.
	console.log("clearing old saved data");
	let num_purged = 0;
	const all_gm_stored_keys = await GM.listValues();
	for (const key of all_gm_stored_keys) {
		const key_times = JSON.parse(await GM.getValue(key));
		if (key_times[key_times.length-1] + expiration < now) {
			await GM.deleteValue(key);
			++num_purged;
		}
	}
	if (num_purged == 1) console.log("1 entry older than " + expiration + "ms has been removed");
	else console.log(num_purged + " entries older than " + expiration + "ms have been removed");

	reddit.init(times);

	// Update the datetime displays twice a minute.
	setInterval(() => {
		for (let option of document.querySelectorAll("option.live-timestamp")) {
			option.innerText = prettify(option.value);
		}
		mostRecentTime.innerText = prettify(mostRecentTime.timestamp);
	}, oneMinute / 2);
}
init().catch(error => console.error(error));
