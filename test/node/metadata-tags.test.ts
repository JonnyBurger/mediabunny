import { expect, test } from 'vitest';
import { Output } from '../../src/output.js';
import {
	MkvOutputFormat,
	MovOutputFormat,
	Mp3OutputFormat,
	Mp4OutputFormat,
	OggOutputFormat,
	WavOutputFormat,
} from '../../src/output-format.js';
import { BufferTarget } from '../../src/target.js';
import { EncodedAudioPacketSource } from '../../src/media-source.js';
import { EncodedPacket } from '../../src/packet.js';
import { Input } from '../../src/input.js';
import { BufferSource, FilePathSource } from '../../src/source.js';
import { ALL_FORMATS } from '../../src/input-format.js';
import { MetadataTags } from '../../src/tags.js';
import path from 'node:path';
import { AudioCodec, buildAudioCodecString } from '../../src/codec.js';

const __dirname = new URL('.', import.meta.url).pathname;

const createDummyAudioTrack = (codec: AudioCodec, output: Output) => {
	const source = new EncodedAudioPacketSource(codec);
	output.addAudioTrack(source);

	return {
		async addPacket() {
			// Data to make it behave like an MP3 frame
			const data = new Uint8Array(2000);
			data[0] = 255;
			data[1] = 251;
			data[2] = 224;
			data[3] = 100;

			// OpusHead description
			const description = new Uint8Array(64);
			description[0] = 0x4f;
			description[1] = 0x70;
			description[2] = 0x75;
			description[3] = 0x73;
			description[4] = 0x48;
			description[5] = 0x65;
			description[6] = 0x61;
			description[7] = 0x64;

			await source.add(
				new EncodedPacket(data, 'key', 0, 1),
				{
					decoderConfig: {
						codec: buildAudioCodecString(codec, 2, 48000),
						numberOfChannels: 2,
						sampleRate: 48000,
						description,
					},
				},
			);
		},
	};
};

const coverArt = new Uint8Array(1024);
coverArt[0] = 69;
const songMetadata: MetadataTags = {
	title: 'Trying to Feel Alive',
	description: 'A song',
	artist: 'Porter Robinson & others',
	album: 'Nurture',
	albumArtist: 'Porter Robinson',
	genre: 'Electronic',
	comment: 'Some of this info is intentionally incorrect',
	lyrics: 'Well, do you feel better now?\nI thought I\'d run until the sky came out',
	trackNumber: 13,
	tracksTotal: 14,
	discNumber: 1,
	discsTotal: 1,
	date: new Date(2021, 3, 23),
	images: [{
		data: coverArt,
		kind: 'coverFront',
		mimeType: 'image/jpeg',
		description: 'This image shows a person laying in a field of grass',
	}],
};

test('Read and write metadata, MP4', async () => {
	const output = new Output({
		format: new Mp4OutputFormat(),
		target: new BufferTarget(),
	});

	output.setMetadataTags({
		...songMetadata,
		raw: {
			'©hog': 'pish',
			'©nam': 'Cheerleader', // Test that it doesn't override the main title
		},
	});

	const dummyTrack = createDummyAudioTrack('aac', output);

	await output.start();
	await dummyTrack.addPacket();
	await output.finalize();

	const input = new Input({
		source: new BufferSource(output.target.buffer!),
		formats: ALL_FORMATS,
	});

	const readTags = await input.getMetadataTags();

	expect(readTags.title).toBe(songMetadata.title);
	expect(readTags.description).toBe(songMetadata.description);
	expect(readTags.artist).toBe(songMetadata.artist);
	expect(readTags.album).toBe(songMetadata.album);
	expect(readTags.albumArtist).toBe(songMetadata.albumArtist);
	expect(readTags.comment).toBe(songMetadata.comment);
	expect(readTags.lyrics).toBe(songMetadata.lyrics);
	expect(readTags.trackNumber).toBe(songMetadata.trackNumber);
	expect(readTags.tracksTotal).toBe(songMetadata.tracksTotal);
	expect(readTags.discNumber).toBe(songMetadata.discNumber);
	expect(readTags.discsTotal).toBe(songMetadata.discsTotal);
	expect(readTags.date).toEqual(readTags.date);
	expect(readTags.images).toHaveLength(1);
	expect(readTags.images![0]!.data).toEqual(coverArt);
	expect(readTags.images![0]!.mimeType).toEqual('image/jpeg');
	expect(readTags.images![0]!.kind).toEqual('coverFront');
	expect(readTags.images![0]!.description).toBeUndefined(); // Lost in MP4

	expect(readTags.raw!['©nam']).toBe(songMetadata.title);
	expect(readTags.raw!['trkn']).instanceOf(Uint8Array);
	expect(readTags.raw!['©hog']).toBe('pish');
});

