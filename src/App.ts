import { html } from 'htm/preact';
import { Fragment } from 'preact';
import { useState } from 'preact/hooks';
import styles from './app.module.css';

const HEIGHT = 1 / 2;
const HAIRLINE = 0.005;
const MIN_LINES = 8;

function getLocalStorageJson<T>(key: string) {
	const storedValueJson = localStorage.getItem(key);
	return storedValueJson === null ? undefined : JSON.parse(storedValueJson) as T;
}

function useLocalStorage<T>(key: string, defaultValue: T) {
	const storedValue = getLocalStorageJson<T>(key);
	const [value, setValue] = useState<T>(storedValue !== undefined ? storedValue : defaultValue);

	function setWithStorage(value: T) {
		localStorage.setItem(key, JSON.stringify(value));
		const storedValue = getLocalStorageJson<T>(key);
		setValue(storedValue ?? defaultValue);
	}

	return [value, setWithStorage] as const;
}

export default function App() {
	const [widthValue, setWidth] = useLocalStorage('width-value', (1+5/8).toString());
	const [sideGapValue, setSideGap] = useLocalStorage('side-gap-values', ['150', '150'] as [string, string]);
	const [sideGapsEqual, setSideGapsEqual] = useLocalStorage('side-gaps-equal', true);
	const [inCourseGapValue, setInCourseGap] = useLocalStorage('in-course-gap-value', '70');
	const [configValue, setConfig] = useLocalStorage('config-value', '49\n62\n84\n108');

	function handleSideGapInput(event: InputEvent, index: number) {
		if (!(event.target instanceof HTMLInputElement)) return;
		const newSideGaps = structuredClone(sideGapValue);
		if (sideGapsEqual) {
			newSideGaps.fill(event.target.value);
		} else {
			newSideGaps[index] = event.target.value;
		}
		setSideGap(newSideGaps);
	}

	function handlePreset(event: InputEvent) {
		event.target instanceof HTMLSelectElement &&
			setConfig(event.target.value.split(';').join('\n'));
	}

	const width = parseFloat(widthValue);
	const [startGap = 0, endGap = 0] = sideGapValue.map(n => parseFloat(n) * 0.001);
	const inCourseGap = parseFloat(inCourseGapValue) * 0.001;

	const config = configValue
		.split('\n')
		.map(line => line.trim())
		.reverse()
		.filter(Boolean)
		.map(course => course
			.split(',')
			.map(parseFloat)
			.filter(n => !isNaN(n))
			.map(n => n * 0.001)
		);

	// For each course...
	const courses = config.map(course => course
		.reduce((previous: number[], current) => [
			...previous,
			// ...insert the in-course gap between the strings.
			inCourseGap,
			current,
		], []).slice(1));

	const coursesSpace = courses.flat().map(Math.abs).reduce((a, b) => a + b);
	const remainingSpace = width - (startGap + endGap + coursesSpace);
	const spaceBetweenEachCourse = remainingSpace / (courses.length - 1);

	const lengths = [
		startGap,
		courses[0],
		...courses.slice(1).flatMap(course => [spaceBetweenEachCourse, course]),
		endGap,
	].flat();

	const chunkedLengths = lengths
	.map((length, i) => i % 2 === 0 ? [length, lengths[i + 1]] : null)
	.filter(Boolean) as [number, number][];

	let accumulatedGaps = 0;

	return html`<${Fragment}>
		<h1>String spacing calculator</h1>

		<section>
			<label>
				Nut or saddle width<br />
				<input
					type="number"
					class="${styles['number-field']}"
					step="${1/16}"
					value="${widthValue}"
					onInput="${(event: InputEvent) => event.target instanceof HTMLInputElement && setWidth(event.target.value)}"
				/> inches
			</label>
		</section>

		<section class="${styles['row']}">
			<label>
				Start gap<br />
				<input
					type="number"
					class="${styles['number-field']}"
					step="${10}"
					value="${sideGapValue[0]}"
					onInput="${(event: InputEvent) => handleSideGapInput(event, 0)}"
				/>
				<span class="${styles['visually-hidden']}">thou</span>
			</label>

			<label style="text-align: center;">
				<span title="Equal side gaps">${String.fromCharCode(0xFF1D)}</span>
				<br />
				<input
					type="checkbox"
					checked="${sideGapsEqual}"
					onClick="${(event: InputEvent) => event.target instanceof HTMLInputElement && setSideGapsEqual(event.target.checked)}"
				/>
			</label>

			<label>
				End gap<br />
				<input
					type="number"
					class="${styles['number-field']}"
					step="${10}"
					value="${sideGapValue[1]}"
					onInput="${(event: InputEvent) => handleSideGapInput(event, 1)}"
				/> thou
			</label>
		</section>

		<section>
			<label>
				Gap within course<br />
				<input
					type="number"
					class="${styles['number-field']}"
					step="${10}"
					value="${inCourseGapValue}"
					onInput="${(event: InputEvent) => event.target instanceof HTMLInputElement && setInCourseGap(event.target.value)}"
				/> thou
				${courses.some(course => course.length > 1) || html`
					${' '}<small>(Unused)</small>
				`}
			</label>
		</section>

		<section>
			<label>
				Gauge presets<br />
				<select
					value="${configValue.split('\n').map(s => s.trim()).join(';')}"
					onInput="${handlePreset}"
				>
					<optgroup label="Guitar">
						<option value="10;13;17;26;36;46">Regular Slinky</option>
						<option value="8, 8;10, 10;8, 14;11, 24;17, 32;22, 40">12-String Slinky</option>
					</optgroup>

					<optgroup label="Bass">
						<option value="50;70;85;105">Bass Slinky</option>
						<option value="49;62;84;108">GFS Brite Flats (bass)</option>
					</optgroup>

					<optgroup label="Mandolin">
						<option value="11, 11;15, 15;26, 26;40, 40">D'Addario EJ74</option>
						<option value="12, 12;16, 16;24, 24;36, 36">D'Addario EJ63i (doubled)</option>
					</optgroup>

					<option value="${configValue.split('\n').map(s => s.trim()).join(';')}">--</option>
				</select>
			</label>
		</section>

		<section>
			<label>
				String gauges<br />
				<small>(One comma-separated course per line)</small><br />
				<textarea
					rows=${Math.max(configValue.split('\n').length, MIN_LINES)}
					value=${configValue}
					onInput=${(event: InputEvent) => event.target instanceof HTMLTextAreaElement && setConfig(event.target.value)}
				/>
			</label>
		</section>

		<section>
			<svg
				viewBox="${HAIRLINE / -2} ${HAIRLINE / -2} ${width + HAIRLINE} ${HEIGHT + HAIRLINE}"
				style="${{ height: `${HEIGHT}in` }}"
			>
				<rect
					x="${0}"
					y="${0}"
					width="${width}"
					height="${HEIGHT}"
					fill="none"
					stroke="black"
					stroke-width="${HAIRLINE}"
				/>

				${chunkedLengths.map(([gap, string]) => {
					const x = accumulatedGaps + gap;
					const center = x + string / 2;

					accumulatedGaps += gap + string;

					if (!string) return;

					return html`
						<${Fragment} key="${accumulatedGaps} ${string}">
							<rect
								x="${x}"
								y="${0}"
								width="${string}"
								height="${HEIGHT}"
								fill="lime"
								fill-opacity="${0.5}"
							/>

							<line
								x1="${center}"
								y1="${0}"
								x2="${center}"
								y2="${HEIGHT}"
								stroke="black"
								stroke-width="${0.005}"
							/>
						</${Fragment}>
					`;
				})}
			</svg>

			<br />

			<button type="button" onClick="${print}">Print</button>${' '}
			<small>Ensure you print at 100%!</small>
		</section>

		<section>
			<small>
				Source: ${' '}
				<a href="https://www.github.com/brian-c/string-spacing-calculator">
					github.com/brian-c/string-spacing-calculator
				</a>
			</small>
		</section>
	</${Fragment}>`;
}
