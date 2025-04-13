const baseURL = "https://leetcodefriends.online";

function isLeetCodeHomeForcingLightMode() {
  return window.location.pathname === '/' && !document.documentElement.classList.contains('dark');
}

function showToastMessage(message, type = "") {
  const popup = document.querySelector("#friends-navbar")?.parentElement;
  if (!popup) return;

  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.position = "absolute";
  toast.style.top = "8px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%) translateY(-20px)";
  toast.style.backgroundColor = type === "success" ? "#28a745" : type === "error" ? "#dc3545" : "#333";
  toast.style.color = "#fff";
  toast.style.padding = "8px 16px";
  toast.style.borderRadius = "6px";
  toast.style.fontFamily = '"Roboto Mono", monospace';
  toast.style.fontSize = "12px";
  toast.style.zIndex = "99999";
  toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
  toast.style.opacity = "0";

  popup.insertBefore(toast, popup.firstChild);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(-20px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}


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
  try {
    const [friendsResponse, userResponse] = await Promise.all([
      fetch(`${baseURL}/friends?username=${username}`),
      fetch(`${baseURL}/current-user-info?username=${username}`)
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
  container.style.overflow = 'auto';
  container.style.scrollbarWidth = 'none'; // For Firefox
  container.style.msOverflowStyle = 'none'; // For IE/Edge
  container.style.setProperty('scrollbar-width', 'none'); // extra precaution
  container.style.setProperty('-ms-overflow-style', 'none');
  container.style.cssText += '::-webkit-scrollbar { display: none; }';

  container.innerHTML = '';
  if (!friendsData || friendsData.length === 0) {
    const fallback = document.createElement('div');
    fallback.className = 'loading-indicator';
    fallback.style.padding = '64px 0';
    fallback.style.color = !isLeetCodeHomeForcingLightMode() && document.documentElement.classList.contains("dark") ? '#e0e0e0' : '#000';
    fallback.style.fontSize = '16px';
    fallback.textContent = 'You currently have no friends... :C';
    const span = document.createElement('span');
    span.style.fontSize = '13px';
    span.style.color = !isLeetCodeHomeForcingLightMode() && document.documentElement.classList.contains("dark") ? '#e0e0e0' : '#000';
    span.textContent = 'Go make some friends in the friend requests tab! 👉👉👉';
    fallback.appendChild(document.createElement('br'));
    fallback.appendChild(span);
    container.appendChild(fallback);
    return;
  }

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
    card.style.margin = '8px 4px';
    card.style.background = !isLeetCodeHomeForcingLightMode() && document.documentElement.classList.contains("dark")
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
    timeSpan.style.color = !isLeetCodeHomeForcingLightMode() && document.documentElement.classList.contains("dark") ? "#e0e0e0" : "#333";
    timeSpan.textContent = timeText;
    headerDiv.appendChild(timeSpan);

    card.appendChild(headerDiv);

    // Create a link for the submission question title
    const submissionTitleLink = document.createElement('a');
    submissionTitleLink.href = `https://leetcode.com/problems/${item.titleSlug}`;
    submissionTitleLink.target = '_blank';
    submissionTitleLink.textContent = item.title;
    submissionTitleLink.style.fontSize = '13px';
    submissionTitleLink.style.color = !isLeetCodeHomeForcingLightMode() && document.documentElement.classList.contains("dark") ? "#e0e0e0" : "#333";
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
  const leaderboardContainer = document.querySelector('#leaderboard-container');
  leaderboardContainer.innerHTML = '';

  if (!friendsData || friendsData.length === 0) {
    const fallback = document.createElement('div');
    fallback.className = 'loading-indicator';
    fallback.style.padding = '64px 0';
    fallback.style.color = !isLeetCodeHomeForcingLightMode() && document.documentElement.classList.contains('dark') ? '#e0e0e0' : '#000';
    fallback.style.fontSize = '16px';
    fallback.textContent = 'You currently have no friends... :C';
    const span = document.createElement('span');
    span.style.fontSize = '13px';
    span.style.color = !isLeetCodeHomeForcingLightMode() && document.documentElement.classList.contains('dark') ? '#e0e0e0' : '#000';
    span.textContent = 'Go make some friends in the friend requests tab! 👉👉👉';
    fallback.appendChild(document.createElement('br'));
    fallback.appendChild(span);
    leaderboardContainer.appendChild(fallback);
    return;
  }

  // Helper function: compute weekly accepted submissions from a user's calendar data.
  function computeWeeklyAC(data) {
    let ACSubmissionsThisWeek = 0;
    const calendarData = data && data.userProfileCalendar ? data.userProfileCalendar.userCalendar || {} : {};
    if (calendarData.submissionCalendar) {
      try {
        const calendar = JSON.parse(calendarData.submissionCalendar);
        const now = new Date();
        const dayOfWeek = now.getUTCDay(); // 0 for Sunday, 6 for Saturday
        const lastSundayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek, 0, 0, 0));
        const sundayTimestamp = Math.floor(lastSundayUTC.getTime() / 1000);
        for (const [timestamp, count] of Object.entries(calendar)) {
          if (Number(timestamp) >= sundayTimestamp) {
            ACSubmissionsThisWeek += Number(count);
          }
        }
      } catch (e) {
        // If parsing fails, count as 0 submissions this week.
      }
    }
    return ACSubmissionsThisWeek;
  }

  // Aggregate user data for both the current user and all friends.
  const users = [];

  // Add current user.
  const currentUsername = currentUserData.userPublicProfile?.profile?.realName || 'You';
  const currentRank = currentUserData.userPublicProfile?.profile?.ranking || Number.MAX_SAFE_INTEGER;
  const currentAvatar = currentUserData.userPublicProfile?.profile?.userAvatar || '';
  const currentTotalSolved = currentUserData.userSessionStats?.submitStats?.acSubmissionNum?.find(s => s.difficulty === 'All')?.count || 0;
  const currentWeekly = computeWeeklyAC(currentUserData);
  users.push({
    username: currentUsername,
    avatar: currentAvatar,
    rank: currentRank,
    isCurrentUser: true,
    profileUrl: `https://leetcode.com/u/${currentUsername}`,
    solved: currentTotalSolved,
    weekly: currentWeekly
  });

  // Add each friend.
  friendsData.forEach(friend => {
    const username = friend.friend_username;
    const rank = friend.data?.userPublicProfile?.profile?.ranking || Number.MAX_SAFE_INTEGER;
    const avatar = friend.data?.userPublicProfile?.profile?.userAvatar || '';
    const solved = friend.data?.userSessionStats?.submitStats?.acSubmissionNum?.find(s => s.difficulty === 'All')?.count || 0;
    const weekly = computeWeeklyAC(friend.data);
    users.push({
      username,
      avatar,
      rank,
      isCurrentUser: false,
      profileUrl: `https://leetcode.com/u/${username}`,
      solved,
      weekly
    });
  });

  // Create two sorted arrays for the two modes: all time and weekly.
  const weeklyUsers = [...users].sort((a, b) => b.weekly - a.weekly);
  const allTimeUsers = [...users].sort((a, b) => a.rank - b.rank);

  // Create inner tab bar styled like the main navbar
  const tabBar = document.createElement('div');
  tabBar.style.display = 'flex';
  tabBar.style.borderRadius = '8px';
  tabBar.style.overflow = 'hidden';
  tabBar.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
  tabBar.style.marginBottom = '12px';
  tabBar.style.fontFamily = '"Roboto Mono", monospace';

  const darkMode = !isLeetCodeHomeForcingLightMode() && document.documentElement.classList.contains('dark');
  const inactiveBg = darkMode ? '#1e1e1e' : '#ffffff';
  const inactiveText = darkMode ? '#e0e0e0' : '#333';

  const weeklyTab = document.createElement('button');
  weeklyTab.textContent = 'Leaderboard This Week';
  weeklyTab.style.flex = '1';
  weeklyTab.style.padding = '8px';
  weeklyTab.style.border = 'none';
  weeklyTab.style.backgroundColor = "#ffa1161f";
  weeklyTab.style.color = '#ffa116';
  weeklyTab.style.cursor = 'pointer';
  weeklyTab.style.transition = 'background-color 0.2s ease, color 0.2s ease';
  weeklyTab.style.fontFamily = '"Roboto Mono", monospace';
  weeklyTab.classList.add('active');

  const allTimeTab = document.createElement('button');
  allTimeTab.textContent = 'All Time Leaderboard';
  allTimeTab.style.flex = '1';
  allTimeTab.style.padding = '8px';
  allTimeTab.style.border = 'none';
  allTimeTab.style.backgroundColor = inactiveBg;
  allTimeTab.style.color = inactiveText;
  allTimeTab.style.cursor = 'pointer';
  allTimeTab.style.transition = 'background-color 0.2s ease, color 0.2s ease';
  allTimeTab.style.fontFamily = '"Roboto Mono", monospace';

  // Weekly tab hover
  weeklyTab.addEventListener('mouseenter', () => {
    if (!weeklyTab.classList.contains('active')) {
      weeklyTab.style.backgroundColor = darkMode ? '#333' : '#f5f5f5';
    }
  });
  weeklyTab.addEventListener('mouseleave', () => {
    if (!weeklyTab.classList.contains('active')) {
      weeklyTab.style.backgroundColor = inactiveBg;
    }
  });

  // All Time tab hover
  allTimeTab.addEventListener('mouseenter', () => {
    if (!allTimeTab.classList.contains('active')) {
      allTimeTab.style.backgroundColor = darkMode ? '#333' : '#f5f5f5';
    }
  });
  allTimeTab.addEventListener('mouseleave', () => {
    if (!allTimeTab.classList.contains('active')) {
      allTimeTab.style.backgroundColor = inactiveBg;
    }
  });

  tabBar.appendChild(weeklyTab);
  tabBar.appendChild(allTimeTab);
  leaderboardContainer.appendChild(tabBar);

  // Container for the leaderboard rows.
  const listContainer = document.createElement('div');
  leaderboardContainer.appendChild(listContainer);

  // Function to render a leaderboard list based on passed data and mode.
  function renderList(usersList, mode) {
    listContainer.innerHTML = '';
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '12px';
    container.style.fontFamily = '\"Roboto Mono\", monospace';

    usersList.forEach((user, index) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '12px';
      row.style.padding = '8px';
      row.style.borderRadius = '6px';
      row.style.boxShadow = '0 0 4px rgba(0,0,0,0.1)';
      row.style.background = document.documentElement.classList.contains('dark')
        ? (user.isCurrentUser ? '#3a2a15' : '#2b2b2b')
        : (user.isCurrentUser ? '#ffe8cc' : '#f8f8f8');

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

      if (mode === 'all') {
        const solvedElem = document.createElement('div');
        solvedElem.textContent = `All Time AC: ${user.solved}`;
        statWrapper.appendChild(solvedElem);
      } else if (mode === 'weekly') {
        const weeklyElem = document.createElement('div');
        weeklyElem.textContent = `Submissions This Week: ${user.weekly}`;
        statWrapper.appendChild(weeklyElem);
      }

      row.appendChild(statWrapper);
      container.appendChild(row);
    });

    listContainer.appendChild(container);
  }

  renderList(weeklyUsers, 'weekly');

  // Weekly tab click
  weeklyTab.addEventListener('click', () => {
    weeklyTab.classList.add('active');
    allTimeTab.classList.remove('active');

    weeklyTab.style.backgroundColor = "#ffa1161f";
    weeklyTab.style.color = "#ffa116";
    allTimeTab.style.backgroundColor = inactiveBg;
    allTimeTab.style.color = inactiveText;

    renderList(weeklyUsers, 'weekly');
  });

  // All Time tab click
  allTimeTab.addEventListener('click', () => {
    allTimeTab.classList.add('active');
    weeklyTab.classList.remove('active');

    allTimeTab.style.backgroundColor = "#ffa1161f";
    allTimeTab.style.color = "#ffa116";
    weeklyTab.style.backgroundColor = inactiveBg;
    weeklyTab.style.color = inactiveText;

    renderList(allTimeUsers, 'all');
  });
}

