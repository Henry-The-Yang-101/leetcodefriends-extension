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

async function loadFriendsData(username) {
  console.log('Loading friends data for:', username);
  try {
    const [friendsResponse, userResponse] = await Promise.all([
      fetch(`http://127.0.0.1:5000/friends?username=${username}`),
      fetch(`http://127.0.0.1:5000/user-data?username=${username}`)
    ]);
    const friendsResult = await friendsResponse.json();
    const userResult = await userResponse.json();

    if (friendsResult.friends) {
      renderFriendActivity(friendsResult.friends);
      renderMyFriendsGrid(friendsResult.friends);
      renderLeaderboard(userResult.data, friendsResult.friends);
    } else {
      console.error('No friends data found in response', friendsResult);
    }
  } catch (error) {
    console.error('Failed to load friends data:', error);
  }
}

function renderFriendActivity(friendsData) {
  const container = document.getElementById('friends-container');
  container.innerHTML = '';

  // Build a flat list of submissions from all friends
  let submissions = [];
  friendsData.forEach(friend => {
    if (friend.data?.recentAcSubmissions?.length > 0) {
      friend.data.recentAcSubmissions.forEach(sub => {
        submissions.push({
          friend_username: friend.friend_username,
          avatar: friend.data?.userPublicProfile?.profile?.userAvatar || '',
          timestamp: Number(sub.timestamp),
          title: sub.title,
          titleSlug: sub.titleSlug
        });
      });
    }
  });

  // Sort submissions by timestamp, most recent first
  submissions.sort((a, b) => b.timestamp - a.timestamp);
  submissions = submissions.slice(0, 50); // Limit the number of cards

  // Create a card for each submission
  submissions.forEach((item, index) => {
    const card = document.createElement('div');
    card.style.boxShadow = '0 0 4px rgba(0, 0, 0, 0.2)';
    card.style.borderRadius = '8px';
    card.style.padding = '8px';
    card.style.margin = '8px 4px'; // Added vertical spacing between cards
    card.style.background = document.documentElement.classList.contains("dark")
      ? (index % 2 === 0 ? "#2a2a2a" : "#1f1f1f")
      : (index % 2 === 0 ? "#fff" : "#f0f0f0");
    card.style.fontFamily = '"Roboto Mono", monospace';

    // Create header div with avatar, username, and time ago
    const headerDiv = document.createElement('div');
    headerDiv.style.display = 'flex';
    headerDiv.style.alignItems = 'center';
    headerDiv.style.marginBottom = '4px';
    headerDiv.style.justifyContent = 'space-between';

    const avatar = document.createElement('img');
    avatar.src = item.avatar;
    avatar.style.width = '30px';
    avatar.style.height = '30px';
    avatar.style.borderRadius = '50%';
    avatar.style.marginRight = '8px';

    const username = document.createElement('span');
    username.textContent = item.friend_username;
    username.style.fontSize = '14px';
    username.style.fontWeight = '600';

    // Create a clickable link that wraps the avatar and username
    const profileLink = document.createElement('a');
    profileLink.href = `https://leetcode.com/u/${item.friend_username}`;
    profileLink.target = '_blank';
    profileLink.style.display = 'flex';
    profileLink.style.alignItems = 'center';
    profileLink.style.textDecoration = 'none';
    profileLink.style.color = '#ffa116';

    profileLink.appendChild(avatar);
    profileLink.appendChild(username);
    headerDiv.appendChild(profileLink);

    // Compute relative "time ago" string for this submission
    const now = new Date();
    const submissionDate = new Date(item.timestamp * 1000);
    let diffInSeconds = Math.floor((now - submissionDate) / 1000);
    let timeText = '';
    if (diffInSeconds < 60) {
      timeText = 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      timeText = minutes + ' minute' + (minutes > 1 ? 's' : '') + ' ago';
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      timeText = hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      timeText = days + ' day' + (days > 1 ? 's' : '') + ' ago';
    }
    const timeSpan = document.createElement('span');
    timeSpan.style.fontSize = '13px';
    timeSpan.style.color = document.documentElement.classList.contains("dark") ? "#e0e0e0" : "#333";
    timeSpan.textContent = timeText;
    headerDiv.appendChild(timeSpan);

    card.appendChild(headerDiv);

    // Create a link for the submission question title
    const submissionTitleLink = document.createElement('a');
    submissionTitleLink.href = `https://leetcode.com/problems/${item.titleSlug}`;
    submissionTitleLink.target = '_blank';
    submissionTitleLink.textContent = item.title;
    submissionTitleLink.style.fontSize = '13px';
    submissionTitleLink.style.color = document.documentElement.classList.contains("dark") ? "#e0e0e0" : "#333";
    submissionTitleLink.style.textAlign = 'left';
    submissionTitleLink.style.marginTop = '4px';
    submissionTitleLink.style.display = 'inline-block';
    submissionTitleLink.style.textDecoration = 'none';

    submissionTitleLink.addEventListener('mouseenter', () => {
      submissionTitleLink.style.color = '#ffa116';
      submissionTitleLink.style.textDecoration = 'underline';
    });

    submissionTitleLink.addEventListener('mouseleave', () => {
      submissionTitleLink.style.color = document.documentElement.classList.contains("dark") ? "#e0e0e0" : "#333";
      submissionTitleLink.style.textDecoration = 'none';
    });

    card.appendChild(submissionTitleLink);

    container.appendChild(card);
  });
}

