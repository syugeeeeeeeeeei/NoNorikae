import type { Target, TimeRange } from '../types';

interface Props {
	targets: Target[];
	ranges: TimeRange[];
	selectedTargets: Set<string>;
	setSelectedTargets: (s: Set<string>) => void;
	selectedBands: Set<string>;
	setSelectedBands: (s: Set<string>) => void;
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

	const sectionStyle = {
		padding: '20px',
		borderBottom: '1px solid var(--border)'
	};

	const h4Style = {
		margin: '0 0 12px 0',
		fontSize: '0.85rem',
		color: 'var(--text-muted)',
		textTransform: 'uppercase' as const,
		letterSpacing: '0.05em',
		fontWeight: 700
	};

	return (
		<div className="filter-panel">
			{/* 起点駅選択 */}
			<div style={sectionStyle}>
				<h4 style={h4Style}>📍 対象オフィス (OR)</h4>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
					{props.targets.map(t => (
						<label key={t.node} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.95rem' }}>
							<input
								type="checkbox"
								checked={props.selectedTargets.has(t.node)}
								onChange={() => toggleSet(props.selectedTargets, t.node, props.setSelectedTargets)}
								style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
							/>
							{t.name}
						</label>
					))}
				</div>
			</div>

			{/* 所要時間選択（名称変更済み） */}
			<div style={sectionStyle}>
				<h4 style={h4Style}>🕒 所要時間</h4>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
					{props.ranges.map(r => {
						const band = `${r.lower}-${r.higher}`;
						const isChecked = props.selectedBands.has(band);
						return (
							<label
								key={band}
								style={{
									cursor: 'pointer',
									padding: '8px 14px',
									borderRadius: '24px',
									fontSize: '0.85rem',
									border: `1.5px solid ${isChecked ? 'var(--primary)' : 'var(--border)'}`,
									background: isChecked ? 'rgba(37, 99, 235, 0.1)' : '#fff',
									color: isChecked ? 'var(--primary)' : 'var(--text-main)',
									fontWeight: isChecked ? 600 : 400,
									transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
								}}
							>
								<input
									type="checkbox"
									checked={isChecked}
									onChange={() => toggleSet(props.selectedBands, band, props.setSelectedBands)}
									style={{ display: 'none' }}
								/>
								{r.lower} - {r.higher}分
							</label>
						);
					})}
				</div>
			</div>

			{/* キーワード検索 */}
			<div style={sectionStyle}>
				<h4 style={h4Style}>🔍 検索</h4>
				<input
					type="text"
					value={props.searchQuery}
					onChange={e => props.setSearchQuery(e.target.value)}
					placeholder="駅名・住所・路線..."
					style={{
						width: '100%',
						padding: '10px 14px',
						borderRadius: '8px',
						border: '1px solid var(--border)',
						fontSize: '0.9rem',
						outline: 'none',
						background: '#fcfcfc'
					}}
				/>
			</div>

			{/* 徒歩圏設定 */}
			<div style={sectionStyle}>
				<h4 style={h4Style}>🚶 徒歩圏 ({props.walkMinutes}分 = {props.walkMinutes * 80}m)</h4>
				<input
					type="range"
					min="0"
					max="30"
					step="5"
					value={props.walkMinutes}
					onChange={e => props.setWalkMinutes(Number(e.target.value))}
					style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
				/>
				<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
					<span>0分</span>
					<span>15分</span>
					<span>30分</span>
				</div>
			</div>

			{/* ヒット数表示 */}
			<div style={{ padding: '24px', background: 'var(--bg-color)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
				<div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>見つかった駅</div>
				<div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
					{props.count} <span style={{ fontSize: '1rem', fontWeight: 600 }}>駅</span>
				</div>
			</div>
		</div>
	);
}