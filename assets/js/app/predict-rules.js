export const PREDICT_MAX_SCORE=40;
export function scoreWinner({winnerCorrect,isLargestDifference}){return winnerCorrect?(isLargestDifference?10:5):0;}
export function marketPredictState(market){return market?.isOpen===true?'open':market?.isOpen===false?'closed':'unavailable';}
export function largestDifferenceIndexes(matches){const differences=matches.map(match=>Math.abs(Number(match.homeScore)-Number(match.awayScore))),largest=Math.max(...differences);return differences.map((difference,index)=>difference===largest?index:null).filter(index=>index!==null);}
export function scoreMatchPrediction({winnerCorrect,selectedLargestIndex,matchIndex,finalMatches}){return scoreWinner({winnerCorrect,isLargestDifference:largestDifferenceIndexes(finalMatches).includes(matchIndex)&&selectedLargestIndex===matchIndex});}
