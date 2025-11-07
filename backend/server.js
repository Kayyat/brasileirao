import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const TOKEN = process.env.FD_API_TOKEN;
const BASE_URL = "https://api.football-data.org/v4";
const COMPETITION = "BSA"; // Brasileirão Série A

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

// --- rotas ---
app.get("/api/standings", async (req, res) => {
  const cacheKey = "standings";
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await axios.get(`${BASE_URL}/competitions/${COMPETITION}/standings`, {
      headers: { "X-Auth-Token": TOKEN },
    });
    setCache(cacheKey, response.data, 120); // guarda por 2 minutos
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status;
    if (status === 429) {
      return res.status(429).json({ error: "Limite de requisições atingido. Tente novamente em 1 minuto." });
    }
    res.status(500).json({ error: "Erro ao buscar classificação" });
  }
});

app.get("/api/matches", async (req, res) => {
  const { matchday, live } = req.query;
  const cacheKey = `matches-${matchday || (live ? "live" : "all")}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await axios.get(`${BASE_URL}/competitions/${COMPETITION}/matches`, {
      headers: { "X-Auth-Token": TOKEN },
      params: matchday ? { matchday } : {},
    });

    let data = response.data;
    if (live === "true") {
      // filtra apenas partidas em andamento
      data.matches = data.matches.filter((m) => m.status === "IN_PLAY");
    }

    setCache(cacheKey, data, live ? 30 : 120); // cache menor p/ ao vivo
    res.json(data);
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
  const cacheKey = "live-matches";
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await axios.get(`${BASE_URL}/competitions/${COMPETITION}/matches`, {
      headers: { "X-Auth-Token": TOKEN },
    });

    // filtra jogos em andamento
    const live = response.data.matches.filter((m) => m.status === "IN_PLAY");
    setCache(cacheKey, { matches: live }, 30); // atualiza a cada 30 s
    res.json({ matches: live });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Erro ao buscar partidas ao vivo" });
  }
});

// 🏆 Ranking geral (pontos corridos 2003–2025)
app.get("/api/ranking", async (req, res) => {
  const cacheFile = "./ranking_cache.json";

  // 🔄 se o cache for recente (< 24h), retorna direto
  if (fs.existsSync(cacheFile)) {
    const stats = fs.statSync(cacheFile);
    const age = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
    if (age < 24) {
      const cached = JSON.parse(fs.readFileSync(cacheFile));
      return res.json(cached);
    }
  }

  const acumulado = {};
  const currentYear = new Date().getFullYear();
  const anos = Array.from({ length: currentYear - 2015 + 1 }, (_, i) => 2015 + i);

  for (const year of anos) {
    console.log(`🔹 Coletando temporada ${year}...`);
    try {
      const resp = await axios.get(
        `https://api.football-data.org/v4/competitions/BSA/standings?season=${year}`,
        { headers: { "X-Auth-Token": TOKEN } }
      );

      const table = resp.data.standings?.find(s => s.type === "TOTAL")?.table || [];

      for (const t of table) {
        const nome = t.team.name;
        if (!acumulado[nome]) {
          acumulado[nome] = {
            nome,
            escudo: t.team.crest,
            pontos: 0,
            jogos: 0,
            vitorias: 0,
            empates: 0,
            derrotas: 0,
            golsPro: 0,
            golsContra: 0
          };
        }

        acumulado[nome].pontos += t.points;
        acumulado[nome].jogos += t.playedGames;
        acumulado[nome].vitorias += t.won;
        acumulado[nome].empates += t.draw;
        acumulado[nome].derrotas += t.lost;
        acumulado[nome].golsPro += t.goalsFor;
        acumulado[nome].golsContra += t.goalsAgainst;
      }
    } catch (err) {
      console.error(`⚠️ Erro na temporada ${year}:`, err.response?.status || err.message);
      // se der erro (rate limit, etc), espera 10s
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  // calcula saldo e aproveitamento
  const ranking = Object.values(acumulado).map(team => ({
    ...team,
    saldo: team.golsPro - team.golsContra,
    aproveitamento: team.jogos ? (team.pontos / (team.jogos * 3)) * 100 : 0
  }));

  // ordena por pontos
  ranking.sort((a, b) => b.pontos - a.pontos);

  // salva cache
  fs.writeFileSync(cacheFile, JSON.stringify(ranking, null, 2));

  res.json(ranking);
});

// Classificação híbrida: Football-Data + histórico local
app.get("/api/standings/:season/:type", async (req, res) => {
  const { season, type } = req.params;
  const cacheKey = `standings-${season}-${type}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  const dataPath = path.join(process.cwd(), "data", "ranking_historico.json");
  const historico = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

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
    const response = await axios.get(`${BASE_URL}/competitions/${COMPETITION}/standings`, {
      headers: { "X-Auth-Token": TOKEN },
      params: { season },
    });

    const standings = response.data.standings || [];
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
