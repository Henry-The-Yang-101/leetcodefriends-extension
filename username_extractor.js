(function () {
  if (window.LeetCodeData && window.LeetCodeData.userStatus?.username) {
    window.postMessage({
      type: 'LEETCODE_USERNAME',
      username: window.LeetCodeData.userStatus.username
    }, '*');
  }
})();
