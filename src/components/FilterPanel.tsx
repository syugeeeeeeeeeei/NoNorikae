import type { Target, TimeRange } from '../types';

interface Props {
	targets: Target[];
	ranges: TimeRange[];
	selectedTargets: Set<string>;
	setSelectedTargets: (s: Set<string>) => void;
	selectedBands: Set<string>;
	setSelectedBands: (s: Set<string>) => void;
	maxMinutes: number | "";
	setMaxMinutes: (n: number | "") => void;
	searchQuery: string;
	setSearchQuery: (s: string) => void;
	walkMinutes: number;
	setWalkMinutes: (n: number) => void;
	count: number;
}

export default function FilterPanel(props: Props) {
	const toggleSet = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
		const next = new Set(set);
		if (next.has(val)) next.delete(val); else next.add(val);
		setter(next);
	};

	return (
		<div className="filter-panel">
			<section>
				<h4>起点駅 (OR)</h4>
				{props.targets.map(t => (
					<label key={t.node}>
						<input type="checkbox" checked={props.selectedTargets.has(t.node)} onChange={() => toggleSet(props.selectedTargets, t.node, props.setSelectedTargets)} />
						{t.name}
					</label>
				))}
			</section>

			<section>
				<h4>時間帯</h4>
				{props.ranges.map(r => {
					const band = `${r.lower}-${r.higher}`;
					return (
						<label key={band}>
							<input type="checkbox" checked={props.selectedBands.has(band)} onChange={() => toggleSet(props.selectedBands, band, props.setSelectedBands)} />
							{band}分
						</label>
					);
				})}
			</section>

			<section>
				<h4>最大所要時間</h4>
				<input type="number" value={props.maxMinutes} onChange={e => props.setMaxMinutes(e.target.value ? Number(e.target.value) : "")} placeholder="制限なし" />
			</section>

			<section>
				<h4>駅名検索</h4>
				<input type="text" value={props.searchQuery} onChange={e => props.setSearchQuery(e.target.value)} placeholder="駅名・住所・路線" />
			</section>

			<section>
				<h4>徒歩圏 (1分=80m)</h4>
				<input type="range" min="0" max="30" value={props.walkMinutes} onChange={e => props.setWalkMinutes(Number(e.target.value))} />
				<span>徒歩 {props.walkMinutes} 分</span>
			</section>

			<div className="stats">
				ヒット数: <strong>{props.count}</strong> 駅
			</div>
		</div>
	);
}