use wasm_bindgen::prelude::*;
use symphonia::default::{get_codecs, get_probe};
use symphonia::core::audio::SampleBuffer;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::probe::Hint;
use hound::{WavSpec, WavWriter, SampleFormat};
use std::io::Cursor;

#[wasm_bindgen]
pub fn opus_to_wav(opus_data: &[u8]) -> Vec<u8> {
    // Clone input data to satisfy 'static lifetime
    let owned_data = opus_data.to_vec();
    let cursor = Cursor::new(owned_data);
    let mss = MediaSourceStream::new(Box::new(cursor), Default::default());

    let hint = Hint::new();
    let probed = get_probe()
        .format(&hint, mss, &Default::default(), &Default::default())
        .unwrap();
    let mut format = probed.format;

    let track = format.default_track().unwrap();
    let decoder_opts = Default::default();
    let mut decoder = get_codecs().make(&track.codec_params, &decoder_opts).unwrap();

    let track_spec = decoder.codec_params().sample_rate.unwrap_or(48000);
    let channels = decoder.codec_params().channels.unwrap().count() as u16;

    let mut wav_cursor = Cursor::new(Vec::new());
    let spec = WavSpec {
        channels,
        sample_rate: track_spec,
        bits_per_sample: 16,
        sample_format: SampleFormat::Int,
    };
    let mut writer = WavWriter::new(&mut wav_cursor, spec).unwrap();

    loop {
        match format.next_packet() {
            Ok(packet) => {
                let decoded = decoder.decode(&packet).unwrap();
                let mut sample_buf = SampleBuffer::<i16>::new(decoded.capacity() as u64, *decoded.spec());
                sample_buf.copy_interleaved_ref(decoded);

                for sample in sample_buf.samples() {
                    writer.write_sample(*sample).unwrap();
                }
            }
            Err(symphonia::core::errors::Error::ResetRequired) => continue,
            Err(_) => break,
        }
    }

    writer.finalize().unwrap();
    wav_cursor.into_inner()
}
