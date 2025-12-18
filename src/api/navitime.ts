import type { ApiResponse, Station, Target, TimeRange } from '../types';

const TRANSIT_LIMIT = 0;
const FIRST_TRAIN = true;
const EXPRESS_TRAIN = false;

function parsePrefCity(address: string): { pref?: string; cityWard?: string } {
	const m = address.match(/^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)(.+)$/);
	if (!m) return {};
	const pref = m[1];
	const rest = m[2];
	const mm = rest.match(/^(.+?(?:市|区|町|村))/);
	const cityWard = mm ? mm[1] : undefined;
	return { pref, cityWard };
}

export async function fetchReachableData(target: Target, range: TimeRange): Promise<Station[]> {
	// Vite の proxy 設定に合わせてパスを変更
	// 元: https://realestate.navitime.co.jp/api/route/reachable
	// 新: /api-proxy/api/route/reachable
	const url = new URL("/api-proxy/api/route/reachable", window.location.origin);

	url.searchParams.set("start", target.node);
	url.searchParams.set("lower_term", String(range.lower));
	url.searchParams.set("higher_term", String(range.higher));
	url.searchParams.set("transit_limit", String(TRANSIT_LIMIT));
	url.searchParams.set("first_train", FIRST_TRAIN ? "1" : "0");
	url.searchParams.set("express_train", EXPRESS_TRAIN ? "1" : "0");

	const response = await fetch(url.toString());
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	const data = (await response.json()) as ApiResponse;

	const stations: Station[] = [];
	for (const link of data.links ?? []) {
		for (const st of link.stations ?? []) {
			if (st.transit_count !== 0 || !st.coord) continue;

			const address = st.node_detail?.address_name ?? "";
			const { pref, cityWard } = parsePrefCity(address);

			stations.push({
				stationId: st.node_id,
				stationName: st.name,
				roughAddress: address,
				pref,
				cityWard,
				coord: st.coord,
				lines: [link.link_name],
				lineMeta: { [link.link_name]: { id: link.link_id, color: link.link_color } },
				reachable: [{
					target: target.name,
					targetNode: target.node,
					timeBand: `${range.lower}-${range.higher}`,
					timeMinutes: st.time,
					transitCount: st.transit_count,
					line: link.link_name
				}]
			});
		}
	}
	return stations;
}