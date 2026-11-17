/**
 * Datums als 'YYYY-MM-DD' (kalenderdagen, geen tijdzone) en "vandaag" in Brusselse tijd.
 * Eén plek in plaats van vier kopieën van addDays en drie varianten van "vandaag".
 */
import { isoDay } from './format'

/** `n` dagen na (of voor, bij negatief) een kalenderdag. */
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

/** Vandaag in Brussel. Op Vercel is de server UTC: tussen middernacht en 1 à 2 uur is het daar nog gisteren. */
export const todayBrussels = (now = new Date()) => isoDay(now)
