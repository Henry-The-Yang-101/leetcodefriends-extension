async function waitForElement(selector) {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        resolve(element);
      }
    }, 100);
  });
}

async function loadFriendsData(container, username) {
  console.log('Loading friends data for:', username);
  try {
    const response = await fetch(`http://127.0.0.1:5000/friends?username=${username}`);
    const result = await response.json();
    if (result.friends) {
      renderFriends(result.friends, container);
    } else {
      console.error('No friends data found in response', result);
    }
  } catch (error) {
    console.error('Failed to load friends data:', error);
  }
}

function renderFriends(friendsData) {
  const container = document.getElementById('friends-container');
  container.innerHTML = '';

  friendsData.forEach(friend => {
    const card = document.createElement('div');
    card.style.border = '1px solid #ddd';
    card.style.borderRadius = '8px';
    card.style.padding = '12px';
    card.style.background = '#fff';
    card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';

    const username = document.createElement('h3');
    username.textContent = friend.friend_username;
    username.style.margin = '0 0 8px 0';
    username.style.fontSize = '16px';
    username.style.fontWeight = '600';

    const subtitle = document.createElement('div');
    subtitle.textContent = 'Recent Submissions';
    subtitle.style.fontSize = '14px';
    subtitle.style.marginBottom = '6px';
    subtitle.style.color = '#333';

    const list = document.createElement('ul');
    list.style.margin = '0';
    list.style.padding = '0 0 0 20px';

    if (friend.data?.recentAcSubmissions?.length > 0) {
      friend.data.recentAcSubmissions.forEach(sub => {
        const item = document.createElement('li');
        const date = new Date(Number(sub.timestamp) * 1000);
        item.textContent = `${sub.title} (at ${date.toLocaleString()})`;
        item.style.fontSize = '13px';
        item.style.color = '#444';
        list.appendChild(item);
      });
    } else {
      const noSubmissions = document.createElement('li');
      noSubmissions.textContent = 'No recent submissions';
      noSubmissions.style.fontSize = '13px';
      noSubmissions.style.color = '#888';
      list.appendChild(noSubmissions);
    }

    card.appendChild(username);
    card.appendChild(subtitle);
    card.appendChild(list);
    container.appendChild(card);
  });
}

