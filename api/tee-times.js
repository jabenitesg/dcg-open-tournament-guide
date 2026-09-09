const SOURCE_URL = 'https://www.pgatour.com/americas/tournaments/2026/digital-commerce-group-open/Y2026007/tee-times';
const ROUND_DATES = { 1: '2026-09-10', 2: '2026-09-11', 3: '2026-09-12', 4: '2026-09-13' };

const ROUND_ONE_FALLBACK = [["2:00 PM","1",["Dillon Stewart","Berk Harvey","Hogan Ingram"]],["2:00 PM","10",["Joseph Winslow","Peter Knade","Calum Scott"]],["2:11 PM","1",["Abel Gallegos","Trey Bosco","Cole Rueck"]],["2:11 PM","10",["Cole Anderson","Chase Johnson","Nic Cassidy"]],["2:22 PM","1",["Connor Howe","Brady Siravo","Matthew Kress"]],["2:22 PM","10",["Justin Biwer","Drew Goodman","Max Sekulic"]],["2:33 PM","1",["Grant Booth","Marcos Montenegro","Johnny Travale"]],["2:33 PM","10",["Tripp Kinney","Brendan MacDougall","Andrew Morris"]],["2:44 PM","1",["Thomas Ponder","Patrick Newcomb","Connor Gaunt"]],["2:44 PM","10",["Eddy Lai","Cohen Trolio","Will Anderson"]],["2:55 PM","1",["Mason Williams","John Houk","Sebastian Moss"]],["2:55 PM","10",["Joey Savoie","Jonathan De Los Reyes","Adam Duncan"]],["3:06 PM","1",["James Piot","Lance Simpson","Bryan Lee"]],["3:06 PM","10",["Esteban Jaramillo","Hazen Newman","Chaz Aurilia"]],["3:17 PM","1",["Drew Doyle","Austin Greaser","Cameron Tankersley"]],["3:17 PM","10",["Riley Lewis","Brantley Scott","Gunnar Broin"]],["3:28 PM","1",["Alex Weiss","Ivan Camilo Ramirez","Yi Cao"]],["3:28 PM","10",["Mateo Fernández de Oliveira","Jake Peacock","Ethan Evans"]],["3:39 PM","1",["Omar Morales","Everett Whiten, Jr.","Jonathan Nielsen"]],["3:39 PM","10",["Corey Pereira","Jack Lundin","Jonas Baumgartner"]],["3:50 PM","1",["Dawson Armstrong","Ethan Ng","Max Barile"]],["3:50 PM","10",["Nathan Franks","Kieron van Wyk","Sangha Park"]],["4:01 PM","1",["Thomas Longbella","Beau Breault","Wil Gibson"]],["4:01 PM","10",["Joshua Lee","Enrique Dimayuga","Tegan Andrews"]],["4:12 PM","1",["Joel Thelen","Thomas Giroux","Ethan Tseng"]],["4:12 PM","10",["Callum Davison","Nathan Cogswell","Ryan Kao"]],["7:15 PM","1",["Étienne Papineau","Harry Lord","Kevin Johnson"]],["7:15 PM","10",["Charlie Nikitas","Greyson Leach","Gregory Odom, Jr."]],["7:26 PM","1",["Mats Ege","Scott Stevens","Jake Hall"]],["7:26 PM","10",["Danny Fisher","Luke Gannon","Josh Anderson"]],["7:37 PM","1",["Marcus Byrd","Connor Creasy","Andre Chi"]],["7:37 PM","10",["Chris Crawford","Cooper Smith","Max Schliesing"]],["7:48 PM","1",["Patrick Flavin","Philip Barbaree, Jr.","Calen Sanderson"]],["7:48 PM","10",["Brett Roberts","Chuan-Tai Lin","Joaquin Ludueña"]],["7:59 PM","1",["Luke Long","Paul Chaplet","Chris Nido"]],["7:59 PM","10",["Cristian DiMarco","Tom Fischer","Spencer Ralston"]],["8:10 PM","1",["Jake Sollon","Garrison Smith","Cole Ponich"]],["8:10 PM","10",["Ben Warian","Peyton Callens","Hunter Thomson"]],["8:21 PM","1",["Caden Fioroni","Kyle Cottam","Zach Pollo"]],["8:21 PM","10",["Brady McKinlay","Ryan Voois","Zach Adams"]],["8:32 PM","1",["Mesa Falleur","Garrett Endicott","Cade Anderson"]],["8:32 PM","10",["Evan Knight","Jake Staiano","David Longmire"]],["8:43 PM","1",["Herman Wibe Sekne","Ford Clegg","Paul Chang"]],["8:43 PM","10",["Tommy Cocha","Mark Goetz","Finigan Tilly"]],["8:54 PM","1",["Joey Vrzich","Luis Gagne","Jeremy Sisson"]],["8:54 PM","10",["Mason Greene","Charlie Crockett","Noah Steele"]],["9:05 PM","1",["Tanner Gore","Leo Oyo","Marcelo Garza"]],["9:05 PM","10",["Griffin Barela","John DuBois","Piercen Hunt"]],["9:16 PM","1",["Patrick Sheehan","Zach Smith","Jaxon Dowell"]],["9:16 PM","10",["Daniel Svärd","Christian Banke","Evan Vo"]],["9:27 PM","1",["Ashton McCulloch","Laurent Desmarchais","Mac Boucher"]],["9:27 PM","10",["Khan Lee","Brian Xu","Seth Bearden"]]];

