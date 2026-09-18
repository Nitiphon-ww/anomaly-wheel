# Uniform behavior probability verification

The two-stage gate has been replaced by one uniform enabled-behavior pool. Normal has its own enabled flag and the same probability as every other entry. Prize selection still occurs first and independently. Web Crypto integer rejection sampling avoids modulo bias. No cooldown, rarity weight, bag, or duplicate suppression affects selection. Force Event bypasses random selection, including for disabled behaviors. An empty enabled pool reports an error rather than silently selecting Normal.

Run the development-only, animation-free diagnostic with `npm run simulate:behaviors`.

Observed 120,000-selection simulation:

| Behavior | Count | Percentage |
| --- | ---: | ---: |
| Normal Spin | 10017 | 8.3475% |
| Fake Stop | 9905 | 8.2542% |
| Reverse Spin | 9927 | 8.2725% |
| Speed Boost | 9909 | 8.2575% |
| Pointer Spin | 10052 | 8.3767% |
| Random Segment Size | 10043 | 8.3692% |
| Instant Reveal | 10081 | 8.4008% |
| Single Segment | 10034 | 8.3617% |
| Two Segment | 9943 | 8.2858% |
| Glitch | 10218 | 8.5150% |
| Mystery Mode | 9980 | 8.3167% |
| Jackpot Mode | 9891 | 8.2425% |

Expected count: 10,000 each. Consecutive repeats: 10,124. Chi-squared statistic: 9.825. This simulation is a distribution diagnostic; deterministic tests additionally verify equal index selection, rejection of the biased integer tail, enabled pools of 1/2/5/8/10/12, pools excluding Normal, forced overrides without random draws, and independence from rarity and legacy weight/cooldown fields.

Lint, all 49 test groups and production build passed. Prior phase verification documents describe historical probability systems and are superseded by this document for behavior selection.
