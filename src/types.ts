export type ESEAItem = {
  id: number;
  home: {
    id: number;
    name: string;
    tag: string;
  };
  away: {
    id: number;
    name: string;
    tag: string;
  };
  map: {
    id: string;
    translate: boolean;
  };
  result?: number;
  score?: string;
  date: string;
  stem_matchid: number;
};

export type ESEAData = {
  message: any;
  errors: any[];
  sockets: any[];
  pagination: any;
  data: ESEAItem[];
};
