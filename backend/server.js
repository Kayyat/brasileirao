import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const fsp = fs.promises;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const TOKEN = process.env.FD_API_TOKEN;
const BASE_URL = "https://api.football-data.org/v4";
const COMPETITION = "BSA"; // Brasileirão Série A
const RANKING_CACHE_FILE = path.join(__dirname, "ranking_cache.json");
const HISTORIC_DATA_PATH = path.join(__dirname, "data", "ranking_historico.json");

// --- cache em memória ---
const cache = new Map();
function setCache(key, data, ttl = 60) {
  cache.set(key, { data, expires: Date.now() + ttl * 1000 });
}
function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

async function fetchFromFootballData(endpoint, { params = {} } = {}) {
  return axios.get(`${BASE_URL}${endpoint}`, {
    headers: { "X-Auth-Token": TOKEN },
    params,
  });
}

async function fetchCompetitionMatches(params = {}) {
  const cacheKey = `matches-${JSON.stringify(params)}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const response = await fetchFromFootballData(`/competitions/${COMPETITION}/matches`, {
    params,
  });

  setCache(cacheKey, response.data, params.status === "IN_PLAY" ? 30 : 120);
  return response.data;
}

async function fetchStandings(params = {}) {
  const cacheKey = `standings-${JSON.stringify(params)}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const response = await fetchFromFootballData(`/competitions/${COMPETITION}/standings`, {
    params,
  });

  setCache(cacheKey, response.data, 120);
  return response.data;
}

async function readRankingCache() {
  try {
    const [raw, stats] = await Promise.all([
      fsp.readFile(RANKING_CACHE_FILE, "utf-8"),
      fsp.stat(RANKING_CACHE_FILE),
    ]);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return {
        generatedAt: stats.mtime.toISOString(),
        ranking: parsed,
      };
    }
    return parsed;
  } catch (err) {
    return null;
  }
}

async function writeRankingCache(payload) {
  await fsp.writeFile(RANKING_CACHE_FILE, JSON.stringify(payload, null, 2));
}

