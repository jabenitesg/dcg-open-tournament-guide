const SOURCE_URL = 'https://www.pgatour.com/americas/tournaments/2026/digital-commerce-group-open/Y2026007/leaderboard';

function findLeaderboardData(nextData) {
  const queries = nextData?.props?.pageProps?.dehydratedState?.queries || [];
  return queries.find(query => query?.state?.data?.__typename === 'LeaderboardV3');
}

function getRoundNumber(leaderboard) {
  return Number.parseInt(String(leaderboard?.leaderboardRoundHeader || '').replace(/\D/g, ''), 10) || 0;
}

function hasCompletedRound(row, roundNumber) {
  const scoring = row?.scoringData;
  if (!scoring) return true;
  const state = String(scoring.playerState || '').toUpperCase();
  const thru = String(scoring.thru || '').toUpperCase();
  const roundScore = scoring.rounds?.[roundNumber - 1];
  if (/WITHDRAW|DISQUAL|CUT|\bWD\b|\bDQ\b/.test(state)) return true;
  if (thru.startsWith('F') || Number.parseInt(thru, 10) >= 18) return true;
  return roundScore !== undefined && roundScore !== null && roundScore !== '' && roundScore !== '-';
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

    const roundNumber = getRoundNumber(leaderboard);
    const roundPlayers = leaderboard.players.filter(row => row.scoringData);
    const roundComplete = roundPlayers.length > 0 && roundNumber > 0 && roundPlayers.every(row => hasCompletedRound(row, roundNumber));
    const rankedPlayers = leaderboard.players.filter(row => row.scoringData?.total && !/WD|DQ/i.test(String(row.scoringData?.position || '')));
    const cutBoundary = roundNumber === 2 && rankedPlayers.length >= 60 ? rankedPlayers[59] : null;
    const cut = cutBoundary ? {
      score: cutBoundary.scoringData.total,
      status: roundComplete ? 'official' : 'projected'
    } : null;

    const updatedMs = Number(query.state.dataUpdatedAt);
    response.status(200).json({
      round: leaderboard.leaderboardRoundHeader || '',
      roundComplete,
      cut,
      players,
      source: SOURCE_URL,
      updatedAt: Number.isFinite(updatedMs) ? new Date(updatedMs).toISOString() : new Date().toISOString()
    });
  } catch (error) {
    response.status(503).json({ error: 'Official leaderboard is temporarily unavailable', source: SOURCE_URL });
  }
};