function addFriendsButton() {
  window.addEventListener("pageshow", async () => {
    const isDark = document.documentElement.classList.contains("dark");
    const currentUrl = window.location.href;

    let friendsButton = document.createElement("a");
    friendsButton.className = "group relative flex h-8 items-center justify-center rounded p-1 hover:bg-fill-3 dark:hover:bg-dark-fill-3 cursor-pointer";
    friendsButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="22" height="22" class="text-text-secondary dark:text-text-secondary hover:text-text-primary dark:hover:text-text-primary">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5s-3 1.34-3 3 1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 2.01 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
    `;
    friendsButton.title = "Friends";

    const popup = document.createElement("div");
    // Set popup styling with opacity transition for smooth fade in/out (position will be set dynamically)
    popup.className = "absolute text-text-secondary dark:text-dark-text-secondary rounded shadow-2xl p-2 pt-3 text-sm transition-opacity duration-200";
    popup.style.opacity = "0";
    popup.style.pointerEvents = "none";
    popup.style.zIndex = "9999";
    popup.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.4)";
    popup.style.backgroundColor = isDark ? "#1e1e1e" : "#ffffff";

    fetch(chrome.runtime.getURL("popup_content.html"))
      .then(response => response.text())
      .then(html => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        popup.appendChild(wrapper);

        const friendsTab = wrapper.querySelector("#friends-tab");
        const leaderboardTab = wrapper.querySelector("#leaderboard-tab");
        const friendsView = wrapper.querySelector("#friends-view");
        const leaderboardView = wrapper.querySelector("#leaderboard-view");

        // Set initial active state
        friendsTab.style.backgroundColor = "#ffa1161f";
        friendsTab.style.color = "#ffa116";
        leaderboardTab.style.backgroundColor = "white";
        leaderboardTab.style.color = "#333";

        friendsTab.addEventListener("click", () => {
          // Update button styles
          friendsTab.style.backgroundColor = "#ffa1161f";
          friendsTab.style.color = "#ffa116";
          leaderboardTab.style.backgroundColor = "white";
          leaderboardTab.style.color = "#333";

          // Update view visibility
          friendsView.style.display = "block";
          leaderboardView.style.display = "none";
        });

        leaderboardTab.addEventListener("click", () => {
          // Update button styles
          leaderboardTab.style.backgroundColor = "#ffa1161f";
          leaderboardTab.style.color = "#ffa116";
          friendsTab.style.backgroundColor = "white";
          friendsTab.style.color = "#333";

          // Update view visibility
          leaderboardView.style.display = "block";
          friendsView.style.display = "none";
        });
      })
      .catch(error => {
        console.error("Failed to load external HTML:", error);
      });

    const extractor_script = document.createElement("script");
    extractor_script.src = chrome.runtime.getURL("username_extractor.js");
    extractor_script.onload = () => extractor_script.remove();
    (document.head || document.documentElement).appendChild(extractor_script);

    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      if (event.data?.type === "LEETCODE_USERNAME") {
        const username = event.data.username;
        const friendsContainer = popup.querySelector("#friends-container");
        friendsContainer.innerHTML = '';
        friendsContainer.style.maxHeight = '400px';
        friendsContainer.style.overflowY = 'auto';
        loadFriendsData(friendsContainer, username);
      }
    });

    document.body.appendChild(popup);

    // Toggle the popup's visibility on click
    friendsButton.addEventListener("click", () => {
      if (popup.style.opacity === "1") {
        popup.style.opacity = "0";
        popup.style.pointerEvents = "none";
        friendsButton.classList.remove("bg-fill-3", "dark:bg-dark-fill-3");
      } else {
        const rect = friendsButton.getBoundingClientRect();
        popup.style.top = (rect.bottom + window.scrollY + 12) + 'px';
        popup.style.right = '3px';
        popup.style.height = 'auto';
        popup.style.maxHeight = '500px';
        const friendCenter = rect.left + rect.width / 2;
        const newWidth = (window.innerWidth - friendCenter - 3) * 2;
        popup.style.width = newWidth + 'px';
        popup.style.opacity = "1";
        popup.style.pointerEvents = "auto";
        friendsButton.classList.add("bg-fill-3", "dark:bg-dark-fill-3");

        const closeOnClickOutside = (event) => {
          if (!popup.contains(event.target) && !friendsButton.contains(event.target)) {
            popup.style.opacity = "0";
            popup.style.pointerEvents = "none";
            friendsButton.classList.remove("bg-fill-3", "dark:bg-dark-fill-3");
            document.removeEventListener("click", closeOnClickOutside);
          }
        };
        setTimeout(() => {
          document.addEventListener("click", closeOnClickOutside);
        }, 0);

        const closeOnEsc = (event) => {
          if (event.key === "Escape") {
            popup.style.opacity = "0";
            popup.style.pointerEvents = "none";
            friendsButton.classList.remove("bg-fill-3", "dark:bg-dark-fill-3");
            document.removeEventListener("keydown", closeOnEsc);
          }
        };
        document.addEventListener("keydown", closeOnEsc);
      }
    });

    const selectorMap = [
      {
        pattern: "https://leetcode.com/problems/",
        selector: "nav.z-nav-1 .relative.ml-4.flex.items-center.gap-2",
        insertIndex: 3
      },
      {
        pattern: "https://leetcode.com",
        selector: "nav#leetcode-navbar .relative.flex.items-center.space-x-2",
        insertIndex: 2
      }
    ];

    let container;
    let insertIndex = 0;

    for (const { pattern, selector, insertIndex: index } of selectorMap) {
      if (currentUrl.startsWith(pattern)) {
        container = await waitForElement(selector);
        insertIndex = index;
        break;
      }
    }

    if (!container) {
      console.warn("Navbar container not found!");
      return;
    }

    container.insertBefore(friendsButton, container.children[insertIndex]);
  });
}

addFriendsButton(); // Call the function manually