let rankingJobRunning = false;
async function refreshRankingCache(force = false) {
  if (rankingJobRunning) return;
  rankingJobRunning = true;
  try {
    if (!TOKEN) {
      console.warn("FD_API_TOKEN não configurado. Mantendo ranking em cache existente.");
      return;
    }
    const cache = force ? null : await readRankingCache();
    const ageHours = cache?.generatedAt
      ? (Date.now() - new Date(cache.generatedAt).getTime()) / (1000 * 60 * 60)
      : Infinity;
    if (!force && ageHours < 24) {
      rankingJobRunning = false;
      return;
    }

    const currentYear = new Date().getFullYear();
    const startYear = 2015;
    const acumulado = {};

    for (const year of Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i)) {
      let retries = 0;
      const maxRetries = 3;
      let success = false;
      while (!success && retries < maxRetries) {
        try {
          const response = await fetchFromFootballData(`/competitions/${COMPETITION}/standings`, {
            params: { season: year },
          });
          const table = response.data.standings?.find((s) => s.type === "TOTAL")?.table || [];
          table.forEach((team) => {
            const name = team.team.name;
            if (!acumulado[name]) {
              acumulado[name] = {
                nome: name,
                escudo: team.team.crest,
                pontos: 0,
                jogos: 0,
                vitorias: 0,
                empates: 0,
                derrotas: 0,
                golsPro: 0,
                golsContra: 0,
                temporadas: {},
              };
            }

            acumulado[name].pontos += team.points;
            acumulado[name].jogos += team.playedGames;
            acumulado[name].vitorias += team.won;
            acumulado[name].empates += team.draw;
            acumulado[name].derrotas += team.lost;
            acumulado[name].golsPro += team.goalsFor;
            acumulado[name].golsContra += team.goalsAgainst;
            acumulado[name].temporadas[year] = {
              pontos: team.points,
              posicao: team.position,
            };
          });
          success = true;
        } catch (err) {
          retries += 1;
          const waitTime = 5000 * retries;
          console.error(`Erro ao atualizar temporada ${year} (tentativa ${retries}):`, err.message);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    const ranking = Object.values(acumulado)
      .map((team) => ({
        ...team,
        saldo: team.golsPro - team.golsContra,
        aproveitamento: team.jogos ? (team.pontos / (team.jogos * 3)) * 100 : 0,
      }))
      .sort((a, b) => b.pontos - a.pontos);

    await writeRankingCache({ generatedAt: new Date().toISOString(), ranking });
  } finally {
    rankingJobRunning = false;
  }
}

const liveClients = new Set();
let livePollingInterval = null;
let latestLiveMatches = { matches: [] };

async function pollLiveMatches() {
  try {
    const data = await fetchCompetitionMatches({ status: "IN_PLAY" });
    const payload = { matches: data.matches || [] };
    latestLiveMatches = payload;
    for (const client of liveClients) {
      client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  } catch (err) {
    console.error("Erro ao atualizar partidas ao vivo:", err.message);
  }
}

function ensureLivePolling() {
  if (livePollingInterval) return;
  pollLiveMatches().catch(() => {});
  livePollingInterval = setInterval(() => {
    pollLiveMatches().catch(() => {});
  }, 20000);
}

function stopLivePollingIfNeeded() {
  if (liveClients.size === 0 && livePollingInterval) {
    clearInterval(livePollingInterval);
    livePollingInterval = null;
  }
}

// --- rotas ---
app.get("/api/standings", async (req, res) => {
  try {
    const response = await fetchStandings();
    res.json(response);
  } catch (err) {
    const status = err.response?.status;
    if (status === 429) {
      return res
        .status(429)
        .json({ error: "Limite de requisições atingido. Tente novamente em 1 minuto." });
    }
    res.status(500).json({ error: "Erro ao buscar classificação" });
  }
});

app.get("/api/matches", async (req, res) => {
  const { matchday, live } = req.query;
  try {
    const params = {};
    if (matchday) params.matchday = matchday;
    const data = await fetchCompetitionMatches(params);
    let responseData = { ...data };
    if (live === "true") {
      // filtra apenas partidas em andamento
      responseData = {
        ...responseData,
        matches: (responseData.matches || []).filter((m) => m.status === "IN_PLAY"),
      };
    }
    res.json(responseData);
  } catch (err) {
    const status = err.response?.status;
    if (status === 429) {
      return res.status(429).json({ error: "Limite de requisições atingido. Aguarde 1 minuto." });
    }
    res.status(500).json({ error: "Erro ao buscar partidas" });
  }
});

// Jogos em andamento (status = IN_PLAY)
app.get("/api/live", async (req, res) => {
  try {
    const data = await fetchCompetitionMatches({ status: "IN_PLAY" });
    res.json({ matches: data.matches || [] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Erro ao buscar partidas ao vivo" });
  }
});

app.get("/api/metadata", async (req, res) => {
  try {
    const data = await fetchCompetitionMatches();
    const matches = data.matches || [];
    const rounds = Array.from(new Set(matches.map((m) => m.matchday).filter(Boolean))).sort(
      (a, b) => a - b
    );
    const statuses = matches.reduce((acc, match) => {
      acc[match.status] = (acc[match.status] || 0) + 1;
      return acc;
    }, {});
    const venues = Array.from(new Set(matches.map((m) => m.venue).filter(Boolean))).sort();
    const teams = Array.from(
      new Set(
        matches.flatMap((m) => [m.homeTeam?.shortName, m.awayTeam?.shortName]).filter(Boolean)
      )
    ).sort();
    const broadcasters = Array.from(
      new Set(
        matches.flatMap((m) =>
          Array.isArray(m.broadcasters)
            ? m.broadcasters.map((b) => b.name).filter(Boolean)
            : []
        )
      )
    ).sort();

    res.json({ rounds, statuses, venues, teams, broadcasters });
  } catch (err) {
    console.error("Erro ao montar metadados:", err.message);
    res.status(500).json({ error: "Não foi possível carregar os metadados agora" });
  }
});

app.get("/api/matches/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("retry: 5000\n\n");

  const client = { res };
  liveClients.add(client);
  ensureLivePolling();

  if (latestLiveMatches.matches?.length) {
    res.write(`data: ${JSON.stringify(latestLiveMatches)}\n\n`);
  }

  req.on("close", () => {
    liveClients.delete(client);
    stopLivePollingIfNeeded();
  });
});

// 🏆 Ranking geral (pontos corridos 2003–2025)
app.get("/api/ranking", async (req, res) => {
  try {
    const cache = await readRankingCache();
    if (!cache?.ranking) {
      await refreshRankingCache(true);
      const updated = await readRankingCache();
      return res.json(updated?.ranking || []);
    }

    const ageHours = (Date.now() - new Date(cache.generatedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours > 24) {
      refreshRankingCache().catch((err) =>
        console.error("Erro ao agendar atualização do ranking:", err.message)
      );
    }

    res.json(cache.ranking);
  } catch (err) {
    console.error("Erro ao recuperar ranking:", err.message);
    res.status(500).json({ error: "Não foi possível carregar o ranking histórico" });
  }
});

app.post("/api/ranking/refresh", async (req, res) => {
  try {
    await refreshRankingCache(true);
    const cache = await readRankingCache();
    res.json({ ok: true, generatedAt: cache?.generatedAt, totalClubes: cache?.ranking?.length || 0 });
  } catch (err) {
    res.status(500).json({ error: "Não foi possível atualizar o ranking agora" });
  }
});

// Classificação híbrida: Football-Data + histórico local
app.get("/api/standings/:season/:type", async (req, res) => {
  const { season, type } = req.params;
  const cacheKey = `standings-${season}-${type}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  const historico = JSON.parse(fs.readFileSync(HISTORIC_DATA_PATH, "utf-8"));

  // ✅ se a temporada estiver no arquivo local, retorna diretamente
  if (historico[season]) {
    console.log(`📘 Usando dados locais da temporada ${season}`);
    const table = historico[season];
    setCache(cacheKey, { season, type, table }, 3600);
    return res.json({ season, type, table });
  }

  // 🔄 caso contrário, tenta buscar da API Football-Data
  try {
    console.log(`🌐 Buscando dados da API Football-Data (${season}, ${type})...`);
    const response = await fetchStandings({ season });

    const standings = response.standings || [];
    const table = standings.find((s) => s.type === type.toUpperCase())?.table || [];

    if (table.length === 0) {
      console.warn(`⚠️ Sem dados disponíveis para ${season} (${type})`);
      return res.json({ season, type, table: [] });
    }

    setCache(cacheKey, { season, type, table }, 300);
    res.json({ season, type, table });
  } catch (err) {
    console.error(`❌ Erro ao buscar standings ${season}/${type}:`, err.response?.status || err.message);
    res.json({ season, type, table: [] });
  }
});

app.listen(PORT, () => console.log(`✅ Backend rodando em http://localhost:${PORT}`));
