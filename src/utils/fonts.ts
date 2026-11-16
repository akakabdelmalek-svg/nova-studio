import { CustomFontRecord } from '../types/studio';
import { uid } from './defaults';

export type FontCategory =
  | 'All'
  | 'Custom'
  | 'Studio'
  | 'MS Word Sans'
  | 'MS Word Serif'
  | 'Display & Script'
  | 'MS Word Mono';

export interface FontOption {
  family: string;
  label: string;
  category: Exclude<FontCategory, 'All'>;
  fallbackStack: string;
  isCustom?: boolean;
  customId?: string;
}

const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const HUMANIST = '"Plus Jakarta Sans", "Segoe UI", "Trebuchet MS", Arial, sans-serif';
const GEOMETRIC = '"Outfit", "Century Gothic", Futura, Arial, sans-serif';
const CONDENSED = '"Arial Narrow", "Roboto Condensed", Impact, Arial, sans-serif';
const HEAVY_DISPLAY = 'Impact, "Arial Black", "Outfit", sans-serif';
const SERIF = 'Georgia, "Times New Roman", Times, serif';
const BOOK_SERIF = '"Palatino Linotype", "Book Antiqua", Georgia, serif';
const MODERN_SERIF = '"Didot", "Bodoni MT", Georgia, serif';
const SLAB_SERIF = '"Rockwell", "Roboto Slab", Georgia, serif';
const SCRIPT = '"Brush Script MT", "Segoe Script", "Apple Chancery", cursive';
const HANDWRITING = '"Comic Sans MS", "Bradley Hand", "Chalkboard SE", cursive';
const MONO = '"JetBrains Mono", "Consolas", "Courier New", ui-monospace, monospace';
const GOTHIC = '"UnifrakturMaguntia", "Old English Text MT", Georgia, serif';

