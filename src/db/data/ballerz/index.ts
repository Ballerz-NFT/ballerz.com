import { BallerzTeam } from "../../queries";
import { ballerz1_1000 } from "./ballerz-1-1000";
import { ballerz1001_2000 } from "./ballerz-1001-2000";
import { ballerz2001_3000 } from "./ballerz-2001-3000";
import { ballerz3001_4000 } from "./ballerz-3001-4000";
import { ballerz4001_5000 } from "./ballerz-4001-5000";
import { ballerz5001_6000 } from "./ballerz-5001-6000";
import { ballerz6001_7000 } from "./ballerz-6001-7000";
import { ballerz7001_8000 } from "./ballerz-7001-8000";
import { ballerz8001_9000 } from "./ballerz-8001-9000";
import { ballerz9001_9872 } from "./ballerz-9001-9872";

export type BallerzImportData = {
  id: number;
  team: BallerzTeam;
  accessories: string[];
  number: string;
  dunks: number;
  shooting: number;
  playmaking: number;
  defense: number;
  overall: number;
  nftContract: string;
  nftID: string;
  nftSlug: string;
  hair: string;
  role: "Player" | "Captain" | "All-Star";
  jersey: "Home" | "Away";
  body: string;
  face?: string;
  gender?: "M" | "W";
  hairColor?:
    | "Orange"
    | "Blue"
    | "Light Brown"
    | "Red"
    | "Blonde"
    | "Purple"
    | "Pink"
    | "Black"
    | "Other"
    | "Brown"
    | "Brunette"
    | "Light Brunette"
    | "Custom";
  hairStyle?: string;
  skillRank: number;
  traitRank: number;
  comboRank: number;
  mvp: boolean;
};

export const ballerzData: BallerzImportData[] = [
  ...ballerz1_1000,
  ...ballerz1001_2000,
  ...ballerz2001_3000,
  ...ballerz3001_4000,
  ...ballerz4001_5000,
  ...ballerz5001_6000,
  ...ballerz6001_7000,
  ...ballerz7001_8000,
  ...ballerz8001_9000,
  ...ballerz9001_9872,
];
