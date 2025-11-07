import rankingData from "../data/rankingGeral.json";

export default function RankingGeral() {
  return (
    <section>
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        🏆 Ranking Geral - Pontos Corridos (2003–2024)
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full border dark:border-gray-700 text-gray-900 dark:text-gray-100">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2 text-left">Time</th>
              <th className="p-2">Pts</th>
              <th className="p-2">V</th>
              <th className="p-2">E</th>
              <th className="p-2">D</th>
              <th className="p-2">GP</th>
              <th className="p-2">GC</th>
            </tr>
          </thead>
          <tbody>
            {rankingData.map((team) => (
              <tr
                key={team.pos}
                className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <td className="p-2 text-center">{team.pos}</td>
                <td className="p-2">{team.time}</td>
                <td className="p-2 text-center font-semibold">{team.pontos}</td>
                <td className="p-2 text-center">{team.vitorias}</td>
                <td className="p-2 text-center">{team.empates}</td>
                <td className="p-2 text-center">{team.derrotas}</td>
                <td className="p-2 text-center">{team.gols_pro}</td>
                <td className="p-2 text-center">{team.gols_contra}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        Fonte: CBF / Dados históricos de 2003 a 2024
      </p>
    </section>
  );
}