function renderMyFriendsGrid(friendsData) {
  const myFriendsContainer = document.getElementById('my-friends-container');
  myFriendsContainer.innerHTML = '';
  if (!friendsData || friendsData.length === 0) {
    const fallback = document.createElement('div');
    fallback.className = 'loading-indicator';
    fallback.style.padding = '64px 0';
    fallback.style.color = !isLeetCodeHomeForcingLightMode() && document.documentElement.classList.contains("dark") ? '#e0e0e0' : '#000';
    fallback.style.fontSize = '16px';
    fallback.textContent = 'You currently have no friends... :C';
    const span = document.createElement('span');
    span.style.fontSize = '13px';
    span.style.color = document.documentElement.classList.contains("dark") ? '#e0e0e0' : '#000';
    span.textContent = 'Go make some friends in the friend requests tab! 👉👉👉';
    fallback.appendChild(document.createElement('br'));
    fallback.appendChild(span);
    myFriendsContainer.appendChild(fallback);
    return;
  }

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
    card.style.backgroundColor = !isLeetCodeHomeForcingLightMode() && document.documentElement.classList.contains("dark") ? "#2a2a2a" : "#ffffff";
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
    metadata.style.color = !isLeetCodeHomeForcingLightMode() && document.documentElement.classList.contains("dark") ? "#e0e0e0" : "#333";
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
    let ACSubmissionsThisWeek = 0;
    if (calendarData.submissionCalendar) {
      const calendar = JSON.parse(calendarData.submissionCalendar);
      const now = new Date();
      const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
      const daysSinceSunday = dayOfWeek; // days to subtract to get to last Sunday
      const lastSundayUTC = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - daysSinceSunday,
        0, 0, 0
      ));
      const sundayTimestamp = Math.floor(lastSundayUTC.getTime() / 1000);
      for (const [timestamp, count] of Object.entries(calendar)) {
        if (Number(timestamp) >= sundayTimestamp) {
          ACSubmissionsThisWeek += Number(count);
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
      📅 This Week: ${ACSubmissionsThisWeek} AC<br>
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

async function fetchFriendRequests(username) {
  try {
    const [incomingResponse, outgoingResponse] = await Promise.all([
      fetch(`${baseURL}/friend-request/incoming?username=${username}`),
      fetch(`${baseURL}/friend-request/outgoing?username=${username}`)
    ]);
    const incomingData = await incomingResponse.json();
    const outgoingData = await outgoingResponse.json();
    const incoming = incomingData.incoming_friend_requests || [];
    const outgoing = outgoingData.outgoing_friend_requests || [];
    const requestsContainer = document.querySelector("#friend-requests-container");
    requestsContainer.innerHTML = '';
    if (incoming.length === 0) {
      const emptyIncoming = document.createElement('div');
      emptyIncoming.className = 'loading-indicator';
      emptyIncoming.textContent = 'No incoming friend requests.';
      requestsContainer.appendChild(emptyIncoming);
    }

    incoming.forEach(req => {
      const card = document.createElement('div');
      card.className = 'request-card';
      card.style.display = 'flex';
      card.style.justifyContent = 'space-between';
      card.style.alignItems = 'center';
      card.style.padding = '12px';
      card.style.marginBottom = '12px';
      card.style.marginLeft = '2px';
      card.style.marginRight = '2px';
      card.style.borderRadius = '8px';
      card.style.backgroundColor = !isLeetCodeHomeForcingLightMode() && document.documentElement.classList.contains("dark") ? "#2a2a2a" : "#ffffff";
      card.style.fontFamily = '"Roboto Mono", monospace';
      card.style.boxShadow = '0 0 4px rgba(0, 0, 0, 0.2)';

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
      acceptBtn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
      acceptBtn.addEventListener('mouseenter', () => {
        acceptBtn.style.backgroundColor = '#218838';
      });
      acceptBtn.addEventListener('mouseleave', () => {
        acceptBtn.style.backgroundColor = '#28a745';
      });
      acceptBtn.style.transition = 'background-color 0.2s ease';

      acceptBtn.onclick = () => {
        fetch(`${baseURL}/friend-request/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender_username: req.sender_username,
            receiver_username: username
          })
        }).then(() => {
          fetchFriendRequests(username);
          loadFriendsData(username);
          showToastMessage("Friend request accepted!", "success");
          const navbar = document.querySelector("#friends-navbar");
          if (navbar) navbar.style.display = "flex";
        });
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
      declineBtn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
      declineBtn.addEventListener('mouseenter', () => {
        declineBtn.style.backgroundColor = '#c82333';
      });
      declineBtn.addEventListener('mouseleave', () => {
        declineBtn.style.backgroundColor = '#dc3545';
      });
      declineBtn.style.transition = 'background-color 0.2s ease';

      declineBtn.onclick = () => {
        fetch(`${baseURL}/friend-request/decline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender_username: req.sender_username,
            receiver_username: username
          })
        }).then(() => {
          fetchFriendRequests(username);
          showToastMessage("Friend request declined.", "error");
        });
      };

      actions.appendChild(acceptBtn);
      actions.appendChild(declineBtn);
      card.appendChild(profileLink);
      card.appendChild(actions);
      requestsContainer.appendChild(card);
    });

    if (outgoing.length > 0) {
      const toggle = document.createElement('button');
      toggle.textContent = `Outgoing Friend Requests (${outgoing.length}) ▾`;
      toggle.style.margin = '8px 4px';
      toggle.style.padding = '6px 12px';
      toggle.style.fontFamily = '"Roboto Mono", monospace';
      toggle.style.fontSize = '14px';
      toggle.style.cursor = 'pointer';
      toggle.style.backgroundColor = '#e0e0e0';
      toggle.style.color = '#000';
      toggle.style.borderRadius = '8px';
      toggle.style.textAlign = 'left';
      toggle.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
      toggle.addEventListener('mouseenter', () => {
        toggle.style.backgroundColor = '#d5d5d5';
      });
      toggle.addEventListener('mouseleave', () => {
        toggle.style.backgroundColor = '#e0e0e0';
      });
      toggle.style.transition = 'background-color 0.2s ease';

      const outgoingContainer = document.createElement('div');
      outgoingContainer.style.display = 'none';
      outgoingContainer.style.marginTop = '8px';

      toggle.addEventListener('click', () => {
        const expanded = outgoingContainer.style.display === 'block';
        outgoingContainer.style.display = expanded ? 'none' : 'block';
        toggle.textContent = expanded ? `Outgoing Friend Requests (${outgoing.length}) ▾` : `Outgoing Friend Requests (${outgoing.length}) ▴`;
      });

      const outgoingText = document.createElement('div');
      outgoingText.textContent = outgoing.map(req => req.receiver_username).join(', ');
      outgoingText.style.fontFamily = '"Roboto Mono", monospace';
      outgoingText.style.marginLeft = '4px';
      outgoingText.style.marginRight = '4px';

      outgoingContainer.appendChild(outgoingText);

      requestsContainer.appendChild(toggle);
      requestsContainer.appendChild(outgoingContainer);
    }
  } catch (error) {
    console.error("Failed to load friend requests:", error);
  }
}

