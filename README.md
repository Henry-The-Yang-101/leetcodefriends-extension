# LeetCode Friends Version 1.1.2 🚀

LeetCode Friends is a Chrome extension that lets you add friends and track their LeetCode progress in a glance, right from within [leetcode.com](https://leetcode.com)! 

With this extension, the often tedious and hair-pulling experience of the LeetCode grind is transformed into a more social and encouraging experience with the enabling of fun rivalry and competition between your friends :D

## 🔍 Features

- 🥶 Seamless UI built right into [leetcode.com](https://leetcode.com) itself
- 📈 Viewing of your friends' latest submissions
- 🏆 Weekly and all time leaderboard based on global ranks and problems solved
- 🔥 See activity streaks and problem AC stats
- 🌚 Dark mode compatible
- ⌨️ Local code completion in LeetCode's editor (experimental)
- 👹 Even more features coming soon!

## 🛠️ How to Use

1. Install the [Chrome extension](https://chromewebstore.google.com/detail/leetcode-friends/edccadalfhaegaflhhodadmhoffmmhdk)
2. Visit [leetcode.com](https://leetcode.com)
3. Click the 🧑‍🤝‍🧑 Friends icon in the navigation bar
4. Add other friends with the LeetCode Friends Extension by their LeetCode usernames
5. Track everyone's coding streaks, submissions, and rankings!

## Code completion

The extension enables Monaco's local suggestions for LeetCode problem editors. Python3 uses a packaged Pyright worker for Python builtins, LeetCode's commonly preloaded modules, local symbols, and members. JavaScript and TypeScript use Monaco's TypeScript language service with bundled lodash declarations. C++, Java, Python 2, C, Go, and Swift currently complete words from the open solution; they do not yet provide full standard library or type aware suggestions.

No paid API or external autocomplete service is used. Python3 code is analyzed in a local browser worker. The worker is about 25 MB and starts only when a Python3 editor is opened.

The packaged Monaco Pyright bridge uses an older Pyright release, so its Python library types may lag LeetCode's current Python3 runtime. The preimport shim covers the observed common modules and `sortedcontainers`; it is not an exact copy of LeetCode's private runner setup.

For local development, run `npm ci && npm run build:autocomplete`, then reload the unpacked extension in Chrome. The generated files in `vendor/` are included so the unpacked extension also works without installing npm dependencies. See [third party notices](THIRD_PARTY_NOTICES.md) for the bundled libraries.

LeetCode's [environment documentation](https://support.leetcode.com/hc/en-us/articles/360011833974-What-are-the-environments-for-the-programming-languages) describes runtime versions and some included libraries, but it does not list every imported symbol in every language. The Python3 module list and representative names were checked against a live Two Sum run on September 26, 2026. Runtime defaults can change; the extension's suggestions do not prove that a name is available in the LeetCode runner.