function decodeEntities(value) {
  return value.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&([a-zA-Z]+);/g, '$1');
}

function utcIso(date, time) {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  return `${date}T${String(hour).padStart(2, '0')}:${match[2]}:00Z`;
}

function normalizeGroups(rows, round) {
  const date = ROUND_DATES[round];
  if (!date) return [];
  return rows.map(([time, tee, players]) => ({ timeUtc: utcIso(date, time), tee, players })).filter(group => group.timeUtc);
}

function parseOfficialPage(html) {
  const rowMatches = [...html.matchAll(/<tr class="group-\d+-(\d+)[^"]*"[\s\S]*?<\/tr>/g)];
  if (!rowMatches.length) return null;
  const round = Number(rowMatches[0][1]);
  const rows = rowMatches.map(match => {
    const row = match[0];
    const time = row.match(/>(\d{1,2}:\d{2}\s*(?:AM|PM))<\/span>/i)?.[1];
    const tee = row.match(/<p class="chakra-text css-0">(\d+)<\/p>/)?.[1];
    const players = [...row.matchAll(/<img[^>]+alt="([^"]+)"[^>]*class="chakra-avatar__img/g)].map(player => decodeEntities(player[1]));
    return time && tee && players.length === 3 ? [time, tee, players] : null;
  }).filter(Boolean);
  return rows.length ? { round, groups: normalizeGroups(rows, round) } : null;
}

module.exports = async function handler(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  try {
    const source = await fetch(SOURCE_URL, { headers: { 'user-agent': 'DCG Open Spectator Guide/1.0', accept: 'text/html' } });
    if (!source.ok) throw new Error(`PGA TOUR response ${source.status}`);
    const parsed = parseOfficialPage(await source.text());
    if (!parsed?.groups?.length) throw new Error('No official groupings found');
    response.status(200).json({ ...parsed, source: SOURCE_URL, updatedAt: new Date().toISOString() });
  } catch (error) {
    const fallbackStillRelevant = Date.now() < Date.parse('2026-09-11T07:00:00Z');
    if (fallbackStillRelevant) {
      response.status(200).json({ round: 1, groups: normalizeGroups(ROUND_ONE_FALLBACK, 1), source: SOURCE_URL, updatedAt: new Date().toISOString(), fallback: true });
      return;
    }
    response.status(503).json({ error: 'Official tee times are temporarily unavailable', source: SOURCE_URL });
  }
};