function addFriendsButton() {
  window.addEventListener("pageshow", async () => {
    const isDark = !isLeetCodeHomeForcingLightMode() && document.documentElement.classList.contains("dark");
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
    let sendRequestInput;
    let sendRequestButton;
    let username;

    fetch(chrome.runtime.getURL("popup_content.html"))
      .then(response => response.text())
      .then(html => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        const tabBar = wrapper.querySelector("div[style*='display: flex'][style*='justify-content: center'] > div");
        tabBar.style.position = "relative";
        tabBar.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.2)";
        tabBar.style.borderRadius = "8px";
        tabBar.style.overflow = "hidden";

        const tabHighlight = document.createElement("div");
        tabHighlight.style.position = "absolute";
        tabHighlight.style.top = "0";
        tabHighlight.style.left = "0";
        tabHighlight.style.height = "100%";
        tabHighlight.style.width = "25%";
        tabHighlight.style.backgroundColor = "#ffa1161f";
        tabHighlight.style.borderRadius = "8px";
        tabHighlight.style.transition = "left 0.3s ease";
        tabBar.insertBefore(tabHighlight, tabBar.firstChild);

        sendRequestInput = wrapper.querySelector("#send-friend-request-input");
        sendRequestButton = wrapper.querySelector("#send-friend-request-button");
        sendRequestButton.style.transition = 'background-color 0.2s ease';
        sendRequestButton.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
        sendRequestButton.addEventListener('mouseenter', () => {
          sendRequestButton.style.backgroundColor = '#e69500';
        });
        sendRequestButton.addEventListener('mouseleave', () => {
          sendRequestButton.style.backgroundColor = '#ffa116';
        });
        function sendRequest() {
          const receiverUsername = sendRequestInput.value.trim();
          if (!receiverUsername) return;

          fetch(`${baseURL}/friend-request/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sender_username: username,
              receiver_username: receiverUsername
            })
          })
            .then(async (res) => {
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Unknown error occurred");
              return data;
            })
            .then(() => {
              sendRequestInput.value = "";
              fetchFriendRequests(username);
              showToastMessage(`Friend request sent!`, "success");
            })
            .catch((error) => showToastMessage(error, "error"));
        }

        sendRequestButton.addEventListener("click", sendRequest);
        sendRequestInput.addEventListener("keypress", (event) => {
          if (event.key === "Enter") sendRequest();
        });

        popup.appendChild(wrapper);
        const reloadButton = popup.querySelector("#reload-button");
        reloadButton.style.transition = 'color 0.2s ease, background-color 0.2s ease';

        reloadButton.addEventListener("mouseenter", () => {
          reloadButton.style.color = "#ffa116";
        });
        reloadButton.addEventListener("mouseleave", () => {
          reloadButton.style.color = isDark ? "#e0e0e0" : "#333";
        });
        reloadButton.onclick = () => {
          showToastMessage("Reloading data!");
          const views = [
            "#friends-container",
            "#leaderboard-container",
            "#my-friends-container",
            "#friend-requests-container"
          ];
          views.forEach(selector => {
            const container = popup.querySelector(selector);
            if (container) {
              container.innerHTML = '<div class="loading-indicator">Loading...</div>';
            }
          });
          loadFriendsData(username);
          fetchFriendRequests(username);
          const navbar = popup.querySelector("#friends-navbar");
          if (navbar) navbar.style.display = "flex";
        };

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
        updateActiveTab(friendActivityTab);
        tabMapping.forEach(({ button }) => {
          button.style.transition = 'background-color 0.2s ease, color 0.2s ease';
          button.style.borderRadius = '8px';
          button.addEventListener("mouseenter", () => {
            if (!button.classList.contains("active-tab")) {
              const darkModeActive = !isLeetCodeHomeForcingLightMode() && document.documentElement.classList.contains("dark");
              button.style.backgroundColor = darkModeActive ? "#333" : "#f5f5f5";
            }
          });
          button.addEventListener("mouseleave", () => {
            if (!button.classList.contains("active-tab")) {
              const darkModeActive = !isLeetCodeHomeForcingLightMode() && document.documentElement.classList.contains("dark");
              button.style.backgroundColor = darkModeActive ? "#1e1e1e" : "#ffffff";
            }
          });
        });

        function updateActiveTab(activeButton) {
          const darkModeActive = !isLeetCodeHomeForcingLightMode() && document.documentElement.classList.contains("dark");
          tabMapping.forEach(({ button, view }, index) => {
            button.classList.remove("active-tab");
            const isActive = button === activeButton;
            button.style.backgroundColor = isActive ? "transparent" : (darkModeActive ? "#1e1e1e" : "#ffffff");
            button.style.color = isActive ? "#ffa116" : (darkModeActive ? "#e0e0e0" : "#333");
            view.style.display = isActive ? "block" : "none";
            if (isActive) {
              button.classList.add("active-tab");
              tabHighlight.style.left = `${index * 25}%`;
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

    window.addEventListener("message", async (event) => {
      if (event.source !== window) return;
      if (event.data?.type === "LEETCODE_USERNAME") {
        username = event.data.username;

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
        if (container) {
          container.insertBefore(friendsButton, container.children[insertIndex]);
        } else {
          console.warn("Navbar container not found!");
          return;
        }

        fetch(`${baseURL}/user-is-registered?username=${username}`)
          .then(async (res) => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Unknown error occurred");
            return data;
          })
          .then(data => {
            if (!data.is_registered) {
              const popupContent = popup.querySelector("#friend-activity-view");
              popupContent.innerHTML = "";

              const registerButton = document.createElement("button");
              registerButton.textContent = `Register as ${username}!`;
              registerButton.style.margin = "16px auto";
              registerButton.style.display = "block";
              registerButton.style.padding = "10px 20px";
              registerButton.style.backgroundColor = "#ffa116";
              registerButton.style.color = "white";
              registerButton.style.border = "none";
              registerButton.style.borderRadius = "8px";
              registerButton.style.fontFamily = '"Roboto Mono", monospace';
              registerButton.style.cursor = "pointer";

              registerButton.onclick = () => {
                fetch(`${baseURL}/register`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ username })
                })
                  .then(res => res.json())
                  .then(data => {
                    if (data.message?.includes("registered")) {
                      fetch(chrome.runtime.getURL("popup_content.html"))
                        .then(response => response.text())
                        .then(html => {
                          popup.innerHTML = "";
                          const wrapper = document.createElement("div");
                          wrapper.innerHTML = html;
                          popup.appendChild(wrapper);
                          const navbar = popup.querySelector("#friends-navbar");
                          if (navbar) navbar.style.display = "flex";
                          loadFriendsData(username);
                          fetchFriendRequests(username);
                        });
                    }
                  });
              };

              popupContent.appendChild(registerButton);
            } else {
              // registered
              loadFriendsData(username);
              const navbar = popup.querySelector("#friends-navbar");
              if (navbar) navbar.style.display = "flex";
              fetchFriendRequests(username);
            }
          })
          .catch(err => showToastMessage(err, "error"));

        // Setup event listener for send request button regardless of registration state
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
  });
}

addFriendsButton();
