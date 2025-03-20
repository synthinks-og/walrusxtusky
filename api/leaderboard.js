import { Redis } from '@upstash/redis';

// Inisialisasi Upstash Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_TOKEN,
});

export default async function handler(req, res) {
  const leaderboardKey = 'leaderboard';

  if (req.method === 'POST') {
    const { username, score } = req.body;

    if (!username || !score) {
      return res.status(400).json({ error: 'Username and score are required' });
    }

    try {
      await redis.zadd(leaderboardKey, score, username);
      res.status(200).json({ message: 'Score saved successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save score' });
    }
  } else if (req.method === 'GET') {
    try {
      const leaderboard = await redis.zrevrange(leaderboardKey, 0, 9, { withScores: true });
      const formattedLeaderboard = [];
      for (let i = 0; i < leaderboard.length; i += 2) {
        formattedLeaderboard.push({
          username: leaderboard[i],
          score: parseInt(leaderboard[i + 1]),
        });
      }
      res.status(200).json(formattedLeaderboard);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}