function renderLeaderboard(currentUserData, friendsData) {
  const leaderboardContainer = document.getElementById('leaderboard-container');
  leaderboardView.innerHTML = '';

  const users = [];

  // Add the current user
  const currentUsername = currentUserData.userPublicProfile?.profile?.realName || 'You';
  const currentRank = currentUserData.userPublicProfile?.profile?.ranking || Number.MAX_SAFE_INTEGER;
  const currentAvatar = currentUserData.userPublicProfile?.profile?.userAvatar || '';
  const currentTotalSolved = currentUserData.userSessionStats?.submitStats?.acSubmissionNum?.find(s => s.difficulty === 'All')?.count || 0;
  users.push({
    username: currentUsername,
    avatar: currentAvatar,
    rank: currentRank,
    isCurrentUser: true,
    profileUrl: `https://leetcode.com/u/${currentUsername}`,
    solved: currentTotalSolved
  });

  // Add friends
  friendsData.forEach(friend => {
    const username = friend.friend_username;
    const rank = friend.data?.userPublicProfile?.profile?.ranking || Number.MAX_SAFE_INTEGER;
    const avatar = friend.data?.userPublicProfile?.profile?.userAvatar || '';
    const solved = friend.data?.userSessionStats?.submitStats?.acSubmissionNum?.find(s => s.difficulty === 'All')?.count || 0;
    users.push({
      username,
      avatar,
      rank,
      isCurrentUser: false,
      profileUrl: `https://leetcode.com/u/${username}`,
      solved
    });
  });

  // Sort users by rank (ascending)
  users.sort((a, b) => a.rank - b.rank);

  // Create leaderboard container
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '12px';
  container.style.marginTop = '12px';
  container.style.fontFamily = '"Roboto Mono", monospace';

  users.forEach((user, index) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '12px';
    row.style.padding = '8px';
    row.style.borderRadius = '6px';
    row.style.background = document.documentElement.classList.contains("dark")
      ? (user.isCurrentUser ? "#3a2a15" : "#2b2b2b")
      : (user.isCurrentUser ? "#ffe8cc" : "#f8f8f8");
    row.style.boxShadow = '0 0 4px rgba(0,0,0,0.1)';

    const rankElem = document.createElement('div');
    rankElem.textContent = `#${index + 1}`;
    rankElem.style.width = '30px';
    rankElem.style.textAlign = 'center';

    const avatarElem = document.createElement('img');
    avatarElem.src = user.avatar;
    avatarElem.alt = user.username;
    avatarElem.style.width = '30px';
    avatarElem.style.height = '30px';
    avatarElem.style.borderRadius = '50%';

    const name = document.createElement('div');
    name.textContent = user.username;
    name.style.fontWeight = user.isCurrentUser ? 'bold' : 'normal';
    name.style.flexGrow = '1';


    const profileLink = document.createElement('a');
    profileLink.href = user.profileUrl;
    profileLink.target = '_blank';
    profileLink.style.display = 'flex';
    profileLink.style.alignItems = 'center';
    profileLink.style.textDecoration = 'none';
    profileLink.style.color = '#ffa116';
    profileLink.style.gap = '8px';
    profileLink.appendChild(avatarElem);
    profileLink.appendChild(name);

    row.appendChild(rankElem);
    row.appendChild(profileLink);
    const statWrapper = document.createElement('div');
    statWrapper.style.display = 'flex';
    statWrapper.style.flexDirection = 'column';
    statWrapper.style.alignItems = 'flex-end';
    statWrapper.style.textAlign = 'right';
    statWrapper.style.marginLeft = 'auto';

    const solvedElem = document.createElement('div');
    solvedElem.textContent = `Questions Solved: ${user.solved}`;

    const score = document.createElement('div');
    score.textContent = `Global Rank: ${user.rank}`;

    statWrapper.appendChild(solvedElem);
    statWrapper.appendChild(score);
    row.appendChild(statWrapper);

    container.appendChild(row);
  });

  leaderboardContainer.appendChild(container);
}

