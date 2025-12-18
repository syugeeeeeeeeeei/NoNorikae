import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Station } from '../types';

function ChangeView({ stations }: { stations: Station[] }) {
	const map = useMap();
	useEffect(() => {
		if (stations.length > 0) {
			const bounds = stations.map(s => [s.coord.lat, s.coord.lon] as [number, number]);
			map.fitBounds(bounds, { padding: [50, 50] });
		}
	}, [stations, map]);
	return null;
}

export default function MapView({ stations, walkMinutes }: { stations: Station[], walkMinutes: number }) {
	return (
		<MapContainer center={[35.6812, 139.7671]} zoom={13} style={{ height: '100%', width: '100%' }}>
			<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
			<ChangeView stations={stations} />
			{stations.map(s => (
				<div key={s.stationId}>
					<CircleMarker
						center={[s.coord.lat, s.coord.lon]}
						radius={7}
						pathOptions={{ color: '#7aa2ff', fillColor: '#7aa2ff', fillOpacity: 0.8 }}
					>
						<Popup>
							<strong>{s.stationName}</strong><br />
							{s.roughAddress}<br />
							最短: {Math.min(...s.reachable.map(r => r.timeMinutes))}分
						</Popup>
					</CircleMarker>
					<Circle
						center={[s.coord.lat, s.coord.lon]}
						radius={walkMinutes * 80}
						pathOptions={{ color: '#7aa2ff', fillOpacity: 0.1, weight: 1 }}
					/>
				</div>
			))}
		</MapContainer>
	);
}