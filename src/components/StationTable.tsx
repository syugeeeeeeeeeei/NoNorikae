import type { Station } from '../types';

export default function StationTable({ stations }: { stations: Station[] }) {
	return (
		<div className="table-container" style={{ overflowY: 'auto', height: '100%' }}>
			<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
				<thead style={{ position: 'sticky', top: 0, background: 'var(--panel2)' }}>
					<tr>
						<th style={{ padding: '8px', textAlign: 'left' }}>駅名</th>
						<th style={{ padding: '8px', textAlign: 'left' }}>路線</th>
						<th style={{ padding: '8px', textAlign: 'left' }}>最短</th>
						<th style={{ padding: '8px', textAlign: 'left' }}>住所</th>
					</tr>
				</thead>
				<tbody>
					{stations.map(s => (
						<tr key={s.stationId} style={{ borderBottom: '1px solid var(--line)' }}>
							<td style={{ padding: '8px' }}>{s.stationName}</td>
							<td style={{ padding: '8px' }}>{s.lines.join(', ')}</td>
							<td style={{ padding: '8px' }}>{Math.min(...s.reachable.map(r => r.timeMinutes))}分</td>
							<td style={{ padding: '8px', color: 'var(--muted)' }}>{s.roughAddress}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}