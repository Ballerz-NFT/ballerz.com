import type { Ratings } from "./Ratings";

export enum PositionEnum {
	POINT_GUARD = "PG",
	SHOOTING_GUARD = "SG",
	GENERAL_GUARD = "G",
	GUARD_FORWARD = "GF",
	SMALL_FORWARD = "SF",
	FORWARD = "F",
	POWER_FORWARD = "PF",
	FORWARD_CENTER = "FC",
	CENTER = "C",
}

export function calculatePosition(ratings: Ratings): PositionEnum {
	// Find the closest position that this player will fit in.
	const POS_VALUES: { [key in PositionEnum]: number } = {
		PG: 0,
		SG: 1,
		SF: 2,
		PF: 3,
		C: 4,
		G: 0.5,
		F: 2.5,
		FC: 3.5,
		GF: 1.5,
	};
	const value =
		-0.922949 +
		0.073339 * ratings.hgt +
		0.009744 * ratings.stre +
		-0.002215 * ratings.spd +
		-0.005438 * ratings.jmp +
		0.003006 * ratings.endu +
		-0.003516 * ratings.ins +
		-0.008239 * ratings.dnk +
		0.001647 * ratings.ft +
		-0.001404 * ratings.fg +
		-0.004599 * ratings.tp +
		0.001407 * ratings.diq +
		0.002433 * ratings.oiq +
		-0.000753 * ratings.drb +
		-0.021888 * ratings.pss +
		0.016867 * ratings.reb;

	let minDiff = Infinity;
	let minDiffPos: PositionEnum = PositionEnum.FORWARD;
	for (const [pos, posValue] of Object.entries(POS_VALUES)) {
		const diff = Math.abs(value - posValue);
		if (diff < minDiff) {
			minDiff = diff;
			minDiffPos = pos as PositionEnum;
		}
	}

	return minDiffPos;
}