function renderMyFriendsGrid(friendsData) {
  const myFriendsContainer = document.getElementById('my-friends-container');
  myFriendsContainer.innerHTML = '';

  const myFriendsGrid = document.createElement('div');
  myFriendsGrid.style.display = 'grid';
  myFriendsGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
  myFriendsGrid.style.justifyContent = 'center';
  myFriendsGrid.style.gap = '16px';
  myFriendsGrid.style.marginTop = '12px';
  myFriendsGrid.style.placeItems = 'center';

  friendsData.forEach(friend => {
    const username = friend.friend_username;
    const avatarUrl = friend.data?.userPublicProfile?.profile?.userAvatar || '';

    const card = document.createElement('div');
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'center';
    card.style.fontFamily = '"Roboto Mono", monospace';
    card.style.backgroundColor = document.documentElement.classList.contains("dark") ? "#2a2a2a" : "#ffffff";
    card.style.borderRadius = "8px";
    card.style.padding = "12px";
    card.style.width = '100%';
    card.style.boxSizing = 'border-box';
    // Removed hover effect from card

    const img = document.createElement('img');
    img.src = avatarUrl;
    img.alt = username;
    img.style.width = '80px';
    img.style.height = '80px';
    img.style.borderRadius = '50%';
    img.style.marginBottom = '8px';
    img.style.boxShadow = '0 0 9px rgba(0, 0, 0, 0.2)';

    const link = document.createElement('a');
    link.style.display = 'flex';
    link.style.flexDirection = 'column';
    link.style.alignItems = 'center';
    link.href = `https://leetcode.com/u/${username}`;
    link.target = '_blank';
    link.style.textDecoration = 'none';
    link.style.color = '#ffa116';
    link.style.fontFamily = '"Roboto Mono", monospace';
    link.style.textAlign = 'center';
    link.style.transition = 'transform 0.2s ease';
    link.addEventListener('mouseenter', () => {
      link.style.transform = 'scale(1.05)';
    });
    link.addEventListener('mouseleave', () => {
      link.style.transform = 'scale(1)';
    });

    const name = document.createElement('div');
    name.textContent = username;
    name.style.fontSize = '14px';
    name.style.fontWeight = 'bold';

    link.appendChild(name);

    link.insertBefore(img, link.firstChild);
    card.appendChild(link);

    const metadata = document.createElement('div');
    metadata.style.fontSize = '12px';
    metadata.style.color = document.documentElement.classList.contains("dark") ? "#e0e0e0" : "#333";
    metadata.style.marginTop = '8px';
    metadata.style.textAlign = 'center';
    metadata.style.lineHeight = '1.5';
    metadata.style.fontFamily = '"Roboto Mono", monospace';
    metadata.style.backgroundColor = "transparent";

    // Extract values safely
    const calendarData = friend.data?.userProfileCalendar?.userCalendar || {};
    const stats = friend.data?.userSessionStats?.submitStats?.acSubmissionNum || [];
    const rank = friend.data?.userPublicProfile?.profile?.ranking;
    const streak = calendarData.streak || 0;
    const totalActiveDays = calendarData.totalActiveDays || 0;

    // Parse the submission calendar to count submissions in the last 7 days
    let last7DaySubmissions = 0;
    if (calendarData.submissionCalendar) {
      const calendar = JSON.parse(calendarData.submissionCalendar);
      const now = Math.floor(Date.now() / 1000);
      const weekAgo = now - 7 * 24 * 60 * 60;
      for (const [timestamp, count] of Object.entries(calendar)) {
        if (Number(timestamp) >= weekAgo) {
          last7DaySubmissions += Number(count);
        }
      }
    }

    // Build metadata string
    const totalAC = stats.find(s => s.difficulty === 'All')?.count || 0;
    const easyAC = stats.find(s => s.difficulty === 'Easy')?.count || 0;
    const mediumAC = stats.find(s => s.difficulty === 'Medium')?.count || 0;
    const hardAC = stats.find(s => s.difficulty === 'Hard')?.count || 0;

    metadata.innerHTML = `
      🔥 Streak: ${streak} days<br>
      📅 Last 7 days: ${last7DaySubmissions} Solved<br>
      🧠 Active days: ${totalActiveDays}<br>
      🌍 Rank: ${rank || 'N/A'}<br>
      ✅ Total AC: ${totalAC}<br>
      😁 Easy AC: ${easyAC}<br>
      😐 Med AC: ${mediumAC}<br>
      🫠 Hard AC: ${hardAC}
    `;

    card.appendChild(metadata);

    myFriendsGrid.appendChild(card);
  });

  myFriendsContainer.appendChild(myFriendsGrid);
}

