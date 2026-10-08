export const CLASSIC = 'classic';
export const ENDLESS = 'endless';
export const MODE_IDS = [CLASSIC, ENDLESS];
export const modeId = value => MODE_IDS.includes(value) ? value : CLASSIC;
export const modeName = value => modeId(value) === ENDLESS ? '无尽模式' : '经典模式';
