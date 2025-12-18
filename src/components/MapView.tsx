import type { CircleMarker as LeafletCircleMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Station } from '../types';

/**
 * マップの移動を制御するコンポーネント
 */
function MapController({
	stations,
	focusedStationId
}: {
	stations: Station[],
	focusedStationId: string | null
}) {
	const map = useMap();
	const isFirstLoad = useRef(true);

	// 初回ロード時に全ての駅が収まるように表示範囲を調整
	useEffect(() => {
		if (isFirstLoad.current && stations.length > 0) {
			const bounds = stations.map(s => [s.coord.lat, s.coord.lon] as [number, number]);
			map.fitBounds(bounds, { padding: [50, 50] });
			isFirstLoad.current = false;
		}
	}, [stations, map]);

	// 選択された駅が変わったら、その位置へスムーズに移動
	useEffect(() => {
		if (focusedStationId) {
			const target = stations.find(s => s.stationId === focusedStationId);
			if (target) {
				map.flyTo([target.coord.lat, target.coord.lon], 15, { animate: true, duration: 1.0 });
			}
		}
	}, [focusedStationId, stations, map]);

	return null;
}

interface Props {
	stations: Station[];
	walkMinutes: number;
	focusedStationId: string | null;
	onStationSelect: (id: string | null) => void;
}

export default function MapView({ stations, walkMinutes, focusedStationId, onStationSelect }: Props) {
	// マーカーのインスタンスを保持し、命令的にポップアップを制御するためのRef
	const markerRefs = useRef<Record<string, LeafletCircleMarker | null>>({});

	// 選択された駅のポップアップを開く
	useEffect(() => {
		if (focusedStationId && markerRefs.current[focusedStationId]) {
			const marker = markerRefs.current[focusedStationId];
			if (marker) {
				// flyTo のアニメーション完了を待ってから開く
				const timer = setTimeout(() => {
					marker.openPopup();
				}, 100);
				return () => clearTimeout(timer);
			}
		}
	}, [focusedStationId]);

	return (
		<MapContainer center={[35.6812, 139.7671]} zoom={13} style={{ height: '100%', width: '100%' }}>
			{/* 視認性が高く、日本語表記が安定している標準の OpenStreetMap を使用。
        タイルサーバーはブラウザの言語設定を考慮する標準のものを採用。
      */}
			<TileLayer
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			/>

			<MapController
				stations={stations}
				focusedStationId={focusedStationId}
			/>

			{stations.map(s => {
				const primaryLine = s.lines[0];
				const lineColor = s.lineMeta[primaryLine]?.color || '#2563eb';
				const isSelected = s.stationId === focusedStationId;

				return (
					<div key={s.stationId}>
						{/* 駅ピン（マーカー） */}
						<CircleMarker
							ref={(ref) => {
								if (ref) {
									markerRefs.current[s.stationId] = ref;
								}
							}}
							center={[s.coord.lat, s.coord.lon]}
							radius={isSelected ? 10 : 7}
							eventHandlers={{
								click: () => {
									// すでに選択済みの場合は強制的にポップアップを開く
									if (isSelected) {
										markerRefs.current[s.stationId]?.openPopup();
									} else {
										onStationSelect(s.stationId);
									}
								},
								popupclose: () => {
									// ポップアップが閉じられたら、Reactの状態もリセットする。
									// これにより、次に同じ駅をクリックした時に正しく再検知される。
									// ただし、別の駅をクリックしたことによる「自動クローズ」との競合を防ぐため
									// 自分が選択中の時のみ null に戻す。
									if (focusedStationId === s.stationId) {
										onStationSelect(null);
									}
								}
							}}
							pathOptions={{
								color: '#fff',
								weight: 2,
								fillColor: lineColor,
								fillOpacity: 1
							}}
						>
							<Popup>
								<div style={{ minWidth: '220px' }}>
									<h3 style={{ margin: '0 0 8px', fontSize: '1rem', borderBottom: `2px solid ${lineColor}`, paddingBottom: '4px' }}>
										{s.stationName}
									</h3>
									<div style={{ fontSize: '0.8rem', marginBottom: '8px', color: '#64748b' }}>
										{s.roughAddress}
									</div>
									<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
										{s.reachable.map((r, idx) => (
											<div key={idx} style={{
												background: '#f8fafc',
												padding: '6px 10px',
												borderRadius: '6px',
												fontSize: '0.85rem',
												borderLeft: `4px solid ${s.lineMeta[r.line]?.color || '#ccc'}`,
												boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
											}}>
												<div style={{ color: '#64748b', fontSize: '0.75rem' }}>{r.target} まで</div>
												<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
													<span style={{ fontWeight: 600 }}>{r.line}</span>
													<span style={{ fontWeight: 800, color: '#2563eb', fontSize: '1rem' }}>{r.timeMinutes}分</span>
												</div>
											</div>
										))}
									</div>
								</div>
							</Popup>
						</CircleMarker>

						{/* 徒歩圏の同心円 */}
						{isSelected && (
							<Circle
								center={[s.coord.lat, s.coord.lon]}
								radius={walkMinutes * 80}
								eventHandlers={{
									click: () => {
										// 円をクリックした際もポップアップを強制的に開く（バグ対策）
										markerRefs.current[s.stationId]?.openPopup();
									}
								}}
								pathOptions={{
									color: lineColor,
									fillColor: lineColor,
									fillOpacity: 0.1,
									weight: 1,
									dashArray: '5, 5',
									interactive: true // クリックイベントを有効化
								}}
							/>
						)}
					</div>
				);
			})}
		</MapContainer>
	);
}