function addFriendsButton() {
  async function fetchFriendRequests(username) {
    try {
      const [incomingResponse, outgoingResponse] = await Promise.all([
        fetch(`http://127.0.0.1:5000/friend-request/incoming?username=${username}`),
        fetch(`http://127.0.0.1:5000/friend-request/outgoing?username=${username}`)
      ]);
      const incomingData = await incomingResponse.json();
      const outgoingData = await outgoingResponse.json();
      const incoming = incomingData.incoming_friend_requests || [];
      const outgoing = outgoingData.outgoing_friend_requests || [];
      const requestsContainer = document.querySelector("#friend-requests-container");
      requestsContainer.innerHTML = '';

      incoming.forEach(req => {
        const card = document.createElement('div');
        card.className = 'request-card';
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';
        card.style.padding = '12px';
        card.style.marginBottom = '12px';
        card.style.borderRadius = '8px';
        card.style.backgroundColor = document.documentElement.classList.contains("dark") ? "#2a2a2a" : "#ffffff";
        card.style.fontFamily = '"Roboto Mono", monospace';
        card.style.boxShadow = '0 0 9px rgba(0, 0, 0, 0.2)';

        const profileLink = document.createElement('a');
        profileLink.href = `https://leetcode.com/u/${req.sender_username}`;
        profileLink.target = '_blank';
        profileLink.textContent = req.sender_username;
        profileLink.style.fontSize = '14px';
        profileLink.style.fontWeight = 'bold';
        profileLink.style.fontFamily = '"Roboto Mono", monospace';
        profileLink.style.color = '#ffa116';
        profileLink.style.textDecoration = 'none';
        profileLink.addEventListener('mouseenter', () => {
          profileLink.style.textDecoration = 'underline';
        });
        profileLink.addEventListener('mouseleave', () => {
          profileLink.style.textDecoration = 'none';
        });

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '8px';

        const acceptBtn = document.createElement('button');
        acceptBtn.textContent = 'Accept';
        acceptBtn.style.backgroundColor = '#28a745';
        acceptBtn.style.color = '#fff';
        acceptBtn.style.border = 'none';
        acceptBtn.style.borderRadius = '4px';
        acceptBtn.style.padding = '6px 12px';
        acceptBtn.style.fontFamily = '"Roboto Mono", monospace';
        acceptBtn.style.cursor = 'pointer';

        acceptBtn.onclick = () => {
          fetch('http://127.0.0.1:5000/friend-request/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sender_username: req.sender_username,
              receiver_username: username
            })
          }).then(() => fetchFriendRequests(username));
        };

        const declineBtn = document.createElement('button');
        declineBtn.textContent = 'Decline';
        declineBtn.style.backgroundColor = '#dc3545';
        declineBtn.style.color = '#fff';
        declineBtn.style.border = 'none';
        declineBtn.style.borderRadius = '4px';
        declineBtn.style.padding = '6px 12px';
        declineBtn.style.fontFamily = '"Roboto Mono", monospace';
        declineBtn.style.cursor = 'pointer';

        declineBtn.onclick = () => {
          fetch('http://127.0.0.1:5000/friend-request/decline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sender_username: req.sender_username,
              receiver_username: username
            })
          }).then(() => fetchFriendRequests(username));
        };

        actions.appendChild(acceptBtn);
        actions.appendChild(declineBtn);
        card.appendChild(profileLink);
        card.appendChild(actions);
        requestsContainer.appendChild(card);
      });

      outgoing.forEach(req => {
        const card = document.createElement('div');
        card.className = 'request-card';

        const name = document.createElement('div');
        name.textContent = `To: ${req.receiver_username}`;

        card.appendChild(name);
        requestsContainer.appendChild(card);
      });
    } catch (error) {
      console.error("Failed to load friend requests:", error);
    }
  }
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
        // Insert send friend request elements and listener here
        const sendRequestInput = wrapper.querySelector("#send-friend-request-input");
        const sendRequestButton = wrapper.querySelector("#send-friend-request-button");
        
        sendRequestButton.addEventListener("click", () => {
          const receiverUsername = sendRequestInput.value.trim();
          if (!receiverUsername) return;
        
          fetch("http://127.0.0.1:5000/friend-request/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sender_username: username,
              receiver_username: receiverUsername
            })
          })
            .then((res) => res.json())
            .then(() => {
              sendRequestInput.value = "";
              fetchFriendRequests(username);
            })
            .catch((error) => console.error("Failed to send friend request:", error));
        });
        popup.appendChild(wrapper);

        const friendActivityTab = wrapper.querySelector("#friend-activity-tab");
        const leaderboardTab = wrapper.querySelector("#leaderboard-tab");
        const myFriendsTab = wrapper.querySelector("#my-friends-tab");
        const friendsView = wrapper.querySelector("#friend-activity-view");
        const leaderboardView = wrapper.querySelector("#leaderboard-view");
        const friendRequestsTab = wrapper.querySelector("#friend-requests-tab");
        const friendRequestsView = wrapper.querySelector("#friend-requests-view");
        const myFriendsView = wrapper.querySelector("#my-friends-view");

        const tabMapping = [
          { button: friendActivityTab, view: friendsView },
          { button: leaderboardTab, view: leaderboardView },
          { button: myFriendsTab, view: myFriendsView },
          { button: friendRequestsTab, view: friendRequestsView },
        ];

        function updateActiveTab(activeButton) {
          const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
          tabMapping.forEach(({ button, view }) => {
            if (button === activeButton) {
              button.style.backgroundColor = "#ffa1161f";
              button.style.color = "#ffa116";
              view.style.display = "block";
            } else {
              button.style.backgroundColor = isDarkMode ? "#2a2a2a" : "#ffffff";
              button.style.color = isDarkMode ? "#e0e0e0" : "#333";
              view.style.display = "none";
            }
          });
        }

        // Attach a single event listener to each tab button
        tabMapping.forEach(({ button }) => {
          button.addEventListener("click", () => updateActiveTab(button));
        });
      })
      .catch(error => {
        console.error("Failed to load external HTML:", error);
      });

    const obtainer_script = document.createElement("script");
    obtainer_script.src = chrome.runtime.getURL("username_obtainer.js");
    obtainer_script.onload = () => obtainer_script.remove();
    (document.head || document.documentElement).appendChild(obtainer_script);

    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      if (event.data?.type === "LEETCODE_USERNAME") {
        const username = event.data.username;
        console.log("Extracted username:", username);
        const friendsContainer = popup.querySelector("#friends-container");
        friendsContainer.style.overflowY = 'scroll';
        friendsContainer.style.scrollbarWidth = 'none'; // For Firefox
        friendsContainer.style.msOverflowStyle = 'none'; // For IE/Edge
        friendsContainer.style.overflowX = 'hidden';
        friendsContainer.style.boxSizing = 'border-box';
        friendsContainer.style.paddingRight = '4px';
        friendsContainer.style.marginRight = '-4px';
        friendsContainer.style.setProperty('scrollbar-width', 'none');
        friendsContainer.style.setProperty('::-webkit-scrollbar', 'display: none');
        loadFriendsData(username);
        fetchFriendRequests(username);
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
        popup.style.maxHeight = (window.innerHeight - 57) + 'px';
        const minWidth = 360;
        const maxWidth = 640;
        const clampedWidth = Math.max(minWidth, maxWidth);
        popup.style.width = clampedWidth + 'px';
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
