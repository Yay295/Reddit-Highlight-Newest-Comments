// ==UserScript==
// @name          Reddit highlight newest comments
// @description   Highlights new comments in a thread since your last visit
// @namespace     https://greasyfork.org/users/98-jonnyrobbie
// @author        JonnyRobbie and Yay295
// @include       /https?:\/\/(([a-z]{2,3})\.)?reddit\.com\/r\/[a-zA-Z0-9_-]+\/comments\/.*/
// @grant         GM.setValue
// @grant         GM.getValue
// @grant         GM.listValues
// @grant         GM.deleteValue
// @version       1.12.2
// ==/UserScript==

"use strict";

/*-----settings-----*/
const expiration = 30 * 7 * 24 * 60 * 60 * 1000; // expiration time in milliseconds
const betterChildStyle = "3px solid #9AE"; // border of said comment
/*-----settings-----*/

// times in milliseconds
const now = Date.now();
const oneMinute = 60 * 1000;
const oneHour = 60 * oneMinute;
const oneDay = 24 * oneHour;
const oneWeek = 7 * oneDay;
const timeZoneOffset = new Date().getTimezoneOffset() * 60000;

// most recent comment time
let mostRecentTime = 0;


// adds a task while avoiding the 4ms delay from setTimeout
let addTask = (function() {
	let timeouts = [], channel = new MessageChannel();
	channel.port1.onmessage = evt => timeouts.length > 0 ? timeouts.shift()() : null;
	return func => channel.port2.postMessage(timeouts.push(func));
})();

// converts the time difference to a nice string to use in the time selector
function prettify(time) {
	if (time == 0) return "no highlighting";

	let timeString = "", difference = now - time;

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
			option.value = time;
			option.innerHTML = prettify(time);
		timeSelectSelect.appendChild(option);
	}

	timeSelectTitle.appendChild(timeSelectSelect);

	let timeSelectMostRecent = document.createElement("span");
		timeSelectMostRecent.id = "most-recent-comment";

	timeSelect.appendChild(timeSelectTitle);
	timeSelect.appendChild(timeSelectMostRecent);

	return timeSelect;
}

/**
 * Updates the most recent comment note in the time selector element based on the "mostRecentTime" global variable.
 */
