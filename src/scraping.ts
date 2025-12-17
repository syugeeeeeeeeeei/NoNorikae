import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

type TimeRange = { lower: number; higher: number };
type Target = { name: string; node: string; baseUrl: string };

type FlatStationRow = {
	target: string;
	targetNode: string;
	timeRange: TimeRange;
	timeBand: string; // "20-30"
	line: string;
	lineId?: string;
	lineColor?: string;
	stationId: string; // node_id
	stationName: string;
	timeMinutes: number;
	transitCount: number;
	roughAddress: string;
	pref?: string;
	cityWard?: string;
	coord?: { lat: number; lon: number };
};

type StructuredOutput = {
	generatedAt: string;
	source: {
		transitLimit: number;
		firstTrain: boolean;
		expressTrain: boolean;
		targets: Target[];
		ranges: TimeRange[];
	};
	stationsById: Record<
		string,
		{
			stationId: string;
			stationName: string;
			roughAddress: string;
			pref?: string;
			cityWard?: string;
			coord?: { lat: number; lon: number };
			lines: string[];
			lineMeta?: Record<string, { id?: string; color?: string }>; // lineName -> meta
			reachable: Array<{
				target: string;
				targetNode: string;
				timeBand: string;
				timeMinutes: number;
				transitCount: number;
				line: string;
			}>;
		}
	>;
	targetsIndex: Record<
		string,
		{
			target: string;
			targetNode: string;
			timeBands: Record<string, string[]>; // timeBand -> stationIds
		}
	>;
};

const TARGETS: Target[] = [
	{
		name: "茅場町",
		node: "00001303",
		baseUrl: "https://realestate.navitime.co.jp/chintai/reachable?node=00001303",
	},
	{
		name: "八丁堀",
		node: "00007548",
		baseUrl: "https://realestate.navitime.co.jp/chintai/reachable?node=00007548",
	},
	{
		name: "水天宮前",
		node: "00004569",
		baseUrl: "https://realestate.navitime.co.jp/chintai/reachable?node=00004569",
	},
];

const RANGES: TimeRange[] = [
	{ lower: 0, higher: 10 },
	{ lower: 10, higher: 20 },
	{ lower: 20, higher: 30 },
	{ lower: 30, higher: 40 },
];

const TRANSIT_LIMIT = 0;
const FIRST_TRAIN = true;
const EXPRESS_TRAIN = false;

// --- NAVITIME reachable API response types (必要分だけ) ---
type ApiCoord = { lat: number; lon: number };
type ApiStation = {
	time: number;
	coord?: ApiCoord;
	name: string;
	node_id: string;
	transit_count: number;
	node_detail?: {
		address_name?: string;
	};
};
type ApiLink = {
	link_id: string;
	link_name: string;
	link_color?: string;
	stations: ApiStation[];
};
type ApiResponse = {
	links: ApiLink[];
	count?: { station?: number; link?: number };
};


function timeBand(range: TimeRange) {
	return `${range.lower}-${range.higher}`;
}

function parsePrefCity(address: string): { pref?: string; cityWard?: string } {
	// 例: "東京都中野区中野" / "千葉県市川市富浜" / "神奈川県川崎市川崎区駅前本町"
	// 雑に「都道府県 + 次の行政区分っぽい部分」を切る（精密でなくてOK用途）
	const m = address.match(/^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)(.+)$/);
	if (!m) return {};
	const pref = m[1];
	const rest = m[2];

	// 市/区/町/村の先頭を拾う（例: 中野区 / 浦安市 / 川崎市川崎区）
	const mm = rest.match(/^(.+?(?:市|区|町|村))/);
	const cityWard = mm ? mm[1] : undefined;

	return { pref, cityWard };
}

function reachableApiUrl(startNode: string, range: TimeRange) {
	const u = new URL("https://realestate.navitime.co.jp/api/route/reachable");
	u.searchParams.set("start", startNode);
	u.searchParams.set("lower_term", String(range.lower));
	u.searchParams.set("higher_term", String(range.higher));
	u.searchParams.set("transit_limit", String(TRANSIT_LIMIT));
	u.searchParams.set("first_train", FIRST_TRAIN ? "1" : "0");
	u.searchParams.set("express_train", EXPRESS_TRAIN ? "1" : "0");
	return u.toString();
}

async function fetchJsonWithRetry<T>(
	url: string,
	opts: { retries?: number; backoffMs?: number; timeoutMs?: number } = {}
): Promise<T> {
	const retries = opts.retries ?? 3;
	const backoffMs = opts.backoffMs ?? 700;
	const timeoutMs = opts.timeoutMs ?? 30000;
	let lastErr: unknown;
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const ctrl = new AbortController();
			const timer = setTimeout(() => ctrl.abort(), timeoutMs);

			const res = await fetch(url, {
				method: "GET",
				headers: {
					// なくても通るはずだけど、JSON前提なら付けておく
					"accept": "application/json",
				},
				signal: ctrl.signal,
			}).finally(() => clearTimeout(timer));

			if (!res.ok) {
				throw new Error(`HTTP ${res.status} ${res.statusText}`);
			}
			const data = (await res.json()) as T;
			return data;
		} catch (e) {
			lastErr = e;
			if (attempt < retries) {
				await sleep(backoffMs * Math.pow(2, attempt));
				continue;
			}
		}
	}
	throw lastErr;
}

