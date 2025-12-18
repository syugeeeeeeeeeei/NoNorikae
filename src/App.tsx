import { useEffect, useMemo, useState } from 'react';
import { fetchReachableData } from './api/navitime';
import './App.css';
import FilterPanel from './components/FilterPanel';
import MapView from './components/MapView';
import StationTable from './components/StationTable';
import type { Station, Target, TimeRange } from './types';

const TARGETS: Target[] = [
  { name: "茅場町", node: "00001303" },
  { name: "八丁堀", node: "00007548" },
  { name: "水天宮前", node: "00004569" },
];

const RANGES: TimeRange[] = [
  { lower: 0, higher: 10 },
  { lower: 10, higher: 20 },
  { lower: 20, higher: 30 },
  { lower: 30, higher: 40 },
];

function App() {
  const [allStations, setAllStations] = useState<Record<string, Station>>({});
  const [loading, setLoading] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set(TARGETS.map(t => t.node)));
  const [selectedBands, setSelectedBands] = useState<Set<string>>(new Set(RANGES.map(r => `${r.lower}-${r.higher}`)));
  const [maxMinutes, setMaxMinutes] = useState<number | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [walkMinutes, setWalkMinutes] = useState(10);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      const newStations: Record<string, Station> = {};

      try {
        for (const target of TARGETS) {
          for (const range of RANGES) {
            const result = await fetchReachableData(target, range);
            result.forEach(s => {
              if (!newStations[s.stationId]) {
                newStations[s.stationId] = s;
              } else {
                // 重複駅情報のマージ
                const existing = newStations[s.stationId];
                if (!existing.lines.includes(s.lines[0])) {
                  existing.lines.push(s.lines[0]);
                  existing.lineMeta = { ...existing.lineMeta, ...s.lineMeta };
                }
                existing.reachable.push(s.reachable[0]);
              }
            });
            // API負荷軽減
            await new Promise(r => setTimeout(r, 200));
          }
        }
        setAllStations(newStations);
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const filteredStations = useMemo(() => {
    return Object.values(allStations).filter(s => {
      const matchesTarget = s.reachable.some(r => selectedTargets.has(r.targetNode));
      const matchesBand = s.reachable.some(r => selectedBands.has(r.timeBand));
      const matchesMinutes = maxMinutes === "" || s.reachable.some(r => r.timeMinutes <= (maxMinutes as number));
      const matchesSearch = searchQuery === "" ||
        s.stationName.includes(searchQuery) ||
        s.roughAddress.includes(searchQuery) ||
        s.lines.some(l => l.includes(searchQuery));

      return matchesTarget && matchesBand && matchesMinutes && matchesSearch;
    }).sort((a, b) => {
      const minA = Math.min(...a.reachable.map(r => r.timeMinutes));
      const minB = Math.min(...b.reachable.map(r => r.timeMinutes));
      return minA - minB;
    });
  }, [allStations, selectedTargets, selectedBands, maxMinutes, searchQuery]);

  return (
    <div className="app-container">
      <header>
        <h1>到達駅マップ（Vite + React 版）</h1>
        {loading && <div className="loading-bar">データ取得中...</div>}
      </header>

      <div className="main-layout">
        <aside className="sidebar">
          <FilterPanel
            targets={TARGETS}
            ranges={RANGES}
            selectedTargets={selectedTargets}
            setSelectedTargets={setSelectedTargets}
            selectedBands={selectedBands}
            setSelectedBands={setSelectedBands}
            maxMinutes={maxMinutes}
            setMaxMinutes={setMaxMinutes}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            walkMinutes={walkMinutes}
            setWalkMinutes={setWalkMinutes}
            count={filteredStations.length}
          />
        </aside>

        <main className="content">
          <div className="map-wrapper">
            <MapView stations={filteredStations} walkMinutes={walkMinutes} />
          </div>
          <div className="table-wrapper">
            <StationTable stations={filteredStations} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;