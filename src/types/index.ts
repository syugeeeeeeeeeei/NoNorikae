export type TimeRange = { lower: number; higher: number };
export type Target = { name: string; node: string; color?: string };

export type Station = {
	stationId: string;
	stationName: string;
	roughAddress: string;
	pref?: string;
	cityWard?: string;
	coord: { lat: number; lon: number };
	lines: string[];
	lineMeta: Record<string, { id?: string; color?: string }>;
	reachable: ReachableInfo[];
};

export type ReachableInfo = {
	target: string;
	targetNode: string;
	timeBand: string;
	timeMinutes: number;
	transitCount: number;
	line: string;
};

// NAVITIME API Response
export type ApiStation = {
	time: number;
	coord?: { lat: number; lon: number };
	name: string;
	node_id: string;
	transit_count: number;
	node_detail?: { address_name?: string };
};

export type ApiLink = {
	link_id: string;
	link_name: string;
	link_color?: string;
	stations: ApiStation[];
};

export type ApiResponse = {
	links: ApiLink[];
};