const GD_API = "https://www.boomlings.com/database";
const SECRET = "Wmfd2893gb7"; // guy on reddit says this is right secret
const SONG_WORKER = "https://fetchsongid.lasokar.workers.dev?id=";
const SFX_CDN = 'https://geometrydashfiles.b-cdn.net/sfx/s';

function toBool(v) { return v === "1"; }
function toList(v){
	if (!v) return [];
	return v.split(",");
}

// gd level response key, thx to the api wiki thingy i found
const LEVEL_FIELDS = {
	1: "levelID",
	2: "levelName",
	3: ["description", v => atob(v || "")],
	4: "levelString",
	5: "version",
	6: "playerID",
	8: "difficultyDenominator",
	9: "difficultyNumerator",
	10: "downloads",
	11: "setCompletes",
	12: "officialSong",
	13: "gameVersion",
	14: "likes",
	15: "levelLength",
	16: "dislikes",
	17: ["demon", toBool],
	18: "stars",
	19: "featureScore",
	25: ["auto", toBool],
	26: "recordString",
	27: "password",
	28: "uploadDate",
	29: "updateDate",
	30: "copiedID",
	31: ["twoPlayer", toBool],
	35: "customSongID",
	36: "extraString",
	37: "coins",
	38: ["verifiedCoins", toBool],
	39: "starsRequested",
	40: ["lowDetailMode", toBool],
	41: "dailyNumber",
	42: "epic",
	43: "demonDifficulty",
	44: ["isGauntlet", toBool],
	45: "objects",
	46: "editorTime",
	47: "editorTimeCopies",
	48: "settingsString",
	52: ["songIDs", toList],
	53: ["sfxIDs", toList],
	54: "songSize",
	57: "verificationTime"
};

class LevelObject {
	constructor(parsed) {
		for (const key in LEVEL_FIELDS) {
			const field = LEVEL_FIELDS[key];
			let prop, fn;
			if (Array.isArray(field)) {
				prop = field[0];
				fn = field[1];
			} else {
				prop = field;
				fn = x => x;
			}
			this[prop] = fn(parsed[key]);
		}
	}
}

async function blobUrl(res) {
	const b = await res.blob();
	return URL.createObjectURL(b);
}

async function gdPost(endpoint, body) {
	await window._libcurlReady;
	return libcurl.fetch(GD_API + "/" + endpoint, {
		method: "POST",
		headers: {"Content-Type": "application/x-www-form-urlencoded"},
		body: body,
	});
}

window.ApiWrapper = class ApiWrapper {
	static async downloadSong(id) {
		await window._libcurlReady;
		const res = await libcurl.fetch(SONG_WORKER + id);
		const buf = await res.arrayBuffer();

		const peekLen = Math.min(256, buf.byteLength);
		const peek = new Uint8Array(buf, 0, peekLen);
		const head = new TextDecoder("utf-8", {fatal:false}).decode(peek);

		if (head.toLowerCase().indexOf("fail") !== -1) {
			return this._downloadSongViaGD(id);
		}

		return URL.createObjectURL(new Blob([buf]));
	}

	static async _downloadSongViaGD(id) {
		const r = await gdPost("getGJSongInfo.php", "songID=" + id + "&secret=" + SECRET);
		const text = await r.text();

		let url = "";
		if (text) {
			const a = text.split("~|~10~|~")[1];
			if (a) {
				url = decodeURIComponent(a.split("~|~")[0] || "");
			}
		}

		const songRes = await libcurl.fetch(url);
		return blobUrl(songRes);
	}

	static async downloadSfx(id) {
		await window._libcurlReady;
		const res = await libcurl.fetch(SFX_CDN + id + ".ogg");
		return blobUrl(res);
	}

	static async downloadLevel(id) {
		const r = await gdPost("downloadGJLevel22.php", "levelID=" + id + "&secret=" + SECRET);
		const text = await r.text();

		const parts = text.split(":");
		const parsed = {};
		for (let i = 0; i < parts.length; i += 2) {
			parsed[parts[i]] = parts[i + 1];
		}

		return new LevelObject(parsed);
	}
};
