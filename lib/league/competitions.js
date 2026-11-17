export const COMPETITION_TYPES = Object.freeze({
  'pl-ios': 'cartola_points_league', pc1: 'head_to_head_league', pc2: 'head_to_head_league',
  'copa-ios': 'knockout', iwc: 'ranking_points', icwc: 'head_to_head_league'
});

export const OFFICIAL_TITLE_TYPES = Object.freeze(['pl-ios', 'pc1', 'pc2', 'copa-ios', 'iwc', 'icwc']);
export const HONOR_TYPES = Object.freeze(['cartoleiro-de-ouro']);
export const isOfficialTitleType = type => OFFICIAL_TITLE_TYPES.includes(type);