function pickBetterReachable(
	a: { timeMinutes: number; timeBand: string },
	b: { timeMinutes: number; timeBand: string }
) {
	// まず timeMinutes が小さいほうを採用
	if (a.timeMinutes !== b.timeMinutes) return a.timeMinutes < b.timeMinutes ? a : b;

	// 同分なら timeBand が短い側（lowerが小さい側）を採用（例: 10-20 を優先）
	const al = Number(a.timeBand.split("-")[0]);
	const bl = Number(b.timeBand.split("-")[0]);
	return al <= bl ? a : b;
}

async function main() {
	const flat: FlatStationRow[] = [];

	for (const target of TARGETS) {
		for (const range of RANGES) {
			const url = reachableApiUrl(target.node, range);
			console.log(`[API] ${target.name} ${timeBand(range)} => ${url}`);

			const data = await fetchJsonWithRetry<ApiResponse>(url, { retries: 4, timeoutMs: 45000 });

			for (const link of data.links ?? []) {
				for (const st of link.stations ?? []) {
					// 念のため（要件: 乗換0回）
					if (st.transit_count !== 0) continue;

					const address = st.node_detail?.address_name ?? "";
					const { pref, cityWard } = parsePrefCity(address);

					flat.push({
						target: target.name,
						targetNode: target.node,
						timeRange: range,
						timeBand: timeBand(range),
						line: link.link_name,
						lineId: link.link_id,
						lineColor: link.link_color,
						stationId: st.node_id,
						stationName: st.name,
						timeMinutes: st.time,
						transitCount: st.transit_count,
						roughAddress: address,
						pref,
						cityWard,
						coord: st.coord ? { lat: st.coord.lat, lon: st.coord.lon } : undefined,
					});
				}
			}

			console.log(`[OK] ${target.name} ${timeBand(range)} rows+=${flat.filter(r => r.targetNode === target.node && r.timeBand === timeBand(range)).length}`);

			// サーバー負荷とBANリスクを下げるため軽く間隔
			await sleep(250);
		}
	}

	// --- Structured build ---
	const structured: StructuredOutput = {
		generatedAt: new Date().toISOString(),
		source: {
			transitLimit: TRANSIT_LIMIT,
			firstTrain: FIRST_TRAIN,
			expressTrain: EXPRESS_TRAIN,
			targets: TARGETS,
			ranges: RANGES,
		},
		stationsById: {},
		targetsIndex: {},
	};

	// targetsIndex 初期化
	for (const t of TARGETS) {
		structured.targetsIndex[t.node] = {
			target: t.name,
			targetNode: t.node,
			timeBands: {},
		};
		for (const r of RANGES) structured.targetsIndex[t.node].timeBands[timeBand(r)] = [];
	}

	// stationsById を作りつつ reachable を積む（同じ target に対しては最短を残す）
	for (const row of flat) {
		const sid = row.stationId;

		if (!structured.stationsById[sid]) {
			structured.stationsById[sid] = {
				stationId: sid,
				stationName: row.stationName,
				roughAddress: row.roughAddress,
				pref: row.pref,
				cityWard: row.cityWard,
				coord: row.coord,
				lines: [],
				lineMeta: {},
				reachable: [],
			};
		}

		const station = structured.stationsById[sid];

		// coord/address は空を埋める
		if (!station.coord && row.coord) station.coord = row.coord;
		if (!station.roughAddress && row.roughAddress) station.roughAddress = row.roughAddress;

		// lines 集約
		if (!station.lines.includes(row.line)) station.lines.push(row.line);
		station.lineMeta![row.line] = { id: row.lineId, color: row.lineColor };

		// reachable: 「同じ駅→同じtarget」は最短だけ残す
		const existingIdx = station.reachable.findIndex(
			(x) => x.targetNode === row.targetNode
		);
		if (existingIdx === -1) {
			station.reachable.push({
				target: row.target,
				targetNode: row.targetNode,
				timeBand: row.timeBand,
				timeMinutes: row.timeMinutes,
				transitCount: row.transitCount,
				line: row.line,
			});
		} else {
			const ex = station.reachable[existingIdx];
			const better = pickBetterReachable(
				{ timeMinutes: ex.timeMinutes, timeBand: ex.timeBand },
				{ timeMinutes: row.timeMinutes, timeBand: row.timeBand }
			);
			if (better.timeMinutes === row.timeMinutes && better.timeBand === row.timeBand) {
				station.reachable[existingIdx] = {
					target: row.target,
					targetNode: row.targetNode,
					timeBand: row.timeBand,
					timeMinutes: row.timeMinutes,
					transitCount: row.transitCount,
					line: row.line,
				};
			}
		}

		// targetsIndex に stationId を入れる（timeBandごとにユニーク）
		const tb = row.timeBand;
		const arr = structured.targetsIndex[row.targetNode]?.timeBands?.[tb];
		if (arr && !arr.includes(sid)) arr.push(sid);
	}

	// --- Write files ---
	const outDir = path.join(process.cwd(), "output");
	fs.mkdirSync(outDir, { recursive: true });

	const flatPath = path.join(outDir, "reachable_flat.json");
	fs.writeFileSync(flatPath, JSON.stringify(flat, null, 2), "utf-8");

	const structuredPath = path.join(outDir, "reachable_structured.json");
	fs.writeFileSync(structuredPath, JSON.stringify(structured, null, 2), "utf-8");

	console.log(`[WRITE] ${flatPath} (${flat.length} rows)`);
	console.log(
		`[WRITE] ${structuredPath} (stations=${Object.keys(structured.stationsById).length})`
	);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