export const STUDIO_FONTS: FontOption[] = [
  { family: 'Outfit', label: 'Outfit (Studio Display)', category: 'Studio', fallbackStack: 'sans-serif' },
  { family: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', category: 'Studio', fallbackStack: 'sans-serif' },
  { family: 'JetBrains Mono', label: 'JetBrains Mono', category: 'Studio', fallbackStack: 'monospace' },
];

export const MS_WORD_FONTS: FontOption[] = [
  // MS Word Modern Cloud & Core Sans
  { family: 'Aptos', label: 'Aptos (Default Word)', category: 'MS Word Sans', fallbackStack: HUMANIST },
  { family: 'Aptos Display', label: 'Aptos Display', category: 'MS Word Sans', fallbackStack: GEOMETRIC },
  { family: 'Aptos Narrow', label: 'Aptos Narrow', category: 'MS Word Sans', fallbackStack: CONDENSED },
  { family: 'Calibri', label: 'Calibri', category: 'MS Word Sans', fallbackStack: HUMANIST },
  { family: 'Calibri Light', label: 'Calibri Light', category: 'MS Word Sans', fallbackStack: HUMANIST },
  { family: 'Arial', label: 'Arial', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Arial Black', label: 'Arial Black', category: 'MS Word Sans', fallbackStack: HEAVY_DISPLAY },
  { family: 'Arial Narrow', label: 'Arial Narrow', category: 'MS Word Sans', fallbackStack: CONDENSED },
  { family: 'Arial Rounded MT Bold', label: 'Arial Rounded MT Bold', category: 'MS Word Sans', fallbackStack: GEOMETRIC },
  { family: 'Bahnschrift', label: 'Bahnschrift', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Berlin Sans FB', label: 'Berlin Sans FB', category: 'MS Word Sans', fallbackStack: GEOMETRIC },
  { family: 'Berlin Sans FB Demi', label: 'Berlin Sans FB Demi', category: 'MS Word Sans', fallbackStack: GEOMETRIC },
  { family: 'Candara', label: 'Candara', category: 'MS Word Sans', fallbackStack: HUMANIST },
  { family: 'Candara Light', label: 'Candara Light', category: 'MS Word Sans', fallbackStack: HUMANIST },
  { family: 'Century Gothic', label: 'Century Gothic', category: 'MS Word Sans', fallbackStack: GEOMETRIC },
  { family: 'Corbel', label: 'Corbel', category: 'MS Word Sans', fallbackStack: HUMANIST },
  { family: 'Corbel Light', label: 'Corbel Light', category: 'MS Word Sans', fallbackStack: HUMANIST },
  { family: 'Dubai', label: 'Dubai', category: 'MS Word Sans', fallbackStack: HUMANIST },
  { family: 'Ebrima', label: 'Ebrima', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Eras Bold ITC', label: 'Eras Bold ITC', category: 'MS Word Sans', fallbackStack: GEOMETRIC },
  { family: 'Eras Demi ITC', label: 'Eras Demi ITC', category: 'MS Word Sans', fallbackStack: GEOMETRIC },
  { family: 'Eras Light ITC', label: 'Eras Light ITC', category: 'MS Word Sans', fallbackStack: GEOMETRIC },
  { family: 'Eras Medium ITC', label: 'Eras Medium ITC', category: 'MS Word Sans', fallbackStack: GEOMETRIC },
  { family: 'Franklin Gothic Book', label: 'Franklin Gothic Book', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Franklin Gothic Demi', label: 'Franklin Gothic Demi', category: 'MS Word Sans', fallbackStack: HEAVY_DISPLAY },
  { family: 'Franklin Gothic Heavy', label: 'Franklin Gothic Heavy', category: 'MS Word Sans', fallbackStack: HEAVY_DISPLAY },
  { family: 'Franklin Gothic Medium', label: 'Franklin Gothic Medium', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Gadugi', label: 'Gadugi', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Gill Sans MT', label: 'Gill Sans MT', category: 'MS Word Sans', fallbackStack: HUMANIST },
  { family: 'Gill Sans Ultra Bold', label: 'Gill Sans Ultra Bold', category: 'MS Word Sans', fallbackStack: HEAVY_DISPLAY },
  { family: 'Leelawadee UI', label: 'Leelawadee UI', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Lucida Sans', label: 'Lucida Sans', category: 'MS Word Sans', fallbackStack: HUMANIST },
  { family: 'Lucida Sans Unicode', label: 'Lucida Sans Unicode', category: 'MS Word Sans', fallbackStack: HUMANIST },
  { family: 'Maiandra GD', label: 'Maiandra GD', category: 'MS Word Sans', fallbackStack: HUMANIST },
  { family: 'Malgun Gothic', label: 'Malgun Gothic', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Microsoft JhengHei', label: 'Microsoft JhengHei', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Microsoft New Tai Lue', label: 'Microsoft New Tai Lue', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Microsoft PhagsPa', label: 'Microsoft PhagsPa', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Microsoft Sans Serif', label: 'Microsoft Sans Serif', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Microsoft Tai Le', label: 'Microsoft Tai Le', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Microsoft YaHei', label: 'Microsoft YaHei', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Microsoft Yi Baiti', label: 'Microsoft Yi Baiti', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Myanmar Text', label: 'Myanmar Text', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Nirmala UI', label: 'Nirmala UI', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Segoe UI', label: 'Segoe UI', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Segoe UI Black', label: 'Segoe UI Black', category: 'MS Word Sans', fallbackStack: HEAVY_DISPLAY },
  { family: 'Segoe UI Light', label: 'Segoe UI Light', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Segoe UI Semibold', label: 'Segoe UI Semibold', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Tahoma', label: 'Tahoma', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Trebuchet MS', label: 'Trebuchet MS', category: 'MS Word Sans', fallbackStack: HUMANIST },
  { family: 'Tw Cen MT', label: 'Tw Cen MT', category: 'MS Word Sans', fallbackStack: GEOMETRIC },
  { family: 'Verdana', label: 'Verdana', category: 'MS Word Sans', fallbackStack: SANS },
  { family: 'Yu Gothic', label: 'Yu Gothic', category: 'MS Word Sans', fallbackStack: SANS },

  // MS Word Serif & Book Fonts
  { family: 'Aptos Serif', label: 'Aptos Serif', category: 'MS Word Serif', fallbackStack: SERIF },
  { family: 'Times New Roman', label: 'Times New Roman', category: 'MS Word Serif', fallbackStack: SERIF },
  { family: 'Cambria', label: 'Cambria', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Cambria Math', label: 'Cambria Math', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Georgia', label: 'Georgia', category: 'MS Word Serif', fallbackStack: SERIF },
  { family: 'Garamond', label: 'Garamond', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Constantia', label: 'Constantia', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Baskerville Old Face', label: 'Baskerville Old Face', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Bell MT', label: 'Bell MT', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Bodoni MT', label: 'Bodoni MT', category: 'MS Word Serif', fallbackStack: MODERN_SERIF },
  { family: 'Bodoni MT Poster Compressed', label: 'Bodoni MT Poster Compressed', category: 'MS Word Serif', fallbackStack: MODERN_SERIF },
  { family: 'Book Antiqua', label: 'Book Antiqua', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Bookman Old Style', label: 'Bookman Old Style', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Californian FB', label: 'Californian FB', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Calisto MT', label: 'Calisto MT', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Centaur', label: 'Centaur', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Century', label: 'Century', category: 'MS Word Serif', fallbackStack: SERIF },
  { family: 'Century Schoolbook', label: 'Century Schoolbook', category: 'MS Word Serif', fallbackStack: SERIF },
  { family: 'Footlight MT Light', label: 'Footlight MT Light', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Gloucester MT Extra Condensed', label: 'Gloucester MT Extra Condensed', category: 'MS Word Serif', fallbackStack: SERIF },
  { family: 'Goudy Old Style', label: 'Goudy Old Style', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'High Tower Text', label: 'High Tower Text', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Imprint MT Shadow', label: 'Imprint MT Shadow', category: 'MS Word Serif', fallbackStack: SERIF },
  { family: 'Javanese Text', label: 'Javanese Text', category: 'MS Word Serif', fallbackStack: SERIF },
  { family: 'Lucida Bright', label: 'Lucida Bright', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Lucida Fax', label: 'Lucida Fax', category: 'MS Word Serif', fallbackStack: SLAB_SERIF },
  { family: 'Microsoft Himalaya', label: 'Microsoft Himalaya', category: 'MS Word Serif', fallbackStack: SERIF },
  { family: 'MingLiU-ExtB', label: 'MingLiU-ExtB', category: 'MS Word Serif', fallbackStack: SERIF },
  { family: 'Modern No. 20', label: 'Modern No. 20', category: 'MS Word Serif', fallbackStack: MODERN_SERIF },
  { family: 'Mongolian Baiti', label: 'Mongolian Baiti', category: 'MS Word Serif', fallbackStack: SERIF },
  { family: 'Palatino Linotype', label: 'Palatino Linotype', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Perpetua', label: 'Perpetua', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Perpetua Titling MT', label: 'Perpetua Titling MT', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Poor Richard', label: 'Poor Richard', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Rockwell', label: 'Rockwell', category: 'MS Word Serif', fallbackStack: SLAB_SERIF },
  { family: 'Rockwell Condensed', label: 'Rockwell Condensed', category: 'MS Word Serif', fallbackStack: SLAB_SERIF },
  { family: 'Rockwell Extra Bold', label: 'Rockwell Extra Bold', category: 'MS Word Serif', fallbackStack: SLAB_SERIF },
  { family: 'SimSun', label: 'SimSun', category: 'MS Word Serif', fallbackStack: SERIF },
  { family: 'Sitka Banner', label: 'Sitka Banner', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Sitka Display', label: 'Sitka Display', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Sitka Text', label: 'Sitka Text', category: 'MS Word Serif', fallbackStack: BOOK_SERIF },
  { family: 'Sylfaen', label: 'Sylfaen', category: 'MS Word Serif', fallbackStack: SERIF },

  // MS Word Display, Script & Decorative Fonts
  { family: 'Impact', label: 'Impact', category: 'Display & Script', fallbackStack: HEAVY_DISPLAY },
  { family: 'Comic Sans MS', label: 'Comic Sans MS', category: 'Display & Script', fallbackStack: HANDWRITING },
  { family: 'Bauhaus 93', label: 'Bauhaus 93', category: 'Display & Script', fallbackStack: GEOMETRIC },
  { family: 'Bernard MT Condensed', label: 'Bernard MT Condensed', category: 'Display & Script', fallbackStack: CONDENSED },
  { family: 'Blackadder ITC', label: 'Blackadder ITC', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Bradley Hand ITC', label: 'Bradley Hand ITC', category: 'Display & Script', fallbackStack: HANDWRITING },
  { family: 'Britannic Bold', label: 'Britannic Bold', category: 'Display & Script', fallbackStack: HEAVY_DISPLAY },
  { family: 'Broadway', label: 'Broadway', category: 'Display & Script', fallbackStack: HEAVY_DISPLAY },
  { family: 'Brush Script MT', label: 'Brush Script MT', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Castellar', label: 'Castellar', category: 'Display & Script', fallbackStack: MODERN_SERIF },
  { family: 'Chiller', label: 'Chiller', category: 'Display & Script', fallbackStack: HANDWRITING },
  { family: 'Colonna MT', label: 'Colonna MT', category: 'Display & Script', fallbackStack: MODERN_SERIF },
  { family: 'Cooper Black', label: 'Cooper Black', category: 'Display & Script', fallbackStack: HEAVY_DISPLAY },
  { family: 'Copperplate Gothic Bold', label: 'Copperplate Gothic Bold', category: 'Display & Script', fallbackStack: SERIF },
  { family: 'Copperplate Gothic Light', label: 'Copperplate Gothic Light', category: 'Display & Script', fallbackStack: SERIF },
  { family: 'Curlz MT', label: 'Curlz MT', category: 'Display & Script', fallbackStack: HANDWRITING },
  { family: 'Edwardian Script ITC', label: 'Edwardian Script ITC', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Elephant', label: 'Elephant', category: 'Display & Script', fallbackStack: MODERN_SERIF },
  { family: 'Engravers MT', label: 'Engravers MT', category: 'Display & Script', fallbackStack: SERIF },
  { family: 'Felix Titling', label: 'Felix Titling', category: 'Display & Script', fallbackStack: BOOK_SERIF },
  { family: 'Forte', label: 'Forte', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Freestyle Script', label: 'Freestyle Script', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'French Script MT', label: 'French Script MT', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Gabriola', label: 'Gabriola', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Gigi', label: 'Gigi', category: 'Display & Script', fallbackStack: HANDWRITING },
  { family: 'Goudy Stout', label: 'Goudy Stout', category: 'Display & Script', fallbackStack: HEAVY_DISPLAY },
  { family: 'Haettenschweiler', label: 'Haettenschweiler', category: 'Display & Script', fallbackStack: CONDENSED },
  { family: 'Harlow Solid Italic', label: 'Harlow Solid Italic', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Harrington', label: 'Harrington', category: 'Display & Script', fallbackStack: BOOK_SERIF },
  { family: 'Informal Roman', label: 'Informal Roman', category: 'Display & Script', fallbackStack: HANDWRITING },
  { family: 'Ink Free', label: 'Ink Free', category: 'Display & Script', fallbackStack: HANDWRITING },
  { family: 'Jokerman', label: 'Jokerman', category: 'Display & Script', fallbackStack: HANDWRITING },
  { family: 'Juice ITC', label: 'Juice ITC', category: 'Display & Script', fallbackStack: HANDWRITING },
  { family: 'Kristen ITC', label: 'Kristen ITC', category: 'Display & Script', fallbackStack: HANDWRITING },
  { family: 'Kunstler Script', label: 'Kunstler Script', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Lucida Calligraphy', label: 'Lucida Calligraphy', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Lucida Handwriting', label: 'Lucida Handwriting', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Magneto', label: 'Magneto', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Matura MT Script Capitals', label: 'Matura MT Script Capitals', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Mistral', label: 'Mistral', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Monotype Corsiva', label: 'Monotype Corsiva', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'MV Boli', label: 'MV Boli', category: 'Display & Script', fallbackStack: HANDWRITING },
  { family: 'Niagara Engraved', label: 'Niagara Engraved', category: 'Display & Script', fallbackStack: CONDENSED },
  { family: 'Niagara Solid', label: 'Niagara Solid', category: 'Display & Script', fallbackStack: CONDENSED },
  { family: 'Old English Text MT', label: 'Old English Text MT', category: 'Display & Script', fallbackStack: GOTHIC },
  { family: 'Onyx', label: 'Onyx', category: 'Display & Script', fallbackStack: CONDENSED },
  { family: 'Palace Script MT', label: 'Palace Script MT', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Papyrus', label: 'Papyrus', category: 'Display & Script', fallbackStack: HANDWRITING },
  { family: 'Parchment', label: 'Parchment', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Playbill', label: 'Playbill', category: 'Display & Script', fallbackStack: CONDENSED },
  { family: 'Pristina', label: 'Pristina', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Rage Italic', label: 'Rage Italic', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Ravie', label: 'Ravie', category: 'Display & Script', fallbackStack: HEAVY_DISPLAY },
  { family: 'Segoe Print', label: 'Segoe Print', category: 'Display & Script', fallbackStack: HANDWRITING },
  { family: 'Segoe Script', label: 'Segoe Script', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Showcard Gothic', label: 'Showcard Gothic', category: 'Display & Script', fallbackStack: HEAVY_DISPLAY },
  { family: 'Snap ITC', label: 'Snap ITC', category: 'Display & Script', fallbackStack: HEAVY_DISPLAY },
  { family: 'Stencil', label: 'Stencil', category: 'Display & Script', fallbackStack: HEAVY_DISPLAY },
  { family: 'Tempus Sans ITC', label: 'Tempus Sans ITC', category: 'Display & Script', fallbackStack: HANDWRITING },
  { family: 'Viner Hand ITC', label: 'Viner Hand ITC', category: 'Display & Script', fallbackStack: HANDWRITING },
  { family: 'Vivaldi', label: 'Vivaldi', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Vladimir Script', label: 'Vladimir Script', category: 'Display & Script', fallbackStack: SCRIPT },
  { family: 'Wide Latin', label: 'Wide Latin', category: 'Display & Script', fallbackStack: HEAVY_DISPLAY },
  { family: 'Webdings', label: 'Webdings', category: 'Display & Script', fallbackStack: SANS },
  { family: 'Wingdings', label: 'Wingdings', category: 'Display & Script', fallbackStack: SANS },
  { family: 'Symbol', label: 'Symbol', category: 'Display & Script', fallbackStack: SERIF },
  { family: 'Marlett', label: 'Marlett', category: 'Display & Script', fallbackStack: SANS },

  // MS Word Monospace Fonts
  { family: 'Aptos Mono', label: 'Aptos Mono', category: 'MS Word Mono', fallbackStack: MONO },
  { family: 'Consolas', label: 'Consolas', category: 'MS Word Mono', fallbackStack: MONO },
  { family: 'Courier New', label: 'Courier New', category: 'MS Word Mono', fallbackStack: MONO },
  { family: 'Cascadia Code', label: 'Cascadia Code', category: 'MS Word Mono', fallbackStack: MONO },
  { family: 'Cascadia Mono', label: 'Cascadia Mono', category: 'MS Word Mono', fallbackStack: MONO },
  { family: 'Lucida Console', label: 'Lucida Console', category: 'MS Word Mono', fallbackStack: MONO },
  { family: 'Lucida Sans Typewriter', label: 'Lucida Sans Typewriter', category: 'MS Word Mono', fallbackStack: MONO },
  { family: 'OCR A Extended', label: 'OCR A Extended', category: 'MS Word Mono', fallbackStack: MONO },
];

export const ALL_BUILTIN_FONTS: FontOption[] = [...STUDIO_FONTS, ...MS_WORD_FONTS];

const BUILTIN_MAP = new Map<string, FontOption>(
  ALL_BUILTIN_FONTS.map((f) => [f.family.toLowerCase(), f])
);

const loadedCustomFontIds = new Set<string>();

export async function loadCustomFontFace(record: CustomFontRecord): Promise<boolean> {
  if (typeof window === 'undefined' || typeof FontFace === 'undefined') return false;
  if (loadedCustomFontIds.has(record.id)) return true;
  try {
    const face = new FontFace(record.family, record.data.slice(0));
    const loaded = await face.load();
    document.fonts.add(loaded);
    loadedCustomFontIds.add(record.id);
    return true;
  } catch {
    return false;
  }
}

export async function readFontFileToRecord(
  file: File,
  existingFamilies: string[]
): Promise<CustomFontRecord> {
  const extMatch = /\.([a-z0-9]+)$/i.exec(file.name);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'ttf';
  const baseRaw = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const baseName = baseRaw || 'Custom Font';

  const existingSet = new Set(existingFamilies.map((f) => f.toLowerCase()));
  let family = baseName;
  let counter = 2;
  while (existingSet.has(family.toLowerCase())) {
    family = `${baseName} ${counter}`;
    counter += 1;
  }

  const data = await file.arrayBuffer();
  const record: CustomFontRecord = {
    id: uid('font'),
    family,
    fileName: file.name,
    format: ext,
    data,
    createdAt: Date.now(),
  };

  const ok = await loadCustomFontFace(record);
  if (!ok) {
    throw new Error(`Could not load "${file.name}". Supported formats: .ttf, .otf, .woff, .woff2.`);
  }
  return record;
}

export function buildCanvasFontCss(fontFamily: string): string {
  const clean = (fontFamily || 'Outfit').replace(/"/g, '');
  const found = BUILTIN_MAP.get(clean.toLowerCase());
  if (found) {
    return `"${clean}", ${found.fallbackStack}`;
  }
  return `"${clean}", sans-serif`;
}
