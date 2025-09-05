export type MetadataTags = {
	title?: string;
	description?: string;
	artist?: string;
	album?: string;
	albumArtist?: string;
	trackNumber?: number;
	tracksTotal?: number;
	discNumber?: number;
	discsTotal?: number;
	genre?: string;
	date?: Date;
	lyrics?: string;
	comment?: string;
	images?: {
		data: Uint8Array;
		mimeType: string;
		kind: 'coverFront' | 'coverBack' | 'unknown';
		name?: string;
		description?: string;
	}[];
	raw?: Record<string, string | Uint8Array | RichImageData | null>;
};

export class RichImageData {
	constructor(public data: Uint8Array, public mimeType: string) {}
}

export const validateMetadataTags = (tags: MetadataTags) => {
	if (!tags || typeof tags !== 'object') {
		throw new TypeError('tags must be an object.');
	}
	if (tags.title !== undefined && typeof tags.title !== 'string') {
		throw new TypeError('tags.title, when provided, must be a string.');
	}
	if (tags.description !== undefined && typeof tags.description !== 'string') {
		throw new TypeError('tags.description, when provided, must be a string.');
	}
	if (tags.artist !== undefined && typeof tags.artist !== 'string') {
		throw new TypeError('tags.artist, when provided, must be a string.');
	}
	if (tags.album !== undefined && typeof tags.album !== 'string') {
		throw new TypeError('tags.album, when provided, must be a string.');
	}
	if (tags.albumArtist !== undefined && typeof tags.albumArtist !== 'string') {
		throw new TypeError('tags.albumArtist, when provided, must be a string.');
	}
	if (tags.trackNumber !== undefined && (!Number.isInteger(tags.trackNumber) || tags.trackNumber <= 0)) {
		throw new TypeError('tags.trackNumber, when provided, must be a positive integer.');
	}
	if (
		tags.tracksTotal !== undefined
		&& (!Number.isInteger(tags.tracksTotal) || tags.tracksTotal <= 0)
	) {
		throw new TypeError('tags.tracksTotal, when provided, must be a positive integer.');
	}
	if (tags.discNumber !== undefined && (!Number.isInteger(tags.discNumber) || tags.discNumber <= 0)) {
		throw new TypeError('tags.discNumber, when provided, must be a positive integer.');
	}
	if (
		tags.discsTotal !== undefined
		&& (!Number.isInteger(tags.discsTotal) || tags.discsTotal <= 0)
	) {
		throw new TypeError('tags.discsTotal, when provided, must be a positive integer.');
	}
	if (tags.genre !== undefined && typeof tags.genre !== 'string') {
		throw new TypeError('tags.genre, when provided, must be a string.');
	}
	if (tags.date !== undefined && (!(tags.date instanceof Date) || Number.isNaN(tags.date.getTime()))) {
		throw new TypeError('tags.date, when provided, must be a valid Date.');
	}
	if (tags.lyrics !== undefined && typeof tags.lyrics !== 'string') {
		throw new TypeError('tags.lyrics, when provided, must be a string.');
	}
	if (tags.images !== undefined) {
		if (!Array.isArray(tags.images)) {
			throw new TypeError('tags.images, when provided, must be an array.');
		}
		for (const image of tags.images) {
			if (!image || typeof image !== 'object') {
				throw new TypeError('Each image in tags.images must be an object.');
			}
			if (!(image.data instanceof Uint8Array)) {
				throw new TypeError('Each image.data must be a Uint8Array.');
			}
			if (typeof image.mimeType !== 'string') {
				throw new TypeError('Each image.mimeType must be a string.');
			}
			if (!['coverFront', 'coverBack', 'other'].includes(image.kind)) {
				throw new TypeError('Each image.kind must be \'coverFront\', \'coverBack\', or \'other\'.');
			}
		}
	}
	if (tags.comment !== undefined && typeof tags.comment !== 'string') {
		throw new TypeError('tags.comment, when provided, must be a string.');
	}
	if (tags.raw !== undefined) {
		if (!tags.raw || typeof tags.raw !== 'object') {
			throw new TypeError('tags.raw, when provided, must be an object.');
		}

		for (const value of Object.values(tags.raw)) {
			if (
				value !== null
				&& typeof value !== 'string'
				&& !(value instanceof Uint8Array)
				&& !(value instanceof RichImageData)
			) {
				throw new TypeError(
					'Each value in tags.raw must be a string, Uint8Array, RichImageData, or null.',
				);
			}
		}
	}
};

export const metadataTagsAreEmpty = (tags: MetadataTags) => {
	return tags.title === undefined
		&& tags.description === undefined
		&& tags.artist === undefined
		&& tags.album === undefined
		&& tags.albumArtist === undefined
		&& tags.trackNumber === undefined
		&& tags.tracksTotal === undefined
		&& tags.discNumber === undefined
		&& tags.discsTotal === undefined
		&& tags.genre === undefined
		&& tags.date === undefined
		&& tags.lyrics === undefined
		&& (!tags.images || tags.images.length === 0)
		&& tags.comment === undefined
		&& (tags.raw === undefined || Object.keys(tags.raw).length === 0);
};
