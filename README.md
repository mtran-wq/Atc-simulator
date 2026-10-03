# Meridian Approach

An air traffic control simulation that runs in a single web page, playable on a phone or a desktop. No build tooling, no dependencies at run time.

You work one of two positions at a fictional three-runway airport:

- **Approach radar** — a 30 nm terminal sector. Vector arrivals onto the ILS, climb departures out to their exit fixes, and keep everything 3 nm or 1,000 ft apart.
- **Ground** — the airport surface. Approve pushbacks, assign taxi routes and stands, and own every movement onto the two parallel runways.

Each position has its own guided tutorial, scoring and debrief. The radio is spoken aloud using the browser's speech synthesis, in radio phraseology, with static and squelch.

## Play

Play online at https://mtran-wq.github.io/Atc-simulator/, or open `index.html` in a browser. That is the whole game.

## What is simulated

**Approach**

- 13 aircraft types with their own speeds, climb and descent rates and wake class; wind drift that strengthens with altitude
- ILS approaches: localizer capture at 50° or less, glidepath from at or below, go-arounds for too high, too fast, tailwind, crosswind or an occupied runway
- Departures: line up, takeoff, exit fix and altitude restrictions
- Separation: 3 nm / 1,000 ft with a predictive conflict alert, wake spacing on final, mid-air collisions end the shift
- Terrain with minimum vectoring altitudes, moving storm cells, wind shifts that force a runway change
- Fuel states down to mayday, medical and engine-failure emergencies

**Ground**

- Pushback with a facing direction, engine start, taxi routing with alternatives
- Two-way main taxiways and single-file apron lanes with look-ahead, tug turn-rounds for nose-to-nose standoffs
- Runway holding points, intersection departures by aircraft class, line up, takeoff and runway crossings
- Landings that go around if the runway is occupied, runway incursions, runway collisions
- Stand allocation (heavy stands, cargo apron), turnarounds, wake gaps between departures, runway direction changes

## Controls

- Tap a target or flight strip to select it
- Approach: drag from a target to turn it, or drop on a fix to send it direct; set heading, altitude and speed with the steppers, then SEND
- Ground: drag from an aircraft to a holding point or stand to taxi it there
- Pinch or scroll to zoom, drag to pan; time compression 1x to 8x
- Approach also takes typed commands on a keyboard, for example `MRX482 H 270 A 40 S 210`, `D EKKON`, `I 27R`, `TO`
- Voice commands (approach): hold **MIC**, or hold `T` on a keyboard, and speak the clearance, for example "Meridian 482, turn left heading 270, descend and maintain 4,000" or "Nova 1203, direct EKKON". A quick tap on MIC listens until you stop talking. The page shows what it heard and the command it sent. Needs Chrome, Edge or Safari; in Chrome the audio is transcribed by Google's servers
- SND opens the sound and speech settings

## Layout

```
src/page.html     markup and styles for both positions
src/approach.js   approach radar simulation, its tutorial, and the shared briefing
src/voice.js      spoken radio: phraseology conversion, speech queue, radio effects, settings
src/listen.js     voice commands: push to talk and spoken phraseology to typed commands
src/ground.js     ground simulation and its tutorial
build.sh          concatenates src/ into dist/meridian-approach.html and index.html
tests/            headless browser checks
```

`dist/meridian-approach.html` is a page fragment without a doctype, head or body; `index.html` is the same content wrapped as a standalone document. Both are generated, so edit `src/` and run `./build.sh`.

## Tests

The tests drive the built page in headless Chromium with Playwright:

```
npm install
npx playwright install chromium
npm test
```

They cover a scripted landing and departure, both tutorials clicked through end to end, an automated ground controller run for 45 simulated minutes, the audio settings, and the voice command parser with push to talk. They check logic and that nothing throws; they cannot hear the audio.

## Known limits

- Speech depends on the voices the device provides. Some in-app web views provide none.
- Voice commands use the browser's speech recognition, which Firefox does not have. Fix names are matched by sound, so an unusual pronunciation can miss; spelling the fix in the phonetic alphabet always works.
- The two positions run as separate shifts with independent traffic.
