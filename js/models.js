"use strict";

const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/******************************************************************************
 * Story: a single story in the system
 */

class Story {
  /** Make instance of Story from data object about story:
   *   - {title, author, url, username, storyId, createdAt}
   */
  constructor({ storyId, title, author, url, username, createdAt }) {
    this.storyId = storyId;
    this.title = title;
    this.author = author;
    this.url = url;
    this.username = username;
    this.createdAt = createdAt;
  }

  /** Parses hostname out of URL and returns it. */
  getHostName() {
    return new URL(this.url).host;
  }
}

/******************************************************************************
 * List of Story instances: used by UI to show story lists in DOM.
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /** Generate a new StoryList. It:
   *
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.
   */
  static async getStories() {
    const response = await axios({
      url: `${BASE_URL}/stories`,
      method: "GET",
    });

    const stories = response.data.stories.map(story => new Story(story));

    return new StoryList(stories);
  }

  /** Adds story data to API, makes a Story instance, adds it to story list.
   * - user - the current instance of User who will post the story
   * - obj of {title, author, url}
   *
   * Returns the new Story instance
   */
  async addStory(usr, { title, author, url }) {
    const token = usr.loginToken;
    const resp = await axios({
      method: "POST",
      url: `${BASE_URL}/stories`,
      data: { token, story: { title, author, url } },
    });
    const story = new Story(resp.data.story);
    this.stories.unshift(story);
    usr.ownStories.unshift(story);

    return story;
  }

  async removeStory(usr, storyId) {
    const token = usr.loginToken;
    await axios({
      url: `${BASE_URL}/stories/${storyId}`,
      method: "DELETE",
      data: { token }
    });
    this.stories = this.stories.filter(story => story.storyId !== storyId);
    usr.ownStories = usr.ownStories.filter(s => s.storyId !== storyId);
    usr.favorites = usr.favorites.filter(s => s.storyId !== storyId);
  }
}

/******************************************************************************
 * User: a user in the system (only used to represent the current user)
 */

class User {
  /** Make user instance from obj of user data and a token:
   *   - {username, name, createdAt, favorites[], ownStories[]}
   *   - token
   */
  constructor({
                username,
                name,
                createdAt,
                favorites = [],
                ownStories = []
              },
              token) {
    this.username = username;
    this.name = name;
    this.createdAt = createdAt;

    this.favorites = favorites.map(s => new Story(s));
    this.ownStories = ownStories.map(s => new Story(s));

    this.loginToken = token;
  }

  static async signup(username, password, name) {
    const response = await axios({
      url: `${BASE_URL}/signup`,
      method: "POST",
      data: { user: { username, password, name } },
    });

    let { user } = response.data;

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  static async login(username, password) {
    const response = await axios({
      url: `${BASE_URL}/login`,
      method: "POST",
      data: { user: { username, password } },
    });

    let { user } = response.data;

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  static async loginViaStoredCredentials(token, username) {
    try {
      const response = await axios({
        url: `${BASE_URL}/users/${username}`,
        method: "GET",
        params: { token },
      });

      let { user } = response.data;

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        token
      );
    } catch (err) {
      console.error("loginViaStoredCredentials failed", err);
      return null;
    }
  }

  async addFav(story) {
    console.log("Adding favorite story:", story);
    if (!story || !(story instanceof Story)) {
      console.error("Received:", story);
      throw new Error("Invalid story object provided.");
    }
    this.favorites.push(story);
    await this._addOrRemoveFav("add", story);
  }

  async removeFav(story) {
    console.log("Removing favorite story:", story);
    if (!story || !(story instanceof Story)) {
      console.error("Received:", story);
      throw new Error("Invalid story object provided.");
    }
    this.favorites = this.favorites.filter(s => s.storyId !== story.storyId);
    await this._addOrRemoveFav("remove", story);
  }

  async _addOrRemoveFav(action, story) {
    console.log(`_addOrRemoveFav action: ${action}, story:`, story);
    if (!story || !(story instanceof Story)) {
      console.error("Received:", story);
      throw new Error("Invalid story object provided.");
    }
    const method = action === "add" ? "POST" : "DELETE";
    const token = this.loginToken;
    await axios({
      url: `${BASE_URL}/users/${this.username}/favorites/${story.storyId}`,
      method: method,
      data: { token },
    });
  }

  isFavorite(story) {
    return this.favorites.some(s => (s.storyId === story.storyId));
  }
}

// Example usage
async function exampleUsage() {
  const user = await User.login('username', 'password'); // Assume this logs in the user and returns a User instance
  const storyData = { storyId: '1', title: 'Example Story', author: 'Author', url: 'http://example.com', username: 'authorUsername', createdAt: '2024-09-25' };
  const storyInstance = new Story(storyData);

  try {
    await user.addFav(storyInstance); // Should work now
  } catch (error) {
    console.error(error);
  }
}
