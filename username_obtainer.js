(function () {
  fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query { userStatus { username } }`
    })
  })
    .then(res => res.json())
    .then(data => {
      const username = data.data?.userStatus?.username;
      if (username) {
        window.postMessage({ type: 'LEETCODE_USERNAME', username }, '*');
      }
    });
})();