function updateMostRecentComment() {
	let mostRecentSpan = document.getElementById("most-recent-comment");
	if (mostRecentSpan) {
		if (mostRecentTime === 0) {
			mostRecentSpan.innerText = "";
		} else {
			let timestring = prettify(mostRecentTime).replace(/(.*),/,"$1, and").replace(/^([^,]*),( and[^,]*)$/,"$1$2");
			let timestamp = new Date(mostRecentTime-timeZoneOffset).toISOString().replace("T"," ").replace(/\..+/,"");
			mostRecentSpan.innerText = "The most recent comment was made/edited " + timestring + " at " + timestamp + ".";
		}
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

	init: function(times,last_visit) {
		let initComplete = false;

		// array of mutation observers
		let observers = [];

		let moreCommentsButtons = document.getElementsByClassName("morecomments");


		// event callback to do the comment highlighting
		function highlightNewComments(event) {
			// Highlighting is applied to `.new-comment .usertext-body`,
			// so one "new-comment" will affect all of its children.

			function removeHighlighting(event) {
				event.stopPropagation();
				event.currentTarget.parentElement.parentElement.parentElement.classList.remove("new-comment");
				event.currentTarget.classList.remove("usertext-body");
				event.currentTarget.removeEventListener("click",removeHighlighting);
			}

			const rootNode = event.detail || document.body;
			const time = parseInt(event.currentTarget.value,10);

			if (time) {
				console.log("highlighting comments from " + prettify(time));

				let comments = Array.from(rootNode.getElementsByClassName("comment"));

				// remove highlighting
				for (let comment of comments) {
					comment.classList.remove("new-comment");
					let cc = comment.querySelector(":scope > .entry > form > div");
					if (cc) cc.classList.add("usertext-body");
				}

				// add highlighting
				for (let comment of comments) {
					if (comment.classList.contains("deleted")) continue;

					// the first element is the post time, the second element is the edit time
					const timeElements = comment.children[2].getElementsByTagName("time");
					const ctime = Date.parse(timeElements[timeElements.length-1].getAttribute("datetime"));
					if (ctime > time) comment.classList.add("new-comment");
					if (ctime > mostRecentTime) mostRecentTime = ctime;

					comment.querySelector(":scope > .entry > form > div").addEventListener("click",removeHighlighting,{"passive":true});
				}
			} else {
				// we need to check every comment because a comment can have an edit date more recent than its replies
				let comments = Array.from(rootNode.getElementsByClassName("comment"));
				for (let comment of comments) {
					if (comment.classList.contains("deleted")) continue;

					// the first element is the post time, the second element is the edit time
					const timeElements = comment.children[2].getElementsByTagName("time");
					const ctime = Date.parse(timeElements[timeElements.length-1].getAttribute("datetime"));
					if (ctime > mostRecentTime) mostRecentTime = ctime;
				}
			}

			updateMostRecentComment();

			if (time || !initComplete) { // re-apply highlighting when more comments are loaded
				for (let observer of observers) observer.disconnect();
				observers = [];
				for (let more of moreCommentsButtons) {
					let container = more.parentElement.parentElement.parentElement;
					let observer = new MutationObserver(mutations => document.getElementById("comment-visits").dispatchEvent(new CustomEvent("change",{detail:container})));
					observer.observe(container,{childList:true});
					observers.push(observer);
				}
			}

			if (time && initComplete) hideReadComments(rootNode);
			if (time == 0) { // uncollapse all comments and remove highlighting
				let selector = (rootNode == document.body ? "" : ".clearleft + .clearleft ~ ") + ".collapsed > div > p > a.expand";
				let collapsed = rootNode.querySelectorAll(selector);
				for (let comment of collapsed) comment.click();
				let newComments = rootNode.querySelectorAll(".new-comment");
				for (let comment of newComments) comment.classList.remove("new-comment");
			}
		}

		// add selector to choose how long ago to highlight comments from (includes function to highlight comments)
		function addTimeSelector(times) {
			let timeSelect = generateTimeSelector(times);
				timeSelect.className = "rounded gold-accent comment-visits-box";

			let timeSelectTitle = timeSelect.children[0];
				timeSelectTitle.className = "title";

			let timeSelectSelect = timeSelectTitle.children[0];
				timeSelectSelect.id = "comment-visits";
				timeSelectSelect.addEventListener("change",highlightNewComments,{"passive":true});

			let commentarea = document.getElementsByClassName("commentarea")[0];
			let commentContainer = commentarea.querySelector(":scope > div.sitetable");
			commentarea.insertBefore(timeSelect,commentContainer);

			return timeSelectSelect;
		}

		function addLoadAllCommentsButton() {
			let btn = document.createElement("button");

			let wasLoading = false;
			function callback() {
				// These replies are just hidden using CSS, so we don't have
				// to wait for them to be downloaded from the server.
				let showRepliesButtons = document.querySelectorAll(".showreplies");
				for (let showRepliesButton of showRepliesButtons) {
					showRepliesButton.click();
				}

				if (moreCommentsButtons.length) {
					let isLoading = moreCommentsButtons[0].textContent == "loading...";

					if (!isLoading || wasLoading)
						moreCommentsButtons[0].firstElementChild.click();

					if (isLoading && wasLoading)
						setTimeout(callback,500);
					else addTask(callback);

					wasLoading = isLoading;
				} else {
					btn.remove();
					alert("done loading all comments");
				}
			}

			btn.innerHTML = "load all comments";
			btn.style.margin = "0px 5px 15px";
			btn.style.padding = "7px 10px 7px 7px";
			btn.addEventListener("click",callback,{"passive":true});

			let commentarea = document.getElementsByClassName("commentarea")[0];
			let commentContainer = commentarea.querySelector(":scope > div.sitetable");
			commentarea.insertBefore(btn,commentContainer);
		}

		// highlight child comment if it has better karma than its parent
		function highlightBetterChild(comment) {
			let scoreTag = comment.getElementsByClassName("tagline")[0].getElementsByClassName("unvoted");
			let scorechild = scoreTag.length ? parseInt(scoreTag[0].innerHTML) : 0;
			scoreTag = comment.parentNode.parentNode.parentNode.getElementsByClassName("tagline")[0].getElementsByClassName("unvoted");
			let scoreparent = scoreTag.length ? parseInt(scoreTag[0].innerHTML) : 0;

			let voted = comment.getElementsByClassName("midcol")[0].className;
			if (voted == "midcol likes") ++scorechild;
			else if (voted == "midcol dislikes") --scorechild;

			voted = comment.parentNode.parentNode.parentNode.getElementsByClassName("midcol")[0].className;
			if (voted == "midcol likes") ++scoreparent;
			else if (voted == "midcol dislikes") --scoreparent;

			if (scoreparent < scorechild && comment.parentNode.parentNode.parentNode.className != "content")
				comment.style.setProperty("border-left", betterChildStyle, "important");
		}

		// hides comments you've already seen that don't have any unread children
		function hideReadComments(rootNode) {
			console.log("hiding already-read comments");

			let count = 0;
			// The root node is changed and added after everything else so that we
			// don't accidentally grab comments that have been manually collapsed.
			let comments = Array.from(rootNode.getElementsByClassName("comment")).reverse();
			rootNode = rootNode.parentElement.closest(".comment") || rootNode;
			if (rootNode.classList.contains("comment")) comments.push(rootNode);

			while (true) {
				for (let comment of comments) {
					// comment is collapsed
					if (comment.classList.contains("collapsed")) {
						if (rootNode == document.body) // and we aren't loading more comments
							comment.querySelector(".expand").click(); // uncollapse it
						else continue; // otherwise skip it
					}

					// comment is new
					if (comment.classList.contains("new-comment")) continue;

					// comment has a new reply (not necessarily a direct reply) that is not collapsed
					let newReply = comment.querySelector(".comment.new-comment:not(.collapsed)");
					if (newReply) {
						// if this is a direct reply
						if (newReply.parentElement.closest(".comment") == comment) continue;

						// otherwise check all of the comments between the comment and the reply to see if they are collapsed
						do { newReply = newReply.parentElement.closest(".comment");
						} while (newReply != comment && !newReply.classList.contains("collapsed"));

						// if none of them were collapsed
						if (newReply == comment) continue;
					}

					// comment has replies (not necessarily direct replies) hidden under a "load more comments" link
					if (comment.querySelector(".morecomments") || document.querySelector(".showreplies")) {
						continue;
					}

					// otherwise
					comment.querySelector(".expand").click(); // hide comment
					++count;
				}

				// if we collapsed everything, check the parent comment
				if (rootNode.classList.contains("collapsed")) {
					rootNode = rootNode.parentElement.closest(".comment");
					if (rootNode) comments = [rootNode];
					else break;
				} else break;
			}

			console.log(count + " comments collapsed");
		}


		// Remove the "comment-visits" box if it exists.
		const cv = document.getElementById("comment-visits");
		if (cv !== null) cv.parentElement.parentElement.remove();
		// The last time is now, so we don't want to show that in the selector.
		let selector_times = times.toReversed().slice(1);
		// Add the "no highlighting" time.
		selector_times.push(0);
		// Create a new "comment-visits" box and trigger the selector.
		addTimeSelector(selector_times).dispatchEvent(new Event("change"));

		if (moreCommentsButtons.length || document.querySelector(".showreplies")) {
			addLoadAllCommentsButton();
		}

		let comments = document.getElementsByClassName("comment");
		for (let comment of comments) highlightBetterChild(comment);

		if (last_visit != now) hideReadComments(document.body);

		initComplete = true;
	}
};

const NEW_REDDIT = {
	getThreadID: function() {
		const post_element = document.querySelector('div[id^="t3_"][tabindex]');
		const post_id = post_element.id.split("_")[1];
		let comment_id = null;
		if (Array.from(post_element.parentElement.querySelectorAll(":scope > div > div > a")).find(x => x.innerText === "Show parent comments")) {
			comment_id = document.querySelector('div[data-scroller-first] div[id^="t1_"][tabindex]').id.split("_")[1];
		}
		return "redd_id_" + post_id + (comment_id ? "_" + comment_id : "");
	},

	init: function(times,last_visit) {
		// TODO
		// New Reddit does support highlighting new comments natively, but it's very limited compared to what this script does for Old Reddit.
		// New Reddit does not appear to auto-collapse replies on "contest mode" posts.
	}
}

const NEW_NEW_REDDIT = {
	getThreadID: function() {
		const comment_tree_element = document.querySelector("shreddit-comment-tree");
		const post_id = comment_tree_element.getAttribute("post-id").split("_")[1];
		let comment_id = null;
		if (comment_tree_element.hasAttribute("thingid")) {
			comment_id = comment_tree_element.getAttribute("thingid").split("_")[1];
		}
		return "redd_id_" + post_id + (comment_id ? "_" + comment_id : "");
	},

	init: function(times,last_visit) {
		/**
		 * Highlights a comment and adds an event listener to unhighlight it on click.
		 * New New Reddit does not currently support highlighting new comments natively,
		 * so this uses the same background color as Old Reddit.
		 * @param comment - A <shreddit-comment> element.
		 */
		function highlightComment(comment) {
			let comment_body = comment.querySelector(":scope > div.md");
			comment_body.style.backgroundColor = "#E5EFFF";
			comment_body.style.marginBottom = "0.25rem";
			comment_body.addEventListener("click",unhighlightCommentCallback,{"passive":true});
		}

		/**
		 * Unhighlights a comment and removes the event listener to unhighlight it on click.
		 * @param comment - A <shreddit-comment> element.
		 */
		function unhighlightComment(comment) {
			let comment_body = comment.querySelector(":scope > div.md");
			comment_body.style.backgroundColor = null;
			comment_body.style.marginBottom = null;
			comment_body.removeEventListener("click",unhighlightCommentCallback);
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
			let times = comment.querySelectorAll(':scope > div[slot=commentMeta] time');
			return Math.max(...Array.from(times).map(e => Date.parse(e.dateTime)));
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
				console.log("highlighting comments from " + prettify(time));
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
				event => highlightNewComments(document.querySelectorAll("shreddit-comment")),
				{"passive":true}
			);

		/**
		 * @param comments - The list of <shreddit-comment> elements to process.
		 */
		function processChanges(comments) {
			// Add the time selector to the page.
			let comment_body_header = main_content.querySelector("comment-body-header");
			if (comment_body_header && !comment_body_header.contains(time_selector_container)) {
				comment_body_header.appendChild(time_selector_container);
			}

			highlightNewComments(comments);

			for (let comment of comments) {
				let comment_time = getCommentTime(comment);
				if (comment_time > mostRecentTime) {
					mostRecentTime = comment_time;
				}
			}
			updateMostRecentComment();

			// TODO
			// New New Reddit does auto-collapse replies on "contest mode" posts.
		}

		// New New Reddit loads comments as you scroll, so we need to detect that.
		// No comment data is in the initial page HTML.
		const main_content = document.getElementById("main-content");
		new MutationObserver(mutations => {
			let all_added_comments = new Set();
			for (let mutation of mutations) {
				for (let node of mutation.addedNodes) {
					if (node.tagName === "SHREDDIT-COMMENT") {
						all_added_comments.add(node);
					}
				}
			}
			processChanges(comments);
		}).observe(main_content,{subtree:true,childList:true});

		// Some of the page may have already loaded, so we need to process anything the MutationObserver missed.
		processChanges(main_content.querySelectorAll("shreddit-comment"));
	}
}


async function init() {
	let reddit;
	if (document.querySelector("body.comments-page") !== null) {
		console.log("detected old reddit comment page");
		reddit = OLD_REDDIT;
	} else if (document.querySelector('div[id^="t1_"][tabindex]') !== null) {
		console.log("detected new reddit comment page");
		reddit = NEW_REDDIT;
	} else if (document.querySelector("shreddit-comment-tree") !== null) {
		console.log("detected new new reddit comment page");
		reddit = NEW_NEW_REDDIT;
	} else {
		// TODO Add event listener to rerun init on New Reddit and New New Reddit if a post is opened in the current window.
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

	if (reddit === NEW_REDDIT) {
		console.log("support for new reddit not yet added");
		return;
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

	reddit.init(times,last_visit);
}
addEventListener("load",init,{"passive":true});
