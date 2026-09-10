const SOURCE_URL = 'https://www.pgatour.com/americas/tournaments/2026/digital-commerce-group-open/Y2026007/leaderboard';

function findLeaderboardData(nextData) {
  const queries = nextData?.props?.pageProps?.dehydratedState?.queries || [];
  return queries.find(query => query?.state?.data?.__typename === 'LeaderboardV3');
}

module.exports = async function handler(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=90');

  try {
    const source = await fetch(SOURCE_URL, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; DCG Open Spectator Guide/1.0)',
        accept: 'text/html,application/xhtml+xml'
      }
    });
    if (!source.ok) throw new Error(`PGA TOUR response ${source.status}`);

    const html = await source.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) throw new Error('Leaderboard data was not found');

    const query = findLeaderboardData(JSON.parse(match[1]));
    const leaderboard = query?.state?.data;
    if (!leaderboard?.players?.length) throw new Error('No leaderboard players were found');

    const players = leaderboard.players.slice(0, 5).map(row => ({
      id: row.player?.id || row.id,
      position: row.scoringData?.position || '—',
      name: row.player?.displayName || 'Player',
      country: row.player?.country || '',
      total: row.scoringData?.total || 'E',
      today: row.scoringData?.score || 'E',
      thru: row.scoringData?.thru || '—'
    }));

    const roundPlayers = leaderboard.players.filter(row => row.scoringData);
    const roundComplete = roundPlayers.length > 0 && roundPlayers.every(row => {
      const state = String(row.scoringData?.playerState || '').toUpperCase();
      const thru = String(row.scoringData?.thru || '').toUpperCase();
      return (state && state !== 'ACTIVE') || thru.startsWith('F') || Number.parseInt(thru, 10) >= 18;
    });

    const updatedMs = Number(query.state.dataUpdatedAt);
    response.status(200).json({
      round: leaderboard.leaderboardRoundHeader || '',
      roundComplete,
      players,
      source: SOURCE_URL,
      updatedAt: Number.isFinite(updatedMs) ? new Date(updatedMs).toISOString() : new Date().toISOString()
    });
  } catch (error) {
    response.status(503).json({ error: 'Official leaderboard is temporarily unavailable', source: SOURCE_URL });
  }
};
