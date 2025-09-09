import { sneakerz1_5000 } from "./sneakerz-1-5000";
import { sneakerz10001_15000 } from "./sneakerz-10001-15000";
import { sneakerz15001_20000 } from "./sneakerz-15001-20000";
import { sneakerz20001_20732 } from "./sneakerz-20001-20732";
import { sneakerz5001_10000 } from "./sneakerz-5001-10000";

export type SneakerzImportData = {
  id: number;
  accessory?: string | null;
  background: string;
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  design: string;
  dripFactor: number;
  enhancement: string | null;
  jump: number;
  rarity: string;
  style: string;
  title: string;
};

export const sneakerzData: SneakerzImportData[] = [
  ...sneakerz1_5000,
  ...sneakerz5001_10000,
  ...sneakerz10001_15000,
  ...sneakerz15001_20000,
  ...sneakerz20001_20732,
];
