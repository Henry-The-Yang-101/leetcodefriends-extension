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

function renderFriends(friendsData, container) {
  friendsData.forEach(friend => {
    // Create a div for each friend item (card)
    const friendCard = document.createElement('div');
    friendCard.className = 'friend-card';
    friendCard.style.border = '1px solid #ccc';
    friendCard.style.borderRadius = '6px';
    friendCard.style.padding = '8px';
    friendCard.style.marginBottom = '10px';

    // Friend header: Display the friend's username
    const header = document.createElement('h3');
    header.textContent = friend.friend_username || 'Unknown User';
    friendCard.appendChild(header);

    // Create section for Recent Accepted Submissions, if available
    if (friend.data?.recentAcSubmissions) {
      const recentSubmissionsDiv = document.createElement('div');
      const subHeading = document.createElement('h4');
      subHeading.textContent = 'Recent Submissions';
      recentSubmissionsDiv.appendChild(subHeading);

      const submissionList = document.createElement('ul');
      friend.data.recentAcSubmissions.forEach(submission => {
        const listItem = document.createElement('li');
        listItem.textContent = `${submission.title} (at ${new Date(Number(submission.timestamp) * 1000).toLocaleString()})`;
        submissionList.appendChild(listItem);
      });
      recentSubmissionsDiv.appendChild(submissionList);
      friendCard.appendChild(recentSubmissionsDiv);
    }

    // Create section for Questions Count if available
    if (friend.data?.allQuestionsCount) {
      const questionsDiv = document.createElement('div');
      const questionsHeading = document.createElement('h4');
      questionsHeading.textContent = 'Questions Count';
      questionsDiv.appendChild(questionsHeading);

      const questionsList = document.createElement('ul');
      friend.data.allQuestionsCount.forEach(item => {
        const itemEl = document.createElement('li');
        itemEl.textContent = `${item.difficulty}: ${item.count}`;
        questionsList.appendChild(itemEl);
      });
      questionsDiv.appendChild(questionsList);
      friendCard.appendChild(questionsDiv);
    }

    // Additional sections can be similarly added here—for example, user profile stats:
    if (friend.data?.userPublicProfile?.profile) {
      const profileDiv = document.createElement('div');
      const profileHeading = document.createElement('h4');
      profileHeading.textContent = 'Profile';
      profileDiv.appendChild(profileHeading);

      const profileContent = document.createElement('p');
      profileContent.textContent = `Ranking: ${friend.data.userPublicProfile.profile.ranking}`;
      profileDiv.appendChild(profileContent);
      friendCard.appendChild(profileDiv);
    }

    // Finally, add the friend card to the container
    container.appendChild(friendCard);
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
        loadFriendsData(friendsContainer, username);
      }
    });

    document.body.appendChild(popup);

    const baseHeight = popup.offsetHeight * 12;

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
        popup.style.height = baseHeight + 'px';
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
