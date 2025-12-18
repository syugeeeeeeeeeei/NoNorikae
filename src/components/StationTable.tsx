import { useEffect, useRef } from 'react';
import type { Station } from '../types';

interface Props {
	stations: Station[];
	focusedStationId: string | null;
	onStationSelect: (id: string | null) => void;
}

export default function StationTable({ stations, focusedStationId, onStationSelect }: Props) {
	const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

	// focusedStationIdが変わったらスクロール
	useEffect(() => {
		if (focusedStationId && rowRefs.current[focusedStationId]) {
			rowRefs.current[focusedStationId]?.scrollIntoView({
				behavior: 'smooth',
				block: 'center'
			});
		}
	}, [focusedStationId]);

	return (
		<div className="table-container" style={{ overflowY: 'auto', height: '100%', width: '100%' }}>
			<table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.9rem' }}>
				<thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
					<tr style={{ background: '#f1f5f9', color: '#475569' }}>
						<th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>駅名</th>
						<th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>路線</th>
						<th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 600, width: '80px' }}>最短</th>
						<th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>住所</th>
					</tr>
				</thead>
				<tbody>
					{stations.map(s => {
						const isSelected = s.stationId === focusedStationId;
						return (
							<tr
								key={s.stationId}
								// 修正: 返り値をvoidにするため、ブロックで囲みました
								ref={el => { rowRefs.current[s.stationId] = el; }}
								onClick={() => onStationSelect(s.stationId)}
								style={{
									background: isSelected ? '#eff6ff' : '#fff',
									cursor: 'pointer',
									transition: 'background 0.2s'
								}}
								className="hover:bg-slate-50"
							>
								<td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#1e293b' }}>
									{s.stationName}
								</td>
								<td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
									<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
										{s.lines.map(line => {
											const color = s.lineMeta[line]?.color || '#ccc';
											return (
												<span key={line} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
													<span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }}></span>
													{line}
												</span>
											);
										})}
									</div>
								</td>
								<td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
									<span style={{ fontWeight: 'bold', color: '#2563eb' }}>
										{Math.min(...s.reachable.map(r => r.timeMinutes))}
									</span>
									<span style={{ fontSize: '0.75rem', color: '#64748b' }}>分</span>
								</td>
								<td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.8rem' }}>
									{s.roughAddress}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}