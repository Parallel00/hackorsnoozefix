"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;

/** Get and show stories when site first loads. */

async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.remove();

  putStoriesOnPage();
}

/**
 * A render method to render HTML for an individual Story instance
 * - story: an instance of Story
 *
 * Returns the markup for the story.
 */

function generateStoryMarkup(story, delBTNShow = false) {
  console.debug("generateStoryMarkup", story);

    const hostName = story.getHostName();
    const seeStar = Boolean(currentUser);
  return $(`
      <li id="${story.storyId}">
      <div>
        ${delBTNShow ? delBTN() : ""}
        ${seeStar ? starr(story, currentUser) : ""}
        <a href="${story.url}" target="a_blank" class="story-link">
          ${story.title}
        </a>
        <small class="story-hostname">(${hostName})</small>
        <small class="story-author">by ${story.author}</small>
        <small class="story-user">posted by ${story.username}</small>
      </li>
    `);
}


/** Gets list of stories from server, generates their HTML, and puts on page. */

function putStoriesOnPage() {
  console.debug("putStoriesOnPage");

  $allStoriesList.empty();

  // loop through all of our stories and generate HTML for them
  for (let story of storyList.stories) {
    const $story = generateStoryMarkup(story);
    $allStoriesList.append($story);
  }

  $allStoriesList.show();
}


function starr(stry, usr) {
    const fav = usr.isFavorite(stry);
    const sttype = fav ? "fas" : "far";
    return `<span class="star"><i class="${sttype} fa-star"></i></span>`
}

function delBTN() {
    return `<span class="gbin"><i class="fas fa-trash-alt"></i></span>`;
}


async function delStory(e) {
    const $closeLii = $(e.target).closest("li");
    const id = $closeLii.attr("id");

    await storyList.removeStory(currentUser, id);

    await userStories();
}

$ownStories.on("click", ".gbin", delStory);

async function subStory(e) {
    e.preventDefault();
    
    const ti = $("#create-title").val();
    const url = $("#create-url").val();
    const aut = $("#create-author").val();
    
    if (!ti || !aut || !url) {
        alert("Please fill in all fields.");
        return;
    }
    
    const data = { 
    title: ti, 
    author: aut, 
    url: url,
    username: currentUser.username
};


    console.log("Submitting story with data:", data);
    
    try {
        const stry = await storyList.addStory(currentUser, data);
        const $stry = generateStoryMarkup(stry);
        $allStoriesList.prepend($stry);
        $submitfrm.slideUp("slow");
        $submitfrm.trigger("reset");
    } catch (error) {
        console.error("Error submitting story:", error);
        if (error.response) {
            console.error("Error response data:", error.response.data);
            alert("Failed to submit story: " + error.response.data.message);
        } else {
            alert("Failed to submit story: " + error.message);
        }
    }
}





$submitfrm.on("submit", subStory);

function userStories() {
    $ownStories.empty();

    if (currentUser.ownStories.length === 0) {
        $ownStories.append("<h5>There aren't any stories here yet... Why not submit one?</h5>");
    } else {
        for (let story of currentUser.ownStories) {
            let $story = generateStoryMarkup(story, true);
            $ownStories.append($story);
        }
    }
    $ownStories.show();
}

/* Favorites functionality */

function favoritesList() {
    $favoriteStories.empty();
    if (currentUser.favorites.length === 0) {
        $favoriteStories.append("<h5>No favorites here.</h5>")
    } else {
        for (let story of currentUser.favorites) {
            const $story = generateStoryMarkup(story);
            $favoriteStories.append($story);
        }
    }
    $favoriteStories.show();
}

async function favToggle(e) {
    const $tar = $(e.target);
    const $licls = $tar.closest("li");
    const styID = $licls.attr("id");
    const stry = storyList.stories.find(s => s.storyId === styID);

    console.debug("favToggle:", { styID, stry }); // Log for debugging

    if (!stry) {
        console.error("Story not found for ID:", styID);
        return; // Exit if the story is not found
    }

    if ($tar.hasClass("fas")) {
        await currentUser.removeFav(stry);
        $tar.closest("i").toggleClass("fas far");
    } else {
        await currentUser.addFav(stry);
        $tar.closest("i").toggleClass("fas far");
    }
}


$storiesList.on("click", ".star", favToggle);