test('Read and write metadata, QuickTime', async () => {
	const output = new Output({
		format: new MovOutputFormat(),
		target: new BufferTarget(),
	});

	output.setMetadataTags({
		...songMetadata,
		raw: {
			'©sic': 'ko mode',
		},
	});

	const dummyTrack = createDummyAudioTrack('aac', output);

	await output.start();
	await dummyTrack.addPacket();
	await output.finalize();

	const input = new Input({
		source: new BufferSource(output.target.buffer!),
		formats: ALL_FORMATS,
	});

	const readTags = await input.getMetadataTags();

	expect(readTags.title).toBe(songMetadata.title);
	expect(readTags.description).toBe(songMetadata.description);
	expect(readTags.artist).toBe(songMetadata.artist);
	expect(readTags.album).toBe(songMetadata.album);
	expect(readTags.albumArtist).toBe(songMetadata.albumArtist);
	expect(readTags.comment).toBe(songMetadata.comment);
	expect(readTags.lyrics).toBe(songMetadata.lyrics);
	expect(readTags.trackNumber).toBeUndefined(); // All of these don't work in MOV
	expect(readTags.tracksTotal).toBeUndefined();
	expect(readTags.discNumber).toBeUndefined();
	expect(readTags.discsTotal).toBeUndefined();
	expect(readTags.date).toEqual(readTags.date);
	expect(readTags.images).toBeUndefined();

	expect(readTags.raw!['©nam']).toBe(songMetadata.title);
	// We don't know what the data type is, so the demuxer just returns Uint8Array
	expect(readTags.raw!['©sic']).toEqual(new Uint8Array([
		0, 7, // String length 7
		85, 196, // Language code for 'und'
		107, 111, 32, 109, 111, 100, 101, // 'ko mode'
	]));
});

test('Read MOV metadata tags, ilst with keys', async () => {
	const input = new Input({
		source: new FilePathSource(path.join(__dirname, '../public/trunc-buck-bunny.mov')),
		formats: ALL_FORMATS,
	});

	const tags = await input.getMetadataTags();
	expect(tags.raw).not.toBeUndefined();
	expect(tags.raw!['com.apple.quicktime.version']).toBe('7.4.1 (14) 0x7418000 (Mac OS X, 10.5.2, 9C31)');
	expect(tags.raw!['com.apple.quicktime.player.movie.audio.gain']).toEqual(new Uint8Array([63, 128, 0, 0]));
});

test('Read and write metadata, Matroska', async () => {
	const output = new Output({
		format: new MkvOutputFormat(),
		target: new BufferTarget(),
	});

	output.setMetadataTags({
		...songMetadata,
		raw: {
			CUSTOM: 'Levels',
		},
	});

	const dummyTrack = createDummyAudioTrack('opus', output);

	await output.start();
	await dummyTrack.addPacket();
	await output.finalize();

	const input = new Input({
		source: new BufferSource(output.target.buffer!),
		formats: ALL_FORMATS,
	});

	const readTags = await input.getMetadataTags();

	expect(readTags.title).toBe(songMetadata.title);
	expect(readTags.description).toBe(songMetadata.description);
	expect(readTags.artist).toBe(songMetadata.artist);
	expect(readTags.album).toBe(songMetadata.album);
	expect(readTags.albumArtist).toBe(songMetadata.albumArtist);
	expect(readTags.comment).toBe(songMetadata.comment);
	expect(readTags.lyrics).toBe(songMetadata.lyrics);
	expect(readTags.trackNumber).toBe(songMetadata.trackNumber);
	expect(readTags.tracksTotal).toBe(songMetadata.tracksTotal);
	expect(readTags.discNumber).toBe(songMetadata.discNumber);
	expect(readTags.discsTotal).toBe(songMetadata.discsTotal);
	expect(readTags.date).toEqual(readTags.date);
	expect(readTags.images).toHaveLength(1);
	expect(readTags.images![0]!.data).toEqual(coverArt);
	expect(readTags.images![0]!.mimeType).toEqual('image/jpeg');
	expect(readTags.images![0]!.kind).toEqual('coverFront');
	expect(readTags.images![0]!.description).toEqual(songMetadata.images![0]!.description);
	expect(readTags.images![0]!.name).toEqual('cover.jpg'); // It constructed this name

	expect(readTags.raw!['TITLE']).toBe(songMetadata.title);
	expect(readTags.raw!['PART_NUMBER']).toBe('13/14');
	expect(readTags.raw!['CUSTOM']).toBe('Levels');
});

test('Read and write metadata, MP3', async () => {
	const output = new Output({
		format: new Mp3OutputFormat(),
		target: new BufferTarget(),
	});

	output.setMetadataTags({
		...songMetadata,
		raw: {
			TXXY: 'ID3v2 goated',
		},
	});

	const dummyTrack = createDummyAudioTrack('mp3', output);

	await output.start();
	await dummyTrack.addPacket();
	await output.finalize();

	const input = new Input({
		source: new BufferSource(output.target.buffer!),
		formats: ALL_FORMATS,
	});

	const readTags = await input.getMetadataTags();

	// ID3v2 is goated, so pretty much everything was copied:
	expect(readTags.title).toBe(songMetadata.title);
	expect(readTags.description).toBe(songMetadata.description);
	expect(readTags.artist).toBe(songMetadata.artist);
	expect(readTags.album).toBe(songMetadata.album);
	expect(readTags.albumArtist).toBe(songMetadata.albumArtist);
	expect(readTags.comment).toBe(songMetadata.comment);
	expect(readTags.lyrics).toBe(songMetadata.lyrics);
	expect(readTags.trackNumber).toBe(songMetadata.trackNumber);
	expect(readTags.tracksTotal).toBe(songMetadata.tracksTotal);
	expect(readTags.discNumber).toBe(songMetadata.discNumber);
	expect(readTags.discsTotal).toBe(songMetadata.discsTotal);
	expect(readTags.date).toEqual(readTags.date);
	expect(readTags.images).toHaveLength(1);
	expect(readTags.images![0]!.data).toEqual(coverArt);
	expect(readTags.images![0]!.mimeType).toEqual('image/jpeg');
	expect(readTags.images![0]!.kind).toEqual('coverFront');
	expect(readTags.images![0]!.description).toEqual(songMetadata.images![0]!.description);
	expect(readTags.images![0]!.name).toBeUndefined(); // Can't be contained in ID3v2

	expect(readTags.raw!['TIT2']).toBe(songMetadata.title);
	expect(readTags.raw!['APIC']).instanceOf(Uint8Array);
	expect(readTags.raw!['TXXY']).toBe('ID3v2 goated');
});

test('Read and write metadata, Ogg', async () => {
	const output = new Output({
		format: new OggOutputFormat(),
		target: new BufferTarget(),
	});

	output.setMetadataTags({
		...songMetadata,
		raw: {
			vendor: 'mediabunny corp',
			COMPOSER: 'Hans Zimmer',
		},
	});

	const dummyTrack = createDummyAudioTrack('opus', output);

	await output.start();
	await dummyTrack.addPacket();
	await output.finalize();

	const input = new Input({
		source: new BufferSource(output.target.buffer!),
		formats: ALL_FORMATS,
	});

	const readTags = await input.getMetadataTags();

	expect(readTags.title).toBe(songMetadata.title);
	expect(readTags.description).toBe(songMetadata.description);
	expect(readTags.artist).toBe(songMetadata.artist);
	expect(readTags.album).toBe(songMetadata.album);
	expect(readTags.albumArtist).toBe(songMetadata.albumArtist);
	expect(readTags.comment).toBe(songMetadata.comment);
	expect(readTags.lyrics).toBe(songMetadata.lyrics);
	expect(readTags.trackNumber).toBe(songMetadata.trackNumber);
	expect(readTags.tracksTotal).toBe(songMetadata.tracksTotal);
	expect(readTags.discNumber).toBe(songMetadata.discNumber);
	expect(readTags.discsTotal).toBe(songMetadata.discsTotal);
	expect(readTags.date).toEqual(readTags.date);
	expect(readTags.images).toHaveLength(1);
	expect(readTags.images![0]!.data).toEqual(coverArt);
	expect(readTags.images![0]!.mimeType).toEqual('image/jpeg');
	expect(readTags.images![0]!.kind).toEqual('coverFront');
	expect(readTags.images![0]!.description).toEqual(songMetadata.images![0]!.description);
	expect(readTags.images![0]!.name).toBeUndefined(); // Can't be contained in Vorbis-style metadata

	expect(readTags.raw!['vendor']).toBe('mediabunny corp');
	expect(readTags.raw!['COMPOSER']).toBe('Hans Zimmer');
});

test('Read and write metadata, WAVE', async () => {
	const output = new Output({
		format: new WavOutputFormat(),
		target: new BufferTarget(),
	});

	output.setMetadataTags({
		...songMetadata,
		raw: {
			IKEK: 'RIFF INFO lowkey mid',
		},
	});

	const dummyTrack = createDummyAudioTrack('pcm-s16', output);

	await output.start();
	await dummyTrack.addPacket();
	await output.finalize();

	const input = new Input({
		source: new BufferSource(output.target.buffer!),
		formats: ALL_FORMATS,
	});

	const readTags = await input.getMetadataTags();

	expect(readTags.title).toBe(songMetadata.title);
	expect(readTags.description).toBeUndefined();
	expect(readTags.artist).toBe(songMetadata.artist);
	expect(readTags.album).toBe(songMetadata.album);
	expect(readTags.albumArtist).toBeUndefined();
	expect(readTags.comment).toBe(songMetadata.comment);
	expect(readTags.lyrics).toBeUndefined();
	expect(readTags.trackNumber).toBe(songMetadata.trackNumber);
	expect(readTags.tracksTotal).toBe(songMetadata.tracksTotal);
	expect(readTags.discNumber).toBeUndefined();
	expect(readTags.discsTotal).toBeUndefined();
	expect(readTags.date).toEqual(readTags.date);
	expect(readTags.images).toBeUndefined();

	expect(readTags.raw!['INAM']).toBe(songMetadata.title);
	expect(readTags.raw!['IKEK']).toBe('RIFF INFO lowkey mid');